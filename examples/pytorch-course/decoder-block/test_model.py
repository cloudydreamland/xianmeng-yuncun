from __future__ import annotations

import os

import torch

from model import DecoderBlock


def main() -> None:
    torch.manual_seed(42)
    requested = os.environ.get("PYTORCH_DEVICE", "cpu")
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("PYTORCH_DEVICE=cuda, but CUDA is unavailable")
    device = torch.device(requested)
    model = DecoderBlock(dim=64, heads=4).to(device).eval()
    hidden = torch.randn(2, 12, 64, device=device, requires_grad=True)
    output = model(hidden)
    assert output.shape == hidden.shape
    output.square().mean().backward()
    assert hidden.grad is not None and torch.isfinite(hidden.grad).all()

    changed = hidden.detach().clone()
    changed[:, 8:] = torch.randn_like(changed[:, 8:]) * 100
    with torch.inference_mode():
        before = model(hidden.detach())[:, :8]
        after = model(changed)[:, :8]
    torch.testing.assert_close(before, after, atol=1e-5, rtol=1e-5)
    parameters = sum(parameter.numel() for parameter in model.parameters())
    print(f"shape={tuple(output.shape)} parameters={parameters} causal_check=passed device={device}")


if __name__ == "__main__":
    main()
