import type { RegionId } from './worldMap';

export interface RegionDirectoryItem {
  href: `#${string}`;
  label: string;
  description: string;
}

export interface RegionDirectory {
  primary: RegionDirectoryItem;
  items: RegionDirectoryItem[];
  presentation?: 'directory' | 'tabs';
}

const commonItems: RegionDirectoryItem[] = [
  { href: '#region-story', label: '地志小传', description: '区域背景介绍' },
  { href: '#region-function', label: '此境所司', description: '区域内容范围' },
];

export const regionDirectories: Record<RegionId, RegionDirectory> = {
  'cloud-village': {
    primary: { href: '#region-story', label: '地志小传', description: '从云村了解七境世界的来路。' },
    items: commonItems,
  },
  'rain-bridge': {
    primary: { href: '#learning-paths', label: '学习渡口', description: '进入大模型笔记、PyTorch 实践与面试题库。' },
    items: [
      ...commonItems,
      { href: '#learning-paths', label: '三路问学', description: '概念、代码与表达' },
      { href: '#learning-route', label: '推荐顺序', description: '从理解到实践再到表达' },
    ],
  },
  'star-abyss': {
    presentation: 'tabs',
    primary: { href: '#constellation', label: '问道星图', description: '查看学习经历、当前方向与后续计划。' },
    items: [
      ...commonItems,
      { href: '#constellation', label: '问道星图', description: '学习脉络与下一程' },
      { href: '#attention-lab', label: '术法试验', description: '动手理解 Attention' },
    ],
  },
  'wind-valley': {
    primary: { href: '#resource-library', label: '资料与笔记库', description: '查看原始文件、公开笔记和网站链接。' },
    items: [
      ...commonItems,
      { href: '#resource-library', label: '知识资产', description: '文件、笔记与网站链接' },
      { href: '#wind-notes', label: '风信台', description: '札记入口与阅读说明' },
      { href: '#wind-filters', label: '分卷筛选', description: '按分类或标签缩小范围' },
      { href: '#wind-archive', label: '全部札记', description: '逐篇浏览风中来信' },
    ],
  },
  'moon-pool': {
    presentation: 'tabs',
    primary: { href: '#moon-projects', label: '月映册', description: '查看已完成项目与案例复盘。' },
    items: [
      ...commonItems,
      { href: '#moon-projects', label: '项目旧录', description: '代表项目与案例复盘' },
      { href: '#plan-dashboard', label: '公开推进', description: '仍在水上的计划' },
    ],
  },
  'snow-cliff': {
    primary: { href: '#region-story', label: '雪夜小传', description: '在白狐酒社读一段安静的雪夜故事。' },
    items: commonItems,
  },
  'lantern-lane': {
    primary: { href: '#gallery', label: '浮光廊', description: '查看公开作品与收藏。' },
    items: [
      ...commonItems,
      { href: '#gallery', label: '浮光廊', description: '作品与收藏' },
    ],
  },
};
