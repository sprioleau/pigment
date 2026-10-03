import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });
const input = "public/logo.png";
for (const [size, path] of [[64, "src/app/icon.png"], [180, "src/app/apple-icon.png"], [192, "public/icons/icon-192.png"], [512, "public/icons/icon-512.png"]]) {
  await sharp(input).resize(size, size, { fit: "contain" }).flatten({ background: "#fff7e7" }).png().toFile(path);
}
const safeLogo = await sharp(input).resize(384, 384, { fit: "contain" }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#fff7e7" } }).composite([{ input: safeLogo, left: 64, top: 64 }]).png().toFile("public/icons/icon-maskable-512.png");
const faviconPng = await sharp(input).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 32; header[7] = 32;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(faviconPng.length, 14); header.writeUInt32LE(22, 18);
await writeFile("src/app/favicon.ico", Buffer.concat([header, faviconPng]));
console.log("Generated favicon, Apple icon, and normal/maskable app icons.");
