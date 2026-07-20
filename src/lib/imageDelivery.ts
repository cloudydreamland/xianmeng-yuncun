export type ImageDeliveryFormat = 'avif' | 'webp';

interface DeliveryImageOptions {
  localPath: string;
  storageKey: string;
  width: number;
  format: ImageDeliveryFormat;
  quality?: number;
}

const mediaOrigin = import.meta.env.PUBLIC_MEDIA_ORIGIN?.replace(/\/$/, '');
const transformOrigin = import.meta.env.PUBLIC_IMAGE_TRANSFORM_ORIGIN?.replace(/\/$/, '');

export const remoteImageDeliveryEnabled = Boolean(mediaOrigin && transformOrigin);

export function deliveryImageUrl({
  localPath,
  storageKey,
  width,
  format,
  quality = 75,
}: DeliveryImageOptions): string {
  if (!mediaOrigin || !transformOrigin) return localPath;

  const source = `${mediaOrigin}/${storageKey.replace(/^\//, '')}`;
  const options = `width=${width},quality=${quality},format=${format},fit=scale-down`;
  return `${transformOrigin}/cdn-cgi/image/${options}/${source}`;
}

export function imageSrcSet(candidates: Array<{ url: string; width: number }>): string {
  return candidates.map(({ url, width }) => `${url} ${width}w`).join(', ');
}

export function cssImageSet(avif: string, webp: string): string {
  return `image-set(url("${avif}") type("image/avif"), url("${webp}") type("image/webp"))`;
}
