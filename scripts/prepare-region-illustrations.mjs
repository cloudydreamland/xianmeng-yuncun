import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const defaultWidths = [960, 1280, 1600];
const allRegions = [
  'cloud-village',
  'wind-valley',
  'star-abyss',
  'moon-pool',
  'rain-bridge',
  'snow-cliff',
  'lantern-lane',
];
const requestedRegions = process.argv.slice(2);
const regions = requestedRegions.length > 0 ? requestedRegions : allRegions;

for (const slug of regions) {
  if (!allRegions.includes(slug)) throw new Error(`Unknown region: ${slug}`);
}

for (const slug of regions) {
  const highDensity = slug === 'lantern-lane';
  const widths = highDensity ? [...defaultWidths, 2400, 3200] : defaultWidths;
  const inputName = highDensity
    ? 'lantern-lane-article-v3-hd-4k.webp'
    : `${slug}-article-v2-anime.png`;
  const outputPrefix = highDensity ? 'region-article-v3-hd' : 'region-article-v2';
  const input = path.join(root, 'media-originals', 'regions', inputName);
  const outputDir = path.join(root, 'public', 'images', 'regions', slug);
  await fs.mkdir(outputDir, { recursive: true });

  const metadata = await sharp(input).metadata();
  if (!metadata.width || metadata.width < Math.max(...widths)) {
    throw new Error(`${slug}: source width must be at least ${Math.max(...widths)}px`);
  }

  await Promise.all(widths.flatMap((width) => {
    const height = Math.round(width * 9 / 16);
    const base = sharp(input)
      .resize(width, height, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 });

    return [
      base.clone()
        .avif({ quality: 80, effort: 6, chromaSubsampling: '4:4:4' })
        .toFile(path.join(outputDir, `${outputPrefix}-${width}.avif`)),
      base.clone()
        .webp({ quality: 92, effort: 6, smartSubsample: true })
        .toFile(path.join(outputDir, `${outputPrefix}-${width}.webp`)),
    ];
  }));

  console.log(`prepared ${slug}`);
}
