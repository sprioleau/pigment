import sharp from "sharp";
import { segmentPixels, regionAt } from "../src/lib/paint-engine.ts";
import { PICTURES } from "../src/lib/pictures.ts";

for (const picture of PICTURES) {
  const { data, info } = await sharp(`public${picture.image}`).resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const segmentation = segmentPixels(new Uint8ClampedArray(data), info.width, info.height, picture.seeds, picture.defaultNumber);
  const assigned = new Map();
  const conflicts = [];
  for (const seed of picture.seeds) {
    const id = regionAt(segmentation.ids, info.width, info.height, Math.round(seed[0] * info.width), Math.round(seed[1] * info.height));
    const old = assigned.get(id);
    if (old && old[2] !== seed[2]) conflicts.push({ id, old, seed });
    assigned.set(id, seed);
  }
  console.log(JSON.stringify({ picture: picture.id, regions: segmentation.regions.length, conflicts }, null, 2));
}
