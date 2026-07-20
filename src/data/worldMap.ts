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

const worldWidths = [960, 1440, 1920] as const;
const worldSizes = '(max-width: 760px) 960px, (max-width: 1920px) 100vw, 1920px';

function worldCandidate(time: ResolvedTimeMode, width: number, format: ImageDeliveryFormat): string {
  return deliveryImageUrl({
    localPath: `/images/world/${time}/world-restored-v1-${width}.${format}`,
    storageKey: `world/${time}/world-4k.webp`,
    width,
    format,
    quality: format === 'avif' ? 68 : 76,
  });
}

export const worldBackgrounds: Record<ResolvedTimeMode, ResponsiveWorldImage> = Object.fromEntries(
  (['dawn', 'day', 'dusk', 'night'] as const).map((time) => [time, {
    avifSrcSet: imageSrcSet(worldWidths.map((width) => ({ url: worldCandidate(time, width, 'avif'), width }))),
    webpSrcSet: imageSrcSet(worldWidths.map((width) => ({ url: worldCandidate(time, width, 'webp'), width }))),
    fallback: worldCandidate(time, 1920, 'webp'),
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
  { href: '/notes', label: '山窗书屋', meta: '学习笔记' },
  { href: '/projects', label: '百工阁', meta: '开源项目' },
  { href: '/about', label: '三山观', meta: '关于与履历' },
];
