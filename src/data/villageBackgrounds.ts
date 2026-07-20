import { cssImageSet, deliveryImageUrl } from '../lib/imageDelivery';
import type { ResolvedTimeMode } from './worldMap';

interface VillageBackground {
  desktop: string;
  mobile: string;
}

function imageSet(time: ResolvedTimeMode, width: 960 | 1920): string {
  const candidate = (format: 'avif' | 'webp') => deliveryImageUrl({
    localPath: `/images/village/${time}/village-restored-v1-${width}.${format}`,
    storageKey: `village/${time}/village-4k.webp`,
    width,
    format,
    quality: format === 'avif' ? 68 : 76,
  });

  return cssImageSet(candidate('avif'), candidate('webp'));
}

export const villageBackgrounds: Record<ResolvedTimeMode, VillageBackground> = Object.fromEntries(
  (['dawn', 'day', 'dusk', 'night'] as const).map((time) => [time, {
    desktop: imageSet(time, 1920),
    mobile: imageSet(time, 960),
  }]),
) as Record<ResolvedTimeMode, VillageBackground>;
