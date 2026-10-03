import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { segmentPixels, paintPixels, regionAt } from "./paint-engine";
import { PICTURES } from "./pictures";

function makeDividedPage(): Uint8ClampedArray {
  const width = 60;
  const height = 40;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 3; y <= 36; y++) {
    for (let x = 3; x <= 56; x++) {
      if (y === 3 || y === 36 || x === 3 || x === 30 || x === 56) {
        const p = (y * width + x) * 4;
        pixels[p] = 0; pixels[p + 1] = 0; pixels[p + 2] = 0;
      }
    }
  }
  return pixels;
}

function rgbAt(pixels: Uint8ClampedArray, x: number, y: number): number[] {
  return Array.from(pixels.slice((y * 60 + x) * 4, (y * 60 + x) * 4 + 3));
}

describe("region painting", () => {
  it("fills an enclosed area without crossing the divider or altering surrounding paper", () => {
    const page = segmentPixels(makeDividedPage(), 60, 40, [[.2, .5, 1], [.8, .5, 2]]);
    const left = regionAt(page.ids, 60, 40, 15, 20);
    const output = paintPixels(page, { [left]: 1 }, ["#FF0000", "#0000FF"]);
    expect(page.regions).toHaveLength(2);
    expect(rgbAt(output, 15, 20)).toEqual([255, 0, 0]);
    expect(rgbAt(output, 45, 20)).toEqual([255, 255, 255]);
    expect(rgbAt(output, 30, 20)).toEqual([0, 0, 0]);
    expect(rgbAt(output, 1, 1)).toEqual([255, 255, 255]);
  });

  it("supports repainting and undo from the same boundary map without accumulating old colors", () => {
    const page = segmentPixels(makeDividedPage(), 60, 40);
    const id = regionAt(page.ids, 60, 40, 15, 20);
    paintPixels(page, { [id]: 1 }, ["#FF0000", "#0000FF"]);
    expect(rgbAt(paintPixels(page, { [id]: 2 }, ["#FF0000", "#0000FF"]), 15, 20)).toEqual([0, 0, 255]);
    expect(rgbAt(paintPixels(page, {}, ["#FF0000"]), 15, 20)).toEqual([255, 255, 255]);
  });

  it("rejects taps outside the image while allowing a near-outline tap to reach an area", () => {
    const page = segmentPixels(makeDividedPage(), 60, 40);
    expect(regionAt(page.ids, 60, 40, -1, 20)).toBe(-1);
    expect(regionAt(page.ids, 60, 40, 60, 20)).toBe(-1);
    expect(regionAt(page.ids, 60, 40, 3, 20)).toBeGreaterThanOrEqual(0);
  });

  it("preserves outlines and surrounding paper even if a saved fill targets a nonpaintable area", () => {
    const page = segmentPixels(makeDividedPage(), 60, 40);
    const output = paintPixels(page, { [-2]: 1 }, ["#FF0000"]);
    expect(rgbAt(output, 30, 20)).toEqual([0, 0, 0]);
    expect(rgbAt(output, 1, 1)).toEqual([255, 255, 255]);
  });

  it("places a number inside a curved region whose center falls in its hole", () => {
    const width = 60;
    const height = 60;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const radius = Math.hypot(x - 30, y - 30);
        if (radius < 15 || radius > 24) {
          const p = (y * width + x) * 4;
          pixels[p] = 0; pixels[p + 1] = 0; pixels[p + 2] = 0;
        }
      }
    }
    const page = segmentPixels(pixels, width, height);
    expect(page.regions).toHaveLength(1);
    const region = page.regions[0];
    const radius = Math.hypot(region.x - 30, region.y - 30);
    expect(radius).toBeGreaterThan(15);
    expect(radius).toBeLessThan(24);
  });
});

for (const picture of PICTURES) {
  it(`${picture.title} has enclosed regions and no conflicting color assignments`, async () => {
    const { data, info } = await sharp(`public${picture.image}`).resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const page = segmentPixels(new Uint8ClampedArray(data), info.width, info.height, picture.seeds, picture.defaultNumber);
    expect(page.regions.length).toBeGreaterThan(10);
    const assigned = new Map<number, number>();
    for (const [x, y, number] of picture.seeds) {
      const id = regionAt(page.ids, info.width, info.height, Math.round(x * info.width), Math.round(y * info.height));
      expect(id, `Color ${number} at ${x},${y} must land inside a region`).toBeGreaterThanOrEqual(0);
      if (assigned.has(id)) expect(number, `Region ${id} cannot require two different buckets`).toBe(assigned.get(id));
      assigned.set(id, number);
    }
    for (const region of page.regions) {
      expect(region.number).toBeGreaterThanOrEqual(1);
      expect(region.number).toBeLessThanOrEqual(picture.palette.length);
    }
  });
}
