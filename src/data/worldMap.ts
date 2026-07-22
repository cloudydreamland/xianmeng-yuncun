import { deliveryImageUrl, imageSrcSet, type ImageDeliveryFormat } from '../lib/imageDelivery';

export type RegionId =
  | 'cloud-village'
  | 'rain-bridge'
  | 'star-abyss'
  | 'wind-valley'
  | 'moon-pool'
  | 'snow-cliff'
  | 'lantern-lane';

export type RegionStatus = 'active' | 'planned';
export type TimeMode = 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
export type ResolvedTimeMode = Exclude<TimeMode, 'auto'>;

export interface WorldMapPoint {
  id: RegionId;
  x: number;
  y: number;
  labelSide: 'left' | 'right' | 'center';
  cropPosition: string;
}

export interface ResponsiveWorldImage {
  avifSrcSet: string;
  webpSrcSet: string;
  fallback: string;
  sizes: string;
}

export const worldMapPoints: WorldMapPoint[] = [
  { id: 'cloud-village', x: 51, y: 46, labelSide: 'center', cropPosition: '51% 46%' },
  { id: 'rain-bridge', x: 51, y: 79, labelSide: 'center', cropPosition: '51% 82%' },
  { id: 'star-abyss', x: 21, y: 24, labelSide: 'right', cropPosition: '18% 20%' },
  { id: 'wind-valley', x: 18, y: 59, labelSide: 'right', cropPosition: '16% 65%' },
  { id: 'moon-pool', x: 82, y: 34, labelSide: 'left', cropPosition: '85% 34%' },
  { id: 'snow-cliff', x: 55, y: 17, labelSide: 'right', cropPosition: '55% 12%' },
  { id: 'lantern-lane', x: 82, y: 69, labelSide: 'left', cropPosition: '84% 72%' },
];

const worldWidths = [960, 1440, 1600, 1920, 2560, 2880, 3200, 3840, 5120] as const;
const worldSizes = '(max-width: 760px) 960px, (max-width: 1440px) 100vw, (max-width: 2560px) 100vw, 2560px';

function worldCandidate(time: ResolvedTimeMode, width: number, format: ImageDeliveryFormat): string {
  return deliveryImageUrl({
    localPath: `/images/world/${time}/world-detailed-v3-${width}.${format}`,
    storageKey: `world/${time}/world-detailed-v3-8k.webp`,
    width,
    format,
    quality: format === 'avif' ? 84 : 92,
  });
}

export const worldBackgrounds: Record<ResolvedTimeMode, ResponsiveWorldImage> = Object.fromEntries(
  (['dawn', 'day', 'dusk', 'night'] as const).map((time) => [time, {
    avifSrcSet: imageSrcSet(worldWidths.map((width) => ({ url: worldCandidate(time, width, 'avif'), width }))),
    webpSrcSet: imageSrcSet(worldWidths.map((width) => ({ url: worldCandidate(time, width, 'webp'), width }))),
    fallback: worldCandidate(time, 3840, 'webp'),
    sizes: worldSizes,
  }]),
) as Record<ResolvedTimeMode, ResponsiveWorldImage>;

export const timeCopy: Record<ResolvedTimeMode, string> = {
  dawn: '晓色初开',
  day: '晴云照境',
  dusk: '暮霞渡川',
  night: '星月满天',
};

export const cloudVillageDestinations = [
  { href: '/world/wind-valley/', label: '风谷', meta: '笔记、碎片与小实验' },
  { href: '/world/moon-pool/', label: '月潭', meta: '项目、复盘与长期档案' },
  { href: '/world/rain-bridge/', label: '雨桥', meta: '全境导航与云镜搜索' },
  { href: '/world/star-abyss/', label: '星渊', meta: '学习路线与成长星图' },
  { href: '/world/snow-cliff/', label: '雪崖', meta: '友链、邮件与访客须知' },
  { href: '/world/lantern-lane/', label: '浮屿·灯巷', meta: '摄影、插画与视觉作品' },
  { href: '/about', label: '个人主页', meta: '履历、技能与公开经历' },
];
