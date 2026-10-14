import path from "node:path";
import { realpath, stat } from "node:fs/promises";

export function within(root, target) {
  const rel = path.relative(root, target);
  return (
    rel === "" ||
    (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel))
  );
}
export function trustedRequest(req, trustedHosts = []) {
  try {
    const host = new URL(`http://${req.headers.host}`);
    const loopback =
      host.hostname === "localhost" ||
      host.hostname === "[::1]" ||
      /^127(?:\.\d{1,3}){3}$/.test(host.hostname);
    if (!loopback && !trustedHosts.includes(host.hostname)) return false;
    if (["cross-site", "same-site"].includes(req.headers["sec-fetch-site"]))
      return false;
    const origin = req.headers.origin;
    if (origin !== undefined) {
      const o = new URL(origin);
      if (!["http:", "https:"].includes(o.protocol) || o.host !== host.host)
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
export async function authorizedPath(
  file,
  roots,
  { allowMissing = false, allowRoot = false } = {},
) {
  if (typeof file !== "string" || !path.isAbsolute(file) || file.includes("\0"))
    throw Object.assign(new Error("Absolute indexed path required"), {
      status: 403,
    });
  const absolute = path.resolve(file);
  for (const root of roots) {
    const canonicalRoot = await realpath(root).catch(() => null);
    if (
      !canonicalRoot ||
      !within(canonicalRoot, absolute) ||
      (!allowRoot && absolute === canonicalRoot)
    )
      continue;
    let resolved;
    try {
      resolved = await realpath(absolute);
    } catch (e) {
      if (!allowMissing || e.code !== "ENOENT") throw e;
      // Resolve the nearest existing ancestor, so missing paths cannot tunnel through symlinks.
      let parent = path.dirname(absolute);
      while (parent !== path.dirname(parent)) {
        try {
          resolved = await realpath(parent);
          break;
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          parent = path.dirname(parent);
        }
      }
    }
    if (resolved && within(canonicalRoot, resolved)) {
      if (!allowMissing) {
        const info = await stat(absolute);
        if (!info.isFile())
          throw Object.assign(new Error("Only regular files are supported"), {
            status: 403,
          });
      }
      return absolute;
    }
  }
  throw Object.assign(
    new Error(
      "Path is outside registered workspaces or resolves through an external symlink",
    ),
    { status: 403 },
  );
}
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2]) || size === 0)
    throw Object.assign(new Error("Invalid byte range"), { status: 416 });
  let start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  let end = m[1] ? (m[2] ? Number(m[2]) : size - 1) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start >= size ||
    start > end ||
    end < 0
  )
    throw Object.assign(new Error("Unsatisfiable byte range"), { status: 416 });
  return { start, end: Math.min(end, size - 1) };
}
export const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".mov": "video/quicktime",
};
export const PREVIEW_CSP =
  "default-src 'none'; img-src data:; media-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; sandbox";
