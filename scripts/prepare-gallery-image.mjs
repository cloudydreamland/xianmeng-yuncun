import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import sharp from 'sharp';

const [inputArg, outputArg, kind = 'photo'] = process.argv.slice(2);
if (!inputArg || !outputArg || !['photo', 'art'].includes(kind)) {
  console.error('用法：pnpm gallery:prepare <输入图片> <src/assets/works/.../输出文件> [photo|art]');
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const worksRoot = resolve('src/assets/works');
if (output !== worksRoot && !output.startsWith(`${worksRoot}${sep}`)) {
  throw new Error('输出文件必须位于 src/assets/works/ 内');
}

const extension = extname(output).toLowerCase();
if (kind === 'photo' && extension !== '.webp') throw new Error('照片输出必须使用 .webp');
if (kind === 'art' && extension !== '.png' && extension !== '.webp') throw new Error('插画输出必须使用 .png 或 .webp');

await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.processing`;
let pipeline = sharp(input, { failOn: 'warning' })
  .rotate()
  .resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true });

if (extension === '.png') pipeline = pipeline.png({ compressionLevel: 9, palette: false });
else pipeline = pipeline.webp({ quality: kind === 'photo' ? 90 : 95, smartSubsample: true });

try {
  await pipeline.toFile(temporary);
  await rm(output, { force: true });
  await rename(temporary, output);
} catch (error) {
  await rm(temporary, { force: true });
  throw error;
}

const metadata = await sharp(output).metadata();
if (metadata.exif || metadata.icc || metadata.xmp) throw new Error('输出仍包含元数据，已拒绝入库');
console.log(`已生成 ${output}（${metadata.width}×${metadata.height}，EXIF/GPS 已移除）`);
