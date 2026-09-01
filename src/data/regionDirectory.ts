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
  { href: '#region-story', label: '地志小传', description: '先识此境来意' },
  { href: '#region-function', label: '此境所司', description: '看它收纳什么' },
];

export const regionDirectories: Record<RegionId, RegionDirectory> = {
  'cloud-village': {
    primary: { href: '#today', label: '今日云笺', description: '先看今天真正需要照料的一件事。' },
    items: [
      ...commonItems,
      { href: '#today', label: '今日云笺', description: '今日重点与临期事项' },
      { href: '#insights', label: '生活趋势', description: '七日与月度回望' },
    ],
  },
  'rain-bridge': {
    primary: { href: '#cloud-search', label: '云镜问津', description: '有明确念头时，先从全站搜索开始。' },
    items: [
      ...commonItems,
      { href: '#cloud-search', label: '云镜问津', description: '搜索散落诸境的内容' },
      { href: '#inbox', label: '灵念收集', description: '暂存尚未归类的念头' },
      { href: '#world-directory', label: '七境名册', description: '按境域浏览全站' },
    ],
  },
  'star-abyss': {
    presentation: 'tabs',
    primary: { href: '#constellation', label: '问道星图', description: '先看所学、正在走的路与下一程。' },
    items: [
      ...commonItems,
      { href: '#constellation', label: '问道星图', description: '学习脉络与下一程' },
      { href: '#focus', label: '星渊定时', description: '开始一段专注' },
      { href: '#attention-lab', label: '术法试验', description: '动手理解 Attention' },
    ],
  },
  'wind-valley': {
    primary: { href: '#wind-archive', label: '最新风信', description: '先读最新札记，再按分卷或标签深入。' },
    items: [
      ...commonItems,
      { href: '#wind-notes', label: '风信台', description: '札记入口与阅读说明' },
      { href: '#wind-filters', label: '分卷筛选', description: '按分类或标签缩小范围' },
      { href: '#wind-archive', label: '全部札记', description: '逐篇浏览风中来信' },
    ],
  },
  'moon-pool': {
    presentation: 'tabs',
    primary: { href: '#moon-projects', label: '月映册', description: '先看已经做成的项目与关键取舍。' },
    items: [
      ...commonItems,
      { href: '#moon-projects', label: '项目旧录', description: '代表项目与案例复盘' },
      { href: '#plan-dashboard', label: '公开推进', description: '仍在水上的计划' },
      { href: '#calendar', label: '生活日历', description: '月周视图与日程' },
      { href: '#local-planner', label: '本地计划', description: '只留在本机的安排' },
      { href: '#life-planning', label: '生活账册', description: '清单、期限与物品' },
    ],
  },
  'snow-cliff': {
    primary: { href: '#habits', label: '朝夕印记', description: '用最轻的方式看见今天是否照顾了自己。' },
    items: [
      ...commonItems,
      { href: '#habits', label: '朝夕印记', description: '习惯与七日状态' },
    ],
  },
  'lantern-lane': {
    primary: { href: '#gallery', label: '浮光廊', description: '先看已经点亮的作品与收藏。' },
    items: [
      ...commonItems,
      { href: '#gallery', label: '浮光廊', description: '作品与收藏' },
      { href: '#journal', label: '浮光手记', description: '只留在本机的一句话' },
    ],
  },
};
