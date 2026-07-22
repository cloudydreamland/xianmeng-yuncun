import { imageSrcSet } from '../lib/imageDelivery';
import type { RegionId, ResponsiveWorldImage } from './worldMap';

export interface RegionIllustration extends ResponsiveWorldImage {
  alt: string;
}

const defaultWidths = [960, 1280, 1600] as const;
const lanternLaneWidths = [960, 1280, 1600, 2400, 3200] as const;
const sizes = '(max-width: 760px) calc(100vw - 28px), (max-width: 1000px) calc(100vw - 48px), (max-width: 1400px) 46vw, 620px';

const altText: Record<RegionId, string> = {
  'cloud-village': '风暴云墙外白龙盘旋，三座青山、清泉、麦田与茅屋在晨光中苏醒',
  'wind-valley': '古木幽谷中青苔神像睁开青色眼眸，风卷树叶穿过薄雾',
  'star-abyss': '竹林小径从盛开的白玉兰旁通向幽深星渊，古老星河在远方流淌',
  'moon-pool': '银色月瀑落入镜面潭水，柳岸灯火与小舟安静相映',
  'rain-bridge': '斜雨中的青苔古桥横跨昼夜两岸，撑伞行人走过水洼涟漪',
  'snow-cliff': '雪崖酒舍的两盏暖灯照着屋内蜷卧的括耳狐，白梅与粉色酒雾映着暮雪',
  'lantern-lane': '暮色灯巷沿水道蜿蜒，莲灯、锦鲤灯与凤凰灯在烟火下点亮市集',
};

function illustration(slug: RegionId): RegionIllustration {
  const highDensity = slug === 'lantern-lane';
  const widths = highDensity ? lanternLaneWidths : defaultWidths;
  const version = highDensity ? 'v3-hd' : 'v2';
  const candidate = (width: number, format: 'avif' | 'webp') =>
    `/images/regions/${slug}/region-article-${version}-${width}.${format}`;

  return {
    avifSrcSet: imageSrcSet(widths.map((width) => ({ url: candidate(width, 'avif'), width }))),
    webpSrcSet: imageSrcSet(widths.map((width) => ({ url: candidate(width, 'webp'), width }))),
    fallback: candidate(1600, 'webp'),
    sizes,
    alt: altText[slug],
  };
}

export const regionIllustrations = Object.fromEntries(
  (Object.keys(altText) as RegionId[]).map((slug) => [slug, illustration(slug)]),
) as Record<RegionId, RegionIllustration>;
