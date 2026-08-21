import path from 'node:path';
import sharp from 'sharp';

const [sourceArg, outputStem] = process.argv.slice(2);

if (!sourceArg || !outputStem) {
  throw new Error('Usage: node scripts/prepare-page-background.mjs <source> <output-stem>');
}

const projectRoot = process.cwd();
const source = path.resolve(projectRoot, sourceArg);
const outputDir = path.join(projectRoot, 'public', 'images', 'backgrounds');
const widths = [1536, 2560, 3840];

for (const width of widths) {
  const height = Math.round(width * 9 / 16);
  const outputBase = path.join(outputDir, `${outputStem}-${width}`);
  const image = sharp(source)
    .resize(width, height, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 0.72, m1: 0.7, m2: 2.1, x1: 2.5, y2: 9, y3: 18 });

  await Promise.all([
    image.clone().avif({
      quality: width === 3840 ? 66 : 69,
      effort: 6,
      chromaSubsampling: '4:4:4',
    }).toFile(`${outputBase}.avif`),
    image.clone().webp({
      quality: width === 3840 ? 86 : 88,
      effort: 6,
      smartSubsample: true,
    }).toFile(`${outputBase}.webp`),
  ]);
}

console.log(`Prepared responsive page background: ${outputStem}`);
