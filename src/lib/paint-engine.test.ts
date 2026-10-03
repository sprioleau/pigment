import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { analyzeRegions, getRegionLabelPosition, segmentPixels, paintPixels, regionAt } from "./paint-engine";
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

  it("uses a custom number position only when it stays inside the correct area", () => {
    const page = segmentPixels(makeDividedPage(), 60, 40);
    const region = page.regions.find((item) => item.id === regionAt(page.ids, 60, 40, 15, 20))!;
    expect(getRegionLabelPosition(page, region, { [region.id]: { x: .2, y: .4 } })).toEqual({ x: 12, y: 16 });
    for (const position of [{ x: .8, y: .4 }, { x: -1, y: .5 }, { x: NaN, y: .5 }]) {
      expect(getRegionLabelPosition(page, region, { [region.id]: position })).toEqual({ x: region.x, y: region.y });
    }
  });

  it("reports paintable areas separately from discarded tiny and edge-connected white areas", () => {
    const pixels = makeDividedPage();
    for (let y = 8; y <= 12; y++) {
      for (let x = 8; x <= 12; x++) {
        if (y === 8 || y === 12 || x === 8 || x === 12) {
          const p = (y * 60 + x) * 4;
          pixels[p] = 0; pixels[p + 1] = 0; pixels[p + 2] = 0;
        }
      }
    }
    const diagnostics = analyzeRegions(segmentPixels(pixels, 60, 40));
    expect(diagnostics.regionCount).toBe(2);
    expect(diagnostics.tinyRegionCount).toBe(1);
    expect(diagnostics.edgeConnectedRegionCount).toBe(1);
    expect(diagnostics.paintablePixelCount).toBeGreaterThan(1000);
    expect(diagnostics.smallestRegionArea).toBeGreaterThan(65);
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

it("colors Clover Cow's sky blue and surrounding ground green without changing its cream body", async () => {
  const picture = PICTURES.find((item) => item.id === "cow")!;
  const { data, info } = await sharp(`public${picture.image}`).resize({ width: 720, height: 720, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const page = segmentPixels(new Uint8ClampedArray(data), info.width, info.height, picture.seeds, picture.defaultNumber);
  for (const [x, y, expected] of [[.476,.075,3],[.843,.263,3],[.760,.253,3],[.663,.268,3],[.935,.546,3],[.822,.769,2],[.368,.94,2],[.60,.58,4]]) {
    const id = regionAt(page.ids, info.width, info.height, Math.round(x * info.width), Math.round(y * info.height));
    expect(page.regions.find((region) => region.id === id)?.number).toBe(expected);
  }
});
