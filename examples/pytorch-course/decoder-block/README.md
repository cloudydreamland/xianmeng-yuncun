# 项目二：可运行 Decoder Block

实现包括 QKV 投影、多头拆分、PyTorch SDPA 因果注意力、Pre-Norm、残差和 MLP。

```bash
python test_model.py
```

测试会检查输出形状、反向梯度、参数量，以及改变未来 token 不应影响过去位置输出。CUDA 可用时设置 `PYTORCH_DEVICE=cuda`。
