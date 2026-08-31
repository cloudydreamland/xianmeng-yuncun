from __future__ import annotations

import argparse
import random
from dataclasses import asdict, dataclass
from pathlib import Path

import torch
from torch import nn
from torch.nn import functional as F


CORPUS = """云从山间起，月在水中明。学习不是记住答案，而是看见问题之间的联系。
张量记录形状，梯度记录变化，注意力让每个位置寻找需要的信息。
代码要能运行，实验要可复现，结论要经得起追问。""" * 80


@dataclass
class Config:
    dim: int = 64
    heads: int = 4
    layers: int = 2
    block_size: int = 48
    dropout: float = 0.0


class Attention(nn.Module):
    def __init__(self, config: Config) -> None:
        super().__init__()
        self.heads = config.heads
        self.head_dim = config.dim // config.heads
        self.qkv = nn.Linear(config.dim, 3 * config.dim, bias=False)
        self.output = nn.Linear(config.dim, config.dim, bias=False)
        self.dropout = config.dropout

    def forward(self, hidden: torch.Tensor) -> torch.Tensor:
        batch, sequence, dim = hidden.shape
        query, key, value = self.qkv(hidden).chunk(3, -1)
        split = lambda tensor: tensor.view(batch, sequence, self.heads, self.head_dim).transpose(1, 2)
        query, key, value = map(split, (query, key, value))
        hidden = F.scaled_dot_product_attention(query, key, value, is_causal=True, dropout_p=self.dropout if self.training else 0.0)
        return self.output(hidden.transpose(1, 2).contiguous().view(batch, sequence, dim))


class Block(nn.Module):
    def __init__(self, config: Config) -> None:
        super().__init__()
        self.norm1, self.norm2 = nn.LayerNorm(config.dim), nn.LayerNorm(config.dim)
        self.attention = Attention(config)
        self.mlp = nn.Sequential(nn.Linear(config.dim, 4 * config.dim), nn.GELU(), nn.Linear(4 * config.dim, config.dim))

    def forward(self, hidden: torch.Tensor) -> torch.Tensor:
        hidden = hidden + self.attention(self.norm1(hidden))
        return hidden + self.mlp(self.norm2(hidden))


class TinyLanguageModel(nn.Module):
    def __init__(self, vocab_size: int, config: Config) -> None:
        super().__init__()
        self.config = config
        self.token = nn.Embedding(vocab_size, config.dim)
        self.position = nn.Embedding(config.block_size, config.dim)
        self.blocks = nn.ModuleList([Block(config) for _ in range(config.layers)])
        self.norm = nn.LayerNorm(config.dim)
        self.head = nn.Linear(config.dim, vocab_size, bias=False)
        self.head.weight = self.token.weight

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        positions = torch.arange(token_ids.size(1), device=token_ids.device)
        hidden = self.token(token_ids) + self.position(positions)
        for block in self.blocks:
            hidden = block(hidden)
        return self.head(self.norm(hidden))


def make_batch(data: torch.Tensor, batch_size: int, block_size: int, device: torch.device) -> tuple[torch.Tensor, torch.Tensor]:
    starts = torch.randint(0, len(data) - block_size - 1, (batch_size,))
    inputs = torch.stack([data[start : start + block_size] for start in starts])
    targets = torch.stack([data[start + 1 : start + block_size + 1] for start in starts])
    return inputs.to(device), targets.to(device)


@torch.inference_mode()
def generate(model: TinyLanguageModel, prompt: torch.Tensor, steps: int) -> torch.Tensor:
    model.eval()
    for _ in range(steps):
        context = prompt[:, -model.config.block_size :]
        logits = model(context)[:, -1]
        next_id = torch.multinomial((logits / 0.8).softmax(-1), 1)
        prompt = torch.cat((prompt, next_id), dim=1)
    return prompt


def main(args: argparse.Namespace) -> None:
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if args.device == "auto" and torch.cuda.is_available() else args.device if args.device != "auto" else "cpu")
    chars = sorted(set(CORPUS))
    stoi = {char: index for index, char in enumerate(chars)}
    data = torch.tensor([stoi[char] for char in CORPUS], dtype=torch.long)
    config = Config()
    model = TinyLanguageModel(len(chars), config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3)

    for step in range(1, args.steps + 1):
        inputs, targets = make_batch(data, args.batch_size, config.block_size, device)
        optimizer.zero_grad(set_to_none=True)
        logits = model(inputs)
        loss = F.cross_entropy(logits.reshape(-1, len(chars)), targets.reshape(-1))
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step == 1 or step % max(1, args.steps // 5) == 0:
            print(f"step={step:04d} loss={loss.item():.4f}")

    prompt_text = "云"
    prompt = torch.tensor([[stoi[prompt_text]]], device=device)
    generated = generate(model, prompt, args.generate)
    decoded = "".join(chars[index] for index in generated[0].tolist())
    print("generated:", decoded)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "config": asdict(config), "chars": chars}, output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=300)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--generate", type=int, default=40)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--output", default="artifacts/mini-lm.pt")
    return parser.parse_args()


if __name__ == "__main__":
    main(parse_args())
