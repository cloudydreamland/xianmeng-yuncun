import { cssResponsiveImageSet, deliveryImageUrl } from '../lib/imageDelivery';
import type { ResolvedTimeMode } from './worldMap';

interface VillageBackground {
  desktop: string;
  mobile: string;
}

function imageSet(
  time: ResolvedTimeMode,
  width: 960 | 1920,
  retinaWidth: 1920 | 3840,
): string {
  const candidate = (candidateWidth: number, format: 'avif' | 'webp') => deliveryImageUrl({
    localPath: `/images/village/${time}/village-detailed-v2-${candidateWidth}.${format}`,
    storageKey: `village/${time}/village-detailed-v2-4k.webp`,
    width: candidateWidth,
    format,
    quality: format === 'avif' ? 75 : 85,
  });

  return cssResponsiveImageSet([
    { url: candidate(width, 'avif'), format: 'avif', resolution: 1 },
    { url: candidate(retinaWidth, 'avif'), format: 'avif', resolution: 2 },
    { url: candidate(width, 'webp'), format: 'webp', resolution: 1 },
    { url: candidate(retinaWidth, 'webp'), format: 'webp', resolution: 2 },
  ]);
}

export const villageBackgrounds: Record<ResolvedTimeMode, VillageBackground> = Object.fromEntries(
  (['dawn', 'day', 'dusk', 'night'] as const).map((time) => [time, {
    desktop: imageSet(time, 1920, 3840),
    mobile: imageSet(time, 960, 1920),
  }]),
) as Record<ResolvedTimeMode, VillageBackground>;
