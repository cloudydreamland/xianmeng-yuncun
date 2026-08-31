# 项目一：完整分类训练器

目标是用一份最小但完整的工程理解训练闭环。数据由固定随机种子生成，任务是判断二维点位于哪一类，因此不需要联网下载数据。

```bash
python train.py --epochs 20 --device auto
```

预期：验证准确率通常在 95% 以上，并在 `artifacts/classifier.pt` 保存只包含普通数据结构的 checkpoint。CPU 烟雾测试可使用 `--epochs 2 --samples 256`。
