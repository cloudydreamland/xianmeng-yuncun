import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const worldWidths = [960, 1440, 1920, 2560, 3840, 5120];
const villageWidths = [960, 1440, 1920, 2560, 3840];
const times = ['dawn', 'day', 'dusk', 'night'];
const target = process.argv[2] ?? 'all';

if (!['all', 'world', 'village', 'cloudwall'].includes(target)) {
  throw new Error(`Unknown background target: ${target}`);
}

async function render(source, outputBase, width, height, quality = {}) {
  const {
    avif = 62,
    webp = 88,
    chromaSubsampling = '4:4:4',
    effort = 6,
  } = quality;
  const image = sharp(source).resize(width, height, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  });

  await Promise.all([
    image.clone().avif({ quality: avif, effort, chromaSubsampling }).toFile(`${outputBase}.avif`),
    image.clone().webp({ quality: webp, effort, smartSubsample: true }).toFile(`${outputBase}.webp`),
  ]);
}

if (target === 'all' || target === 'world') {
  for (const time of times) {
    const source = path.join(projectRoot, 'media-originals', 'world', time, 'world-detailed-v3-8k.webp');
    await access(source);

    for (const width of worldWidths) {
      const outputBase = path.join(
        projectRoot,
        'public',
        'images',
        'world',
        time,
        `world-detailed-v3-${width}`,
      );
      await render(source, outputBase, width, Math.round(width * 9 / 16), {
        avif: 84,
        webp: 92,
        chromaSubsampling: '4:4:4',
        effort: 6,
      });
    }
  }
}

if (target === 'all' || target === 'village') {
  for (const time of times) {
    const source = path.join(projectRoot, 'media-originals', 'village', time, 'village-detailed-v2-4k.webp');
    await access(source);

    for (const width of villageWidths) {
      const outputBase = path.join(
        projectRoot,
        'public',
        'images',
        'village',
        time,
        `village-detailed-v2-${width}`,
      );
      await render(source, outputBase, width, Math.round(width * 9 / 16), {
        avif: 80,
        webp: 91,
        chromaSubsampling: '4:4:4',
        effort: 6,
      });
    }
  }
}

if (target === 'all' || target === 'cloudwall') {
  const cloudwall = path.join(projectRoot, 'media-originals', 'cloudwall', 'yuncun-cloudwall-4k.webp');
  await access(cloudwall);
  for (const width of [640, 1200, 1600, 2400, 3200, 3840]) {
    await render(
      cloudwall,
      path.join(projectRoot, 'public', 'images', `yuncun-cloudwall-v2-${width}`),
      width,
      width / 2,
      { avif: 82, webp: 92, chromaSubsampling: '4:4:4', effort: 6 },
    );
  }
}

console.log('Responsive background assets are ready.');
