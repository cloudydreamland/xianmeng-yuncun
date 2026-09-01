import type { RegionId } from './worldMap';

export type LifeModuleId = 'today' | 'insights' | 'inbox' | 'focus' | 'reading' | 'calendar' | 'planning' | 'habits' | 'journal';

export interface LifeModule {
  id: LifeModuleId;
  label: string;
  title: string;
  description: string;
  realm: RegionId;
  realmLabel: string;
  href: string;
  mark: string;
}

/**
 * The single navigation contract between everyday tools and the seven realms.
 * Keep headers, quick capture and region pages pointed at this list instead of
 * duplicating route strings in multiple components.
 */
export const lifeModules: LifeModule[] = [
  { id: 'today', label: '今日', title: '今日云笺', description: '今日重点、临期事项与生活概览', realm: 'cloud-village', realmLabel: '云村', href: '/world/cloud-village/#today', mark: '今' },
  { id: 'insights', label: '趋势', title: '生活趋势', description: '任务、专注、习惯与开销的温和回望', realm: 'cloud-village', realmLabel: '云村', href: '/world/cloud-village/#insights', mark: '势' },
  { id: 'inbox', label: '收集', title: '临时记录', description: '任务、链接与未分类想法的统一入口', realm: 'rain-bridge', realmLabel: '雨桥', href: '/world/rain-bridge/#inbox', mark: '收' },
  { id: 'focus', label: '专注', title: '星渊定时', description: '专注计时与当日专注记录', realm: 'star-abyss', realmLabel: '星渊', href: '/world/star-abyss/#focus', mark: '定' },
  { id: 'reading', label: '阅读', title: '阅读清单', description: '站内文章与外部链接的阅读队列', realm: 'wind-valley', realmLabel: '风谷', href: '/world/wind-valley/#wind-notes-title', mark: '阅' },
  { id: 'calendar', label: '日历', title: '生活日历', description: '月周视图、定时日程与生活期限', realm: 'moon-pool', realmLabel: '月潭', href: '/world/moon-pool/#calendar', mark: '历' },
  { id: 'planning', label: '安排', title: '生活安排', description: '任务、清单、期限、账目与物品', realm: 'moon-pool', realmLabel: '月潭', href: '/world/moon-pool/#life-planning', mark: '策' },
  { id: 'habits', label: '习惯', title: '朝夕印记', description: '轻量习惯与七日状态', realm: 'snow-cliff', realmLabel: '雪崖', href: '/world/snow-cliff/#habits', mark: '养' },
  { id: 'journal', label: '手记', title: '浮光手记', description: '一句日记、心情与生活回忆', realm: 'lantern-lane', realmLabel: '浮屿·灯巷', href: '/world/lantern-lane/#journal', mark: '记' },
];

export const lifeModuleById = Object.fromEntries(lifeModules.map((item) => [item.id, item])) as Record<LifeModuleId, LifeModule>;
