export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) return new Response("Picture is too large", { status: 413 });
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response("Choose a valid PNG picture", { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.length;
      if (length > 2_000_000) {
        await reader.cancel();
        return new Response("Picture is too large", { status: 413 });
      }
      chunks.push(result.value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return new Response("Choose a valid PNG picture", { status: 400 });
  }
  const image = form.get("image");
  const name = form.get("name");
  if (typeof image !== "string" || image.length > 1_800_000 || !/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image)) {
    return new Response("Choose a valid PNG picture", { status: 400 });
  }
  const bytes = Buffer.from(image.slice("data:image/png;base64,".length), "base64");
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return new Response("Invalid PNG picture", { status: 400 });
  }
  const safeName = (typeof name === "string" ? name : "picture").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "picture";
  return new Response(bytes, { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="pigment-${safeName}.png"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
