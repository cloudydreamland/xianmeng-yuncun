export interface CourseQuizItem {
  question: string;
  answer: string;
}

export interface CourseExtra {
  estimatedMinutes: number;
  prerequisites: string[];
  outcomes: string[];
  quiz: CourseQuizItem[];
  interviewLink?: { href: string; label: string };
  project?: { href: string; label: string; detail: string };
}

export const pytorchCourseExtras: Record<string, CourseExtra> = {
  'python-and-installation': {
    estimatedMinutes: 70,
    prerequisites: ['无需编程基础'],
    outcomes: ['能读懂后续 Python 示例', '能选择正确 PyTorch 安装方式', '能报告 CUDA 环境'],
    quiz: [
      { question: '类型提示会自动把字符串转换成浮点数吗？', answer: '不会。类型提示主要服务阅读和静态检查，运行时仍需显式转换。' },
      { question: 'nvidia-smi 正常是否等于当前 Python 能用 CUDA？', answer: '不等于，还要确认当前环境装的是 CUDA wheel，且 torch.cuda.is_available() 为 True。' },
    ],
  },
  'first-tensor': {
    estimatedMinutes: 90,
    prerequisites: ['Python 最小语法', '已安装 PyTorch'],
    outcomes: ['解释 shape/dtype/device', '估算 Tensor 内存', '写设备无关代码'],
    quiz: [
      { question: 'float16 与 bfloat16 的显存大小是否不同？', answer: '通常相同，都是每元素 2 字节；差别主要在指数范围和有效精度。' },
      { question: '调用 x.to(device) 会原地修改 x 吗？', answer: '通常不会，应接收返回值，例如 x = x.to(device)。' },
    ],
  },
  'tensor-shapes': {
    estimatedMinutes: 120,
    prerequisites: ['Tensor 的 shape/dtype/device'],
    outcomes: ['独立推导广播形状', '正确拆合注意力轴', '避免不必要复制'],
    quiz: [
      { question: '为什么因果 mask 不必复制到每个 head？', answer: '形状 [T,T] 可以广播到 [B,H,T,T]，无需 repeat 真实复制。' },
      { question: 'transpose 后为什么 view 可能报错？', answer: 'transpose 改变 stride，结果常不连续；需 contiguous 后 view，或使用 reshape。' },
    ],
    interviewLink: { href: '/interview/llm/transformer-and-attention/', label: '去面经练注意力形状题' },
  },
  autograd: {
    estimatedMinutes: 100,
    prerequisites: ['基础微积分直觉', 'Tensor 运算'],
    outcomes: ['解释动态计算图', '定位梯度是否流动', '安全停止梯度'],
    quiz: [
      { question: '为什么连续 backward 后 grad 会变大？', answer: 'PyTorch 默认累积梯度，新梯度会加到现有 .grad。' },
      { question: '非叶子 Tensor 的 grad 为 None 是否代表无梯度？', answer: '不一定。非叶子默认不保留 .grad，可用 retain_grad 调试。' },
    ],
    interviewLink: { href: '/interview/llm/deep-learning-foundations/', label: '去面经练反向传播题' },
  },
  'modules-and-training': {
    estimatedMinutes: 140,
    prerequisites: ['Autograd', '基础面向对象语法'],
    outcomes: ['写完整训练/验证循环', '正确保存与恢复状态', '配置 AdamW 参数组'],
    quiz: [
      { question: 'eval() 会自动关闭梯度吗？', answer: '不会。eval 控制 Dropout/BatchNorm 行为，关闭梯度要用 no_grad 或 inference_mode。' },
      { question: '精确续训只保存模型权重够吗？', answer: '不够，还需优化器、调度器、step、随机状态和 AMP scaler 等状态。' },
    ],
    project: { href: '/downloads/pytorch-course/classifier-project.zip', label: '下载完整分类训练器', detail: 'CPU 可运行，含数据、训练、验证、指标与 checkpoint。' },
  },
  'data-pipeline': {
    estimatedMinutes: 110,
    prerequisites: ['Dataset 与训练循环基础'],
    outcomes: ['处理变长 batch', '正确使用 sampler/worker', '排查数据泄漏'],
    quiz: [
      { question: '为什么 IterableDataset 多 worker 可能重复样本？', answer: '每个 worker 会独立调用 __iter__；若不按 worker id 切分，就会遍历同一数据。' },
      { question: '文本为何不应切 chunk 后再随机划分？', answer: '同一文档的近重复 chunk 可能同时进入训练和验证，造成泄漏。' },
    ],
    interviewLink: { href: '/interview/llm/pretraining-data-and-optimization/', label: '去面经练数据工程题' },
  },
  'transformer-from-scratch': {
    estimatedMinutes: 180,
    prerequisites: ['广播与批量矩阵乘', 'nn.Module', 'Autograd'],
    outcomes: ['手写因果注意力', '解释每个注意力轴', '组装 Decoder Block'],
    quiz: [
      { question: '注意力为何除以 sqrt(head_dim)？', answer: '控制点积方差，避免维度增大时 softmax 过早饱和。' },
      { question: '为什么 mask 要在 softmax 前加入？', answer: '将禁用分数变为负无穷，使其概率为 0 且其余概率仍归一化。' },
    ],
    interviewLink: { href: '/interview/llm/transformer-and-attention/', label: '去面经练 Transformer 高频题' },
    project: { href: '/downloads/pytorch-course/decoder-block-project.zip', label: '下载可运行 Decoder Block', detail: '含 SDPA、反向梯度与因果泄漏自动测试。' },
  },
  'stable-training': {
    estimatedMinutes: 130,
    prerequisites: ['完整训练循环', '浮点数基础'],
    outcomes: ['正确使用 AMP', '实现梯度累积/裁剪', '系统定位 NaN'],
    quiz: [
      { question: 'AMP 中为何裁剪前要 unscale？', answer: '否则裁剪的是被 scaler 放大的梯度，阈值失去原有意义。' },
      { question: '梯度裁剪能修复错误数据吗？', answer: '不能。它限制更新幅度，但不会修复 NaN 算子、脏数据或错误标签。' },
    ],
    interviewLink: { href: '/interview/llm/pretraining-data-and-optimization/', label: '去面经练训练稳定性题' },
  },
  performance: {
    estimatedMinutes: 140,
    prerequisites: ['CUDA 异步执行直觉', '稳定训练'],
    outcomes: ['用 Profiler 找瓶颈', '解释显存组成', '判断 compile/checkpoint 取舍'],
    quiz: [
      { question: '为什么 GPU 计时前后要同步？', answer: 'CUDA 默认异步；不同步可能只测到任务入队时间。' },
      { question: 'reserved 大于 allocated 是否必然内存泄漏？', answer: '不是，reserved 还包括缓存分配器保留以便复用的空间。' },
    ],
    interviewLink: { href: '/interview/llm/inference-and-serving/', label: '去面经练推理性能题' },
  },
  distributed: {
    estimatedMinutes: 170,
    prerequisites: ['单卡训练闭环', '基础网络与进程概念'],
    outcomes: ['选择 DDP/FSDP2/TP', '推导状态复制关系', '定位 collective 挂起'],
    quiz: [
      { question: '模型能放单卡、目标是提吞吐，优先选什么？', answer: '通常优先 DDP；它复制模型并用数据并行提高吞吐。' },
      { question: '为什么 collective 顺序不一致会挂起？', answer: '不同 rank 等待的通信操作彼此不匹配，无法组成同一次集合通信。' },
    ],
    interviewLink: { href: '/interview/llm/distributed-training/', label: '去面经练分布式训练题' },
  },
  'llm-ecosystem': {
    estimatedMinutes: 150,
    prerequisites: ['Transformer 与训练循环', '分布式基础'],
    outcomes: ['组合 Hugging Face 工具链', '用 PEFT 注入 LoRA', '读懂 torchao/TorchTitan 边界'],
    quiz: [
      { question: 'Transformers 模型还受 PyTorch autograd 管理吗？', answer: '是。模型通常仍是 nn.Module，梯度和优化器仍由 PyTorch 管理。' },
      { question: 'LoRA 更少可训练参数是否等于更少全部显存？', answer: '不等于。它主要减少梯度和优化器状态，基础权重与前向激活仍占显存。' },
    ],
    interviewLink: { href: '/interview/llm/sft-and-peft/', label: '去面经练 SFT 与 PEFT 题' },
  },
  'mini-llm-project': {
    estimatedMinutes: 240,
    prerequisites: ['完成前十一章', '能独立调试训练循环'],
    outcomes: ['训练迷你 Decoder-only 模型', '实现生成与 KV Cache 直觉', '形成可讲述项目复盘'],
    quiz: [
      { question: 'next-token 标签与输入是什么关系？', answer: '标签相对输入向右偏一位，每个位置预测紧随其后的 token。' },
      { question: 'KV Cache 省了什么、付出什么？', answer: '省去历史 token 的重复 K/V 计算，付出随层数、batch 和序列增长的缓存显存。' },
    ],
    interviewLink: { href: '/interview/llm/coding-and-system-design/', label: '去面经完成系统设计收官' },
    project: { href: '/downloads/pytorch-course/mini-lm-project.zip', label: '下载迷你中文语言模型', detail: '内置小语料，CPU 可烟雾测试，CUDA 可加速正式训练。' },
  },
};
