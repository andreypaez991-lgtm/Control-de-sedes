import { FilterType } from '../types';

export interface FilterOptions {
  filter: FilterType;
  brightness: number; // -50 to +50
  contrast: number;   // 0.8 to 1.8
}

/**
 * Apply CamScanner-style filters to an image using Canvas
 */
export async function processImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: FilterOptions
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context not available');

  // Max dimension limit for mobile memory efficiency (e.g. max 1600px width/height)
  let width = imageSource.width;
  let height = imageSource.height;
  const maxDim = 1600;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // Draw source image
  ctx.drawImage(imageSource, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  const { filter, brightness, contrast } = options;

  // Pre-calculate contrast factor
  // contrast typically ranges 0.8 to 1.8 (1.0 = normal)
  const factor = contrast;

  // Process pixels based on filter
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Apply brightness (-50 to +50)
    if (brightness !== 0) {
      r = Math.min(255, Math.max(0, r + brightness));
      g = Math.min(255, Math.max(0, g + brightness));
      b = Math.min(255, Math.max(0, b + brightness));
    }

    // 2. Apply contrast (0.8 to 1.8)
    if (factor !== 1.0) {
      r = Math.min(255, Math.max(0, ((r - 128) * factor) + 128));
      g = Math.min(255, Math.max(0, ((g - 128) * factor) + 128));
      b = Math.min(255, Math.max(0, ((b - 128) * factor) + 128));
    }

    // 3. Specific Filter Logic
    switch (filter) {
      case 'magic_color':
      case 'camscanner': {
        // ✨ Realce Color (CamScanner style):
        // Detect background (grayish/cream) and whiten it,
        // while preserving saturated colors (blue ballpoint pens, red stamps, green approval marks)
        // and darkening black/gray pencil/pen ink.
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (chroma > 26) {
          // It's a colored pen, stamp, or highlighter!
          // Enhance saturation and keep vibrant
          r = Math.min(255, r * 1.15);
          g = Math.min(255, g * 1.15);
          b = Math.min(255, b * 1.15);
        } else if (lum > 145) {
          // Paper background - push cleanly towards bright white
          const whiteRatio = (lum - 145) / (255 - 145);
          const boost = Math.pow(whiteRatio, 0.65) * 80;
          r = Math.min(255, r + boost);
          g = Math.min(255, g + boost);
          b = Math.min(255, b + boost);
        } else {
          // Dark ink / pencil text - deepen for crisp readability
          r = Math.max(0, r * 0.72);
          g = Math.max(0, g * 0.72);
          b = Math.max(0, b * 0.72);
        }
        break;
      }

      case 'bw_sharp': {
        // 📄 B/N Nítido (Sharp high contrast monochrome)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Adaptive cutoff
        const threshold = 138;
        const val = lum < threshold ? 0 : 255;
        r = val;
        g = val;
        b = val;
        break;
      }

      case 'grayscale': {
        // Escala de Grises: balanced luminance with sharp gamma
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Slight S-curve for punchy document contrast
        const normalized = lum / 255;
        const enhanced = Math.pow(normalized, 1.1) * 255;
        r = enhanced;
        g = enhanced;
        b = enhanced;
        break;
      }

      case 'original':
      default:
        // No additional filter
        break;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // Return high quality JPEG base64
  return canvas.toDataURL('image/jpeg', 0.88);
}
