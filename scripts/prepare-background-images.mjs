import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const widths = [960, 1440, 1920];
const times = ['dawn', 'day', 'dusk', 'night'];

async function render(source, outputBase, width, height) {
  const image = sharp(source).resize(width, height, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  });

  await Promise.all([
    image.clone().avif({ quality: 48, effort: 5, chromaSubsampling: '4:2:0' }).toFile(`${outputBase}.avif`),
    image.clone().webp({ quality: 75, effort: 5, smartSubsample: true }).toFile(`${outputBase}.webp`),
  ]);
}

for (const kind of ['world', 'village']) {
  for (const time of times) {
    const source = path.join(projectRoot, 'media-originals', kind, time, `${kind}-4k.webp`);
    await access(source);

    for (const width of widths) {
      const outputBase = path.join(
        projectRoot,
        'public',
        'images',
        kind,
        time,
        `${kind}-restored-v1-${width}`,
      );
      await render(source, outputBase, width, Math.round(width * 9 / 16));
    }
  }
}

const cloudwall = path.join(projectRoot, 'media-originals', 'cloudwall', 'yuncun-cloudwall-4k.webp');
await access(cloudwall);
for (const width of [640, 1200, 1600]) {
  await render(
    cloudwall,
    path.join(projectRoot, 'public', 'images', `yuncun-cloudwall-v1-${width}`),
    width,
    width / 2,
  );
}

console.log('Responsive background assets are ready.');
