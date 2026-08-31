from __future__ import annotations

import argparse
import random
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset, random_split


def seed_everything(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)


def make_dataset(samples: int, seed: int) -> TensorDataset:
    generator = torch.Generator().manual_seed(seed)
    features = torch.randn(samples, 2, generator=generator)
    labels = (features[:, 0] * features[:, 1] > 0).long()
    return TensorDataset(features, labels)


class Classifier(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.net = nn.Sequential(nn.Linear(2, 32), nn.GELU(), nn.Linear(32, 2))

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.net(features)


@torch.inference_mode()
def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[float, float]:
    model.eval()
    loss_sum = correct = examples = 0
    for features, labels in loader:
        features, labels = features.to(device), labels.to(device)
        logits = model(features)
        loss_sum += nn.functional.cross_entropy(logits, labels, reduction="sum").item()
        correct += (logits.argmax(-1) == labels).sum().item()
        examples += labels.numel()
    return loss_sum / examples, correct / examples


def train(args: argparse.Namespace) -> dict[str, float]:
    seed_everything(args.seed)
    device = torch.device("cuda" if args.device == "auto" and torch.cuda.is_available() else args.device if args.device != "auto" else "cpu")
    dataset = make_dataset(args.samples, args.seed)
    train_set, validation_set = random_split(dataset, [0.8, 0.2], generator=torch.Generator().manual_seed(args.seed))
    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True)
    validation_loader = DataLoader(validation_set, batch_size=args.batch_size)
    model = Classifier().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)

    for epoch in range(1, args.epochs + 1):
        model.train()
        for features, labels in train_loader:
            features, labels = features.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = nn.functional.cross_entropy(model(features), labels)
            loss.backward()
            optimizer.step()
        validation_loss, validation_accuracy = evaluate(model, validation_loader, device)
        print(f"epoch={epoch:02d} val_loss={validation_loss:.4f} val_acc={validation_accuracy:.3f}")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "seed": args.seed, "validation_accuracy": validation_accuracy}, output)
    return {"validation_loss": validation_loss, "validation_accuracy": validation_accuracy}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--samples", type=int, default=2048)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--learning-rate", type=float, default=3e-3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--output", default="artifacts/classifier.pt")
    return parser.parse_args()


if __name__ == "__main__":
    train(parse_args())
