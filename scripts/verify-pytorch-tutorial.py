from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "src" / "content" / "pytorch-tutorial"


def utf8_environment() -> dict[str, str]:
    environment = os.environ.copy()
    environment["PYTHONUTF8"] = "1"
    environment["PYTHONIOENCODING"] = "utf-8"
    return environment


def run_python(code: str, cwd: Path | None = None, timeout: int = 30) -> dict[str, object]:
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=cwd or ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        env=utf8_environment(),
    )
    return {
        "passed": result.returncode == 0,
        "returnCode": result.returncode,
        "stdout": result.stdout.strip()[-800:],
        "stderr": result.stderr.strip()[-800:],
    }


def extract_lessons() -> list[dict[str, object]]:
    lessons: list[dict[str, object]] = []
    for path in sorted(CONTENT.glob("*.mdx")):
        source = path.read_text(encoding="utf-8")
        slug = re.search(r"\nslug: ([^\n]+)", source).group(1)
        for section in re.split(r"\n(?=## )", source)[1:]:
            title = re.search(r"^## (.+)$", section, re.MULTILINE).group(1).strip()
            kind_match = re.search(r'data-code-kind="([^"]+)"', section)
            code_match = re.search(r"```python\n([\s\S]*?)\n```", section)
            if not kind_match or not code_match:
                raise AssertionError(f"{path.name} / {title}: missing code metadata or Python fence")
            code = code_match.group(1)
            compile(code, f"{path.name}:{title}", "exec")
            record: dict[str, object] = {
                "chapter": slug,
                "title": title,
                "kind": kind_match.group(1),
                "syntax": "passed",
            }
            if kind_match.group(1) == "可独立运行":
                result = run_python(code)
                record["runtime"] = "cpu-verified" if result["passed"] else "failed"
                record["output"] = result["stdout"]
                if not result["passed"]:
                    record["error"] = result["stderr"]
            else:
                record["runtime"] = "hardware-or-context-required"
            lessons.append(record)
    return lessons


def run_project(relative: str, arguments: list[str], cwd: str | None = None) -> dict[str, object]:
    artifacts = ROOT / ".tmp" / "pytorch-verification-artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    output_name = relative.replace("/", "-").replace(".py", ".pt")
    command = [sys.executable, str(ROOT / relative), *arguments, "--output", str(artifacts / output_name)] if "--output" not in arguments and relative.endswith("train.py") else [sys.executable, str(ROOT / relative), *arguments]
    result = subprocess.run(
        command,
        cwd=ROOT / cwd if cwd else ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=90,
        env=utf8_environment(),
    )
    return {
        "passed": result.returncode == 0,
        "returnCode": result.returncode,
        "output": result.stdout.strip()[-1200:],
        "error": result.stderr.strip()[-800:],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="public/downloads/pytorch-course/verification-report.json")
    args = parser.parse_args()

    import torch

    lessons = extract_lessons()
    projects = {
        "classifier": run_project("examples/pytorch-course/classifier/train.py", ["--epochs", "5", "--samples", "512"]),
        "decoderBlock": run_project("examples/pytorch-course/decoder-block/test_model.py", [], "examples/pytorch-course/decoder-block"),
        "miniLm": run_project("examples/pytorch-course/mini-lm/train.py", ["--steps", "5", "--batch-size", "4", "--generate", "5"]),
    }
    failures = [lesson for lesson in lessons if lesson["runtime"] == "failed"]
    project_failures = [name for name, result in projects.items() if not result["passed"]]
    report = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "environment": {
            "python": sys.version.split()[0],
            "torch": torch.__version__,
            "cudaAvailable": torch.cuda.is_available(),
            "cudaRuntime": torch.version.cuda,
        },
        "summary": {
            "lessons": len(lessons),
            "syntaxChecked": len(lessons),
            "cpuExecuted": sum(lesson["runtime"] == "cpu-verified" for lesson in lessons),
            "hardwareOrContextRequired": sum(lesson["runtime"] == "hardware-or-context-required" for lesson in lessons),
            "failed": len(failures),
            "projectsPassed": sum(result["passed"] for result in projects.values()),
        },
        "lessons": lessons,
        "projects": projects,
    }
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    if failures or project_failures:
        for failure in failures:
            print(f"FAILED lesson: {failure['chapter']} / {failure['title']}: {failure.get('error', '')}", file=sys.stderr)
        for name in project_failures:
            print(f"FAILED project: {name}: {projects[name]['error']}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
