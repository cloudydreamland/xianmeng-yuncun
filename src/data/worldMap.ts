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
  cssImage?: string;
  cssImageMobile?: string;
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

const worldWidths = [960, 1440, 1920, 2560, 3840, 5120] as const;
// The map canvas is 960px wide on phones and capped at 1800px on desktops.
// Keeping this in sync with the CSS lets the browser choose a DPR-appropriate
// file instead of either upscaling a small image or downloading the 5K asset.
const worldSizes = '(max-width: 760px) 960px, (max-width: 1800px) 100vw, 1800px';

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
    cssImage: worldCandidate(time, 1920, 'avif'),
    cssImageMobile: worldCandidate(time, 960, 'avif'),
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
  { href: '/world/wind-valley/', label: '风谷', meta: '风中札记与未成之思' },
  { href: '/world/moon-pool/', label: '月潭', meta: '造物旧录与来路回望' },
  { href: '/world/rain-bridge/', label: '雨桥', meta: '七境舆图与云镜问津' },
  { href: '/world/star-abyss/', label: '星渊', meta: '问道来路与未至星群' },
  { href: '/world/snow-cliff/', label: '雪崖', meta: '故人雪信与炉边名帖' },
  { href: '/world/lantern-lane/', label: '浮屿·灯巷', meta: '镜中山河与纸上丹青' },
  { href: '/about', label: '个人主页', meta: '履历、技能与公开经历' },
];
