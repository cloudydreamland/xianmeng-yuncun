# PyTorch 从零到大模型工程 · 贯穿项目

这三个项目都使用程序生成或内置的小数据，下载后无需额外数据集即可在 CPU 上完成烟雾测试。

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS / Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python classifier/train.py --epochs 5
python decoder-block/test_model.py
python mini-lm/train.py --steps 100
```

GPU 可用时增加 `--device cuda`。PyTorch 与 CUDA 的安装命令应以 <https://pytorch.org/get-started/locally/> 按机器生成的结果为准。

- `classifier`：完整的分类训练、验证、指标与 checkpoint 闭环。
- `decoder-block`：可运行的因果自注意力与 Decoder Block，并检查未来信息泄漏。
- `mini-lm`：字符级中文语言模型，从数据切片、训练到自回归生成。
