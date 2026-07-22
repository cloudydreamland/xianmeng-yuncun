import { deliveryImageUrl, imageSrcSet, type ImageDeliveryFormat } from '../lib/imageDelivery';
import type { ResponsiveWorldImage } from './worldMap';

const widths = [640, 1200, 1600, 2400, 3200, 3840] as const;

function candidate(width: number, format: ImageDeliveryFormat): string {
  return deliveryImageUrl({
    localPath: `/images/yuncun-cloudwall-v2-${width}.${format}`,
    storageKey: 'cloudwall/yuncun-cloudwall-4k.webp',
    width,
    format,
    quality: format === 'avif' ? 82 : 92,
  });
}

export const cloudVillageBackground: ResponsiveWorldImage = {
  avifSrcSet: imageSrcSet(widths.map((width) => ({ url: candidate(width, 'avif'), width }))),
  webpSrcSet: imageSrcSet(widths.map((width) => ({ url: candidate(width, 'webp'), width }))),
  fallback: candidate(2400, 'webp'),
  sizes: '100vw',
};
