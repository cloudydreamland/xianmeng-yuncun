export type CurriculumPhase = '基础建模' | '训练方法' | '系统工程' | '综合应用';

export interface LlmCurriculumModule {
  chapterSlug: string;
  phase: CurriculumPhase;
  phaseOrder: number;
  deepDiveSlugs: string[];
  practiceSlugs: string[];
  studyOrder: [string, string, string, string];
  mastery: string;
}

/**
 * 系统笔记是课程主线；原理专题与 PyTorch 实践是同一章的第二、三层。
 * 每份补充内容只编入一次，避免读者在多个章节重复学习同一材料。
 */
export const llmCurriculum: LlmCurriculumModule[] = [
  {
    chapterSlug: 'big-picture',
    phase: '基础建模',
    phaseOrder: 1,
    deepDiveSlugs: ['architecture-and-scaling'],
    practiceSlugs: ['python-and-installation'],
    studyOrder: ['先读主教材，建立训练—推理—应用全景', '深挖模型规模、计算量与能力边界', '准备 Python、NumPy 与 PyTorch 环境', '画出一条端到端数据流并解释每个环节'],
    mastery: '不看笔记，能从原始文本讲到应用回答，并指出参数、算力、数据分别影响什么。',
  },
  {
    chapterSlug: 'token-and-embedding',
    phase: '基础建模',
    phaseOrder: 1,
    deepDiveSlugs: ['tokenization-and-embeddings'],
    practiceSlugs: ['first-tensor', 'tensor-shapes'],
    studyOrder: ['理解字符串为何不能直接进入模型', '比较 BPE、WordPiece、位置编码与表示学习', '练习 Tensor、索引、广播和矩阵乘法', '手算一次分词—查表—形状变化'],
    mastery: '给定一段文本，能写出从 token id 到三维隐藏状态的形状，并解释未知词、位置与相似度问题。',
  },
  {
    chapterSlug: 'neural-training',
    phase: '基础建模',
    phaseOrder: 1,
    deepDiveSlugs: ['deep-learning-foundations'],
    practiceSlugs: ['autograd', 'modules-and-training'],
    studyOrder: ['建立损失、梯度与优化的因果链', '推导交叉熵、归一化和梯度稳定性', '亲手写自动求导与完整训练循环', '用过拟合一个小批次验证训练管线'],
    mastery: '能根据 loss、gradient norm 与学习率曲线定位“没有学会、学不动、学崩了”三类故障。',
  },
  {
    chapterSlug: 'transformer',
    phase: '基础建模',
    phaseOrder: 1,
    deepDiveSlugs: ['transformer-and-attention'],
    practiceSlugs: ['transformer-from-scratch'],
    studyOrder: ['先追踪单层 Transformer 的张量流', '深入注意力、位置编码、归一化与长上下文', '从 Embedding 开始实现可运行 Transformer', '对每一步打印形状并做因果遮罩检查'],
    mastery: '能在纸上推导多头注意力各张量形状，并解释残差、归一化、MLP 和 Mask 各自的必要性。',
  },
  {
    chapterSlug: 'pretraining',
    phase: '训练方法',
    phaseOrder: 2,
    deepDiveSlugs: ['pretraining-data-and-optimization'],
    practiceSlugs: ['data-pipeline'],
    studyOrder: ['理解预训练目标与数据生命周期', '分析数据配比、去重、优化器和训练稳定性', '实现 Dataset、DataLoader、切块与动态批处理', '制定一次小模型预训练的数据验收表'],
    mastery: '能解释一批原始文档如何变成训练 batch，并列出数据质量、泄漏、吞吐和收敛的检查指标。',
  },
  {
    chapterSlug: 'distributed-training',
    phase: '训练方法',
    phaseOrder: 2,
    deepDiveSlugs: ['distributed-training'],
    practiceSlugs: ['distributed'],
    studyOrder: ['从单卡内存账本理解为什么必须并行', '比较 DP、TP、PP、ZeRO 与通信代价', '实践 DDP、FSDP 与多维并行接口', '为指定模型与集群画并行切分方案'],
    mastery: '给定参数量、精度和 GPU 数量，能估算显存下限，选择并行策略并指出主要通信瓶颈。',
  },
  {
    chapterSlug: 'post-training',
    phase: '训练方法',
    phaseOrder: 2,
    deepDiveSlugs: ['sft-and-peft', 'alignment-and-reasoning'],
    practiceSlugs: ['stable-training'],
    studyOrder: ['区分预训练、SFT、偏好优化与推理强化', '深入 LoRA、DPO、RLHF 和奖励建模', '用 AMP、梯度裁剪与监控稳定训练', '设计一套含基线和消融的后训练实验'],
    mastery: '能根据目标、数据量与预算选择全参微调、LoRA 或偏好优化，并说明离线评测和上线风险。',
  },
  {
    chapterSlug: 'inference',
    phase: '系统工程',
    phaseOrder: 3,
    deepDiveSlugs: ['inference-and-serving'],
    practiceSlugs: ['performance'],
    studyOrder: ['拆分预填充、解码与采样全过程', '深入 KV Cache、批处理、量化和服务调度', '使用 Profiler、compile 与检查点优化', '用吞吐—延迟—显存三角评估方案'],
    mastery: '能解释首 token 延迟和每 token 延迟的来源，并针对离线吞吐或在线延迟提出不同优化顺序。',
  },
  {
    chapterSlug: 'rag',
    phase: '系统工程',
    phaseOrder: 3,
    deepDiveSlugs: ['rag-and-retrieval'],
    practiceSlugs: [],
    studyOrder: ['从失败案例理解 RAG 的适用边界', '深入切块、召回、重排、生成与评测', '用最小检索管线完成离线实验', '逐层排查没有召回、排序错误和生成误用'],
    mastery: '能把“回答不对”拆成语料、切块、召回、重排、上下文组织和生成六层，并为每层定义指标。',
  },
  {
    chapterSlug: 'agents',
    phase: '系统工程',
    phaseOrder: 3,
    deepDiveSlugs: ['agents-and-tools'],
    practiceSlugs: ['llm-ecosystem'],
    studyOrder: ['理解模型、工具、状态和控制循环', '深入函数调用、规划、记忆与失败恢复', '认识 Transformers、PEFT、torchao 等工程接口', '设计一个有权限边界和终止条件的 Agent'],
    mastery: '能画出 Agent 状态机，定义工具输入输出、超时重试、幂等、权限和人工确认点。',
  },
  {
    chapterSlug: 'evaluation-and-safety',
    phase: '系统工程',
    phaseOrder: 3,
    deepDiveSlugs: ['evaluation-safety-hallucination'],
    practiceSlugs: [],
    studyOrder: ['先按能力、任务和风险拆评测目标', '深入自动指标、人评、污染、幻觉与安全', '构造固定评测集和错误标签体系', '把离线分数连接到发布门槛与回归流程'],
    mastery: '能为一个真实应用设计覆盖质量、事实性、安全、延迟和成本的评测矩阵，而不是只报一个平均分。',
  },
  {
    chapterSlug: 'multimodal-and-review',
    phase: '综合应用',
    phaseOrder: 4,
    deepDiveSlugs: ['multimodal-llms'],
    practiceSlugs: [],
    studyOrder: ['把文本主线迁移到图像、音频与视频', '深入编码器、对齐、连接器与多模态幻觉', '比较早期融合、晚期融合与统一序列方案', '用跨章节问题做第一次综合复盘'],
    mastery: '能解释不同模态如何编码、对齐并进入语言模型，同时指出数据、分辨率、时序和安全的新难点。',
  },
  {
    chapterSlug: 'capstone-system',
    phase: '综合应用',
    phaseOrder: 4,
    deepDiveSlugs: ['coding-and-system-design'],
    practiceSlugs: ['mini-llm-project'],
    studyOrder: ['把需求改写成可测量的系统目标', '完成容量、接口、数据流与故障设计', '训练并优化一个迷你语言模型', '提交设计文档、实验记录与复盘报告'],
    mastery: '能独立完成从问题定义、基线、实现、评测到上线观测的闭环，并清楚说明每个取舍的证据。',
  },
];

export function getLlmCurriculumModule(chapterSlug: string) {
  return llmCurriculum.find((item) => item.chapterSlug === chapterSlug);
}
