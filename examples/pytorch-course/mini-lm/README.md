# 项目三：迷你中文语言模型

这个项目使用内置中文短文建立字符词表，训练一个两层 Decoder-only 模型，然后从提示词继续生成。它的目标是验证完整数据流，不追求生成质量。

```bash
python train.py --steps 300 --device auto
```

CPU 烟雾测试使用 `--steps 5 --batch-size 4`；较好的演示效果建议使用 CUDA 并增加训练步数。输出 checkpoint 包含模型配置、词表和权重。
