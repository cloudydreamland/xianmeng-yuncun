export interface CloudJourneyStop {
  path: string;
  label: string;
  realm: string;
  reason: string;
}

export interface CloudJourney {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  tone: 'jade' | 'star' | 'lantern';
  stops: CloudJourneyStop[];
}

export const TRAIL_STORAGE_KEY = 'yuncun:trail:v1';

export const cloudJourneys: CloudJourney[] = [
  {
    id: 'meet-the-maker',
    title: '三分钟识我',
    subtitle: '给第一次来访的人',
    description: '从真实经历走到代表项目，再看看此刻正在推进的事情。',
    duration: '约 3 分钟',
    tone: 'jade',
    stops: [
      { path: '/about', label: '个人主页', realm: '云村', reason: '先认识建村的人，以及正在学习和关心的方向。' },
      { path: '/projects/yuncun-blog/', label: '闲梦 · 云村', realm: '月潭', reason: '看这座网站如何从想法变成可维护的工程。' },
      { path: '/projects/smart-cloud-brain/', label: '智慧云脑诊疗平台', realm: '月潭', reason: '查看较完整的前后端与微服务项目实践。' },
      { path: '/now', label: '此刻与近况', realm: '云村', reason: '以最近更新和公开计划结束这次短访。' },
    ],
  },
  {
    id: 'nlp-stargazing',
    title: 'NLP 问星',
    subtitle: '给学习者与同行',
    description: '从面试知识索引出发，经过大模型资料和交互实验，落到真实工程。',
    duration: '约 12 分钟',
    tone: 'star',
    stops: [
      { path: '/notes/nlp-interview-study-index/', label: 'NLP 算法岗索引', realm: '风谷', reason: '建立 BERT、Transformer 与常见问题的复习坐标。' },
      { path: '/notes/large-model-interview-study-index/', label: '大模型面试题集', realm: '风谷', reason: '继续扩展到注意力、训练与推理主题。' },
      { path: '/world/star-abyss/', label: '注意力小试', realm: '星渊', reason: '亲手改变参数，观察注意力权重如何重新分配。' },
      { path: '/projects/replaygain-ml/', label: 'ReplayGain ML', realm: '月潭', reason: '回到可以运行、训练和验证的机器学习项目。' },
    ],
  },
  {
    id: 'seven-realms',
    title: '七境巡游',
    subtitle: '给想随意探索的人',
    description: '不从简历开始，沿着世界设定看看文字、项目、计划与收藏如何各归其境。',
    duration: '约 8 分钟',
    tone: 'lantern',
    stops: [
      { path: '/world/cloud-village/', label: '云村', realm: '闲梦', reason: '从世界中心读懂七境各自承担的内容。' },
      { path: '/world/wind-valley/', label: '风谷', realm: '闲梦', reason: '让公开笔记和学习资料从风中显形。' },
      { path: '/world/moon-pool/', label: '月潭', realm: '闲梦', reason: '查看项目档案与仍在推进的计划。' },
      { path: '/world/lantern-lane/', label: '浮屿 · 灯巷', realm: '浮屿', reason: '最后到灯下翻看被认真保存的作品。' },
    ],
  },
];

export const journeyStopByPath = new Map(
  cloudJourneys.flatMap((journey) => journey.stops).map((stop) => [stop.path, stop]),
);
