export type Seed = [number, number, number];
export type Region = { id: number; area: number; x: number; y: number; number: number };
export type LabelPosition = { x: number; y: number };
export type RegionDiagnostics = { regionCount: number; paintablePixelCount: number; smallestRegionArea: number; largestRegionArea: number; tinyRegionCount: number; edgeConnectedRegionCount: number };
export type Segmentation = { width: number; height: number; ids: Int32Array; pixels: Uint8ClampedArray; regions: Region[]; diagnostics?: { tinyRegionCount: number; edgeConnectedRegionCount: number } };

/*
  Standard four-neighbor flood fill labels connected white pixels once.
  Painting reads this immutable map, so earlier fills cannot change boundaries.
*/
export function segmentPixels(pixels: Uint8ClampedArray, width: number, height: number, seeds: Seed[] = [], defaultNumber = 1): Segmentation {
  const count = width * height;
  const ids = new Int32Array(count).fill(-1);
  const queue = new Int32Array(count);
  const regions: Region[] = [];
  const centers: [number, number][] = [];
  const minRegionArea = Math.max(65, Math.round(count * 0.0006));
  let tinyRegionCount = 0;
  let edgeConnectedRegionCount = 0;
  for (let p = 0; p < count; p++) {
    if (Math.min(pixels[p * 4], pixels[p * 4 + 1], pixels[p * 4 + 2]) < 170) ids[p] = -2;
  }
  let nextId = 0;
  for (let start = 0; start < count; start++) {
    if (ids[start] !== -1) continue;
    let head = 0;
    let tail = 1;
    let sumX = 0;
    let sumY = 0;
    let hasEdge = false;
    queue[0] = start;
    ids[start] = nextId;
    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = Math.floor(p / width);
      sumX += x;
      sumY += y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) hasEdge = true;
      const neighbors = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
      for (const n of neighbors) {
        if (n >= 0 && ids[n] === -1) {
          ids[n] = nextId;
          queue[tail++] = n;
        }
      }
    }
    if (hasEdge || tail < minRegionArea) {
      if (hasEdge) edgeConnectedRegionCount++;
      else tinyRegionCount++;
      for (let i = 0; i < tail; i++) ids[queue[i]] = -2;
      continue;
    }
    const centerX = sumX / tail;
    const centerY = sumY / tail;
    let labelPixel = start;
    let nearest = Infinity;
    for (let i = 0; i < tail; i++) {
      const p = queue[i];
      const x = p % width;
      const y = Math.floor(p / width);
      if (x < 5 || y < 5 || x >= width - 5 || y >= height - 5) continue;
      if ([p - 4, p + 4, p - width * 4, p + width * 4].some((n) => ids[n] !== nextId)) continue;
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (distance < nearest) { nearest = distance; labelPixel = p; }
    }
    regions.push({ id: nextId, area: tail, x: labelPixel % width, y: Math.floor(labelPixel / width), number: defaultNumber });
    centers.push([centerX, centerY]);
    nextId++;
  }
  /*
    A two-pass distance transform keeps labels away from outlines, even when
    a crescent's mathematical center lies outside the actual region.
  */
  const clearance = new Uint16Array(count);
  for (let p = 0; p < count; p++) {
    if (ids[p] < 0) continue;
    clearance[p] = 1 + Math.min(p % width > 0 ? clearance[p - 1] : 0, p >= width ? clearance[p - width] : 0);
  }
  const maxClearance = new Uint16Array(regions.length);
  for (let p = count - 1; p >= 0; p--) {
    if (ids[p] < 0) continue;
    clearance[p] = Math.min(clearance[p], 1 + Math.min(p % width < width - 1 ? clearance[p + 1] : 0, p + width < count ? clearance[p + width] : 0));
    maxClearance[ids[p]] = Math.max(maxClearance[ids[p]], clearance[p]);
  }
  const labelScores = new Float64Array(regions.length).fill(Infinity);
  for (let p = 0; p < count; p++) {
    const id = ids[p];
    if (id < 0 || clearance[p] < Math.min(12, maxClearance[id])) continue;
    const x = p % width;
    const y = Math.floor(p / width);
    const score = (x - centers[id][0]) ** 2 + (y - centers[id][1]) ** 2;
    if (score < labelScores[id]) {
      labelScores[id] = score;
      regions[id].x = x;
      regions[id].y = y;
    }
  }
  for (const [x, y, number] of seeds) {
    const id = regionAt(ids, width, height, Math.round(x * width), Math.round(y * height));
    const region = regions.find((item) => item.id === id);
    if (region) region.number = number;
  }
  return { width, height, ids, pixels, regions, diagnostics: { tinyRegionCount, edgeConnectedRegionCount } };
}

export function analyzeRegions(segmentation: Segmentation): RegionDiagnostics {
  const areas = segmentation.regions.map((region) => region.area);
  return {
    regionCount: areas.length,
    paintablePixelCount: areas.reduce((sum, area) => sum + area, 0),
    smallestRegionArea: areas.length ? Math.min(...areas) : 0,
    largestRegionArea: areas.length ? Math.max(...areas) : 0,
    tinyRegionCount: segmentation.diagnostics?.tinyRegionCount ?? 0,
    edgeConnectedRegionCount: segmentation.diagnostics?.edgeConnectedRegionCount ?? 0,
  };
}

export function getRegionLabelPosition(segmentation: Segmentation, region: Region, labelPositions?: Record<number, LabelPosition>): LabelPosition {
  const position = labelPositions?.[region.id];
  if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
    const x = Math.round(position.x * segmentation.width);
    const y = Math.round(position.y * segmentation.height);
    if (x >= 0 && y >= 0 && x < segmentation.width && y < segmentation.height && segmentation.ids[y * segmentation.width + x] === region.id) return { x, y };
  }
  return { x: region.x, y: region.y };
}

export function regionAt(ids: Int32Array, width: number, height: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= width || y >= height) return -1;
  const direct = ids[y * width + x];
  if (direct >= 0) return direct;
  for (let radius = 1; radius <= 7; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && py >= 0 && px < width && py < height && ids[py * width + px] >= 0) return ids[py * width + px];
      }
    }
  }
  return -1;
}

export function paintPixels(segmentation: Segmentation, fills: Record<number, number>, palette: string[]): Uint8ClampedArray<ArrayBuffer> {
  const output = new Uint8ClampedArray(segmentation.pixels);
  const colors = palette.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  for (let p = 0; p < segmentation.ids.length; p++) {
    if (segmentation.ids[p] < 0) continue;
    const number = fills[segmentation.ids[p]];
    if (!number) continue;
    const color = colors[number - 1];
    if (!color) continue;
    output[p * 4] = color[0]; output[p * 4 + 1] = color[1]; output[p * 4 + 2] = color[2]; output[p * 4 + 3] = 255;
  }
  return output;
}

export function loadArtwork(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This picture couldn't be opened. Try a PNG or JPEG."));
    image.src = src;
  });
}

export async function prepareArtwork(src: string, seeds: Seed[], defaultNumber: number): Promise<Segmentation> {
  const image = await loadArtwork(src);
  const scale = Math.min(1, 720 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser couldn't start the paint canvas.");
  context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return segmentPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, seeds, defaultNumber);
}
