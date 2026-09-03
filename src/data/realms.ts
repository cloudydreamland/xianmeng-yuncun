export type RegionId =
  | 'cloud-village'
  | 'rain-bridge'
  | 'star-abyss'
  | 'wind-valley'
  | 'moon-pool'
  | 'snow-cliff'
  | 'lantern-lane';

/** The canonical public naming and route contract for all seven realms. */
export const realmNavigation: Record<RegionId, {
  worldName: string;
  functionLabel: string;
  href: `/world/${RegionId}/`;
  description: string;
}> = {
  'cloud-village': { worldName: '云村', functionLabel: '总览与导航', href: '/world/cloud-village/', description: '网站总入口、七境地图与推荐路线。' },
  'rain-bridge': { worldName: '雨桥', functionLabel: '课程与训练', href: '/world/rain-bridge/', description: '系统课程、代码实践与面试训练。' },
  'star-abyss': { worldName: '星渊', functionLabel: '成长与实验', href: '/world/star-abyss/', description: '成长星图与可交互的技术实验。' },
  'wind-valley': { worldName: '风谷', functionLabel: '资料与笔记', href: '/world/wind-valley/', description: '公开笔记、原始资料与站外链接。' },
  'moon-pool': { worldName: '月潭', functionLabel: '项目与计划', href: '/world/moon-pool/', description: '项目案例与明确公开的推进计划。' },
  'snow-cliff': { worldName: '雪崖', functionLabel: '静心与休憩', href: '/world/snow-cliff/', description: '一处保留安静叙事的雪夜歇脚地。' },
  'lantern-lane': { worldName: '浮屿·灯巷', functionLabel: '作品与收藏', href: '/world/lantern-lane/', description: '摄影、绘画与公开创作记录。' },
};

export const worldMapFunctionLabels = Object.fromEntries(
  Object.entries(realmNavigation).map(([id, realm]) => [id, realm.functionLabel]),
) as Record<RegionId, string>;
