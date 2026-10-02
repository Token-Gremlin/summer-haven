/** Preserve cutout coverage across mip levels instead of letting thin leaves disappear. */
export function alphaCoverage(pixels: Uint8ClampedArray, threshold = 0.38) {
  let covered = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] / 255 >= threshold) covered++;
  return covered / (pixels.length / 4);
}
export function preserveLeafCoverage(pixels: Uint8ClampedArray, target: number, threshold = 0.38) {
  let low = 0,
    high = 12;
  for (let step = 0; step < 14; step++) {
    const scale = (low + high) / 2;
    let covered = 0;
    for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] * scale) / 255 >= threshold) covered++;
    if (covered / (pixels.length / 4) < target) low = scale;
    else high = scale;
  }
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = Math.min(255, Math.round(pixels[i] * high));
}
export function leafMipmaps(image: HTMLImageElement) {
  const base = document.createElement('canvas');
  base.width = image.width;
  base.height = image.height;
  const context = base.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  const target = alphaCoverage(context.getImageData(0, 0, base.width, base.height).data);
  const levels = [base];
  while (levels.at(-1)!.width > 1 || levels.at(-1)!.height > 1) {
    const prior = levels.at(-1)!,
      next = document.createElement('canvas');
    next.width = Math.max(1, prior.width >> 1);
    next.height = Math.max(1, prior.height >> 1);
    const ctx = next.getContext('2d', { willReadFrequently: true })!;
    // Sample the original to avoid multiplying an earlier level's alpha correction.
    ctx.drawImage(base, 0, 0, next.width, next.height);
    const pixels = ctx.getImageData(0, 0, next.width, next.height);
    preserveLeafCoverage(pixels.data, target);
    ctx.putImageData(pixels, 0, 0);
    levels.push(next);
  }
  return levels;
}
