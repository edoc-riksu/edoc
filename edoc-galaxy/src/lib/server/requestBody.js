// Plan Day 43: read a JSON request body with a size cap, so a huge or broken
// body is turned away with a clear 413 or 400 instead of being parsed in full
// or ending in a 500.

export async function readJsonBody(request, { maxBytes }) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large." };
  }

  let text;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, error: "Malformed request body." };
  }
  // The header can be missing or wrong, so check what actually arrived too.
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large." };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Malformed request body." };
  }
}
