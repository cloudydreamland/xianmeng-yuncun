from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as F


class CausalSelfAttention(nn.Module):
    def __init__(self, dim: int, heads: int, dropout: float = 0.0) -> None:
        super().__init__()
        if dim % heads:
            raise ValueError("dim must be divisible by heads")
        self.heads = heads
        self.head_dim = dim // heads
        self.qkv = nn.Linear(dim, 3 * dim, bias=False)
        self.out = nn.Linear(dim, dim, bias=False)
        self.dropout = dropout

    def forward(self, hidden: torch.Tensor) -> torch.Tensor:
        batch, sequence, dim = hidden.shape
        query, key, value = self.qkv(hidden).chunk(3, dim=-1)
        split = lambda tensor: tensor.view(batch, sequence, self.heads, self.head_dim).transpose(1, 2)
        query, key, value = map(split, (query, key, value))
        attended = F.scaled_dot_product_attention(
            query,
            key,
            value,
            dropout_p=self.dropout if self.training else 0.0,
            is_causal=True,
        )
        merged = attended.transpose(1, 2).contiguous().view(batch, sequence, dim)
        return self.out(merged)


class DecoderBlock(nn.Module):
    def __init__(self, dim: int = 64, heads: int = 4, dropout: float = 0.0) -> None:
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.norm2 = nn.LayerNorm(dim)
        self.attention = CausalSelfAttention(dim, heads, dropout)
        self.mlp = nn.Sequential(nn.Linear(dim, 4 * dim), nn.GELU(), nn.Linear(4 * dim, dim))

    def forward(self, hidden: torch.Tensor) -> torch.Tensor:
        hidden = hidden + self.attention(self.norm1(hidden))
        return hidden + self.mlp(self.norm2(hidden))
