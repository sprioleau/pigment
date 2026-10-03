import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { POST } from "./route";

function makeRequest(image: string, name = "picture"): Request {
  const form = new FormData();
  form.set("image", image);
  form.set("name", name);
  return new Request("http://localhost/api/export", { method: "POST", body: form });
}

describe("PNG export", () => {
  it("downloads the exact canvas PNG with a safe filename and download headers", async () => {
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#F8AED2" } }).png().toBuffer();
    const response = await POST(makeRequest(`data:image/png;base64,${bytes.toString("base64")}`, '../Rose "picture"\r\n.png'));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="pigment-Rosepicturepng.png"');
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });

  it("returns a friendly error for a malformed form instead of throwing", async () => {
    for (const contentType of ["application/json", "multipart/form-data; boundary=missing"]) {
      const response = await POST(new Request("http://localhost/api/export", { method: "POST", headers: { "content-type": contentType }, body: "not a form" }));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Choose a valid PNG picture");
    }
  });

  it("rejects forged PNG data, truncated signatures, and malformed base64", async () => {
    for (const image of [
      `data:image/png;base64,${Buffer.alloc(32).toString("base64")}`,
      `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64")}`,
      "data:image/png;base64,A===",
      "data:image/jpeg;base64,AAAA",
    ]) {
      expect((await POST(makeRequest(image))).status).toBe(400);
    }
  });

  it("caps an actual request body even when content-length is absent or understated", async () => {
    for (const headers of [new Headers(), new Headers({ "content-length": "1" })]) {
      const response = await POST(new Request("http://localhost/api/export", { method: "POST", headers, body: "x".repeat(2_000_001) }));
      expect(response.status).toBe(413);
    }
  });

  it("rejects an oversized declared body before reading it", async () => {
    const response = await POST(new Request("http://localhost/api/export", { method: "POST", headers: { "content-length": "2000001" }, body: "small" }));
    expect(response.status).toBe(413);
  });
});
