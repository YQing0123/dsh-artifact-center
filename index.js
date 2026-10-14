import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat, open } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import Schema from "@deepseek-ai/schemastery";
import { ArtifactIndex, DEFAULTS, READABLE_EXTENSIONS } from "./core.js";
import {
  trustedRequest,
  authorizedPath,
  parseRange,
  MIME,
  PREVIEW_CSP,
} from "./security.js";

export const name = "artifact-center";
export const inject = ["webServer"];
export const Config = Schema.object({
  ignorePatterns: Schema.array(Schema.string()).default(
    DEFAULTS.ignorePatterns,
  ),
  burstThreshold: Schema.number().min(1).default(500),
  maxIndexedFiles: Schema.number().min(1).default(50000),
  previewMaxBytes: Schema.number().min(1024).default(DEFAULTS.previewMaxBytes),
  textMaxBytes: Schema.number().min(1024).default(DEFAULTS.textMaxBytes),
  backfillOnStart: Schema.boolean().default(true),
  snapshotOnTurnEnd: Schema.boolean().default(true),
  enableBetterSidebar: Schema.boolean().default(false),
  validationIntervalMs: Schema.number().min(10000).default(300000),
  trustedHosts: Schema.array(Schema.string()).default([]),
  readableExtensions: Schema.array(Schema.string()).default(READABLE_EXTENSIONS),
  autoTags: Schema.array(
    Schema.object({
      name: Schema.string(),
      kind: Schema.union(["glob", "ext", "session"]),
      value: Schema.string(),
    }),
  ).default(DEFAULTS.autoTags),
});
const artifactSchema = z.object({
  id: z.string(), path: z.string(), workspaceId: z.string(), name: z.string(),
  source: z.enum(["present", "write", "edit", "snapshot", "manual"]),
  lastSeenAt: z.number(),
}).passthrough();
const snapshotSchema = z.object({
  entries: z.record(z.string(), z.tuple([z.number(), z.number()])),
  takenAt: z.number(), truncated: z.boolean(), warnings: z.array(z.string()),
});
export const domainSpec = {
  name: "artifact_center",
  version: 2,
  compatibleVersions: [1],
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  tables: {
    artifacts: { valueSchema: artifactSchema },
    provenance: {
      valueSchema: z.object({ record: artifactSchema, hidden: z.boolean().default(false) }),
    },
    active_turns: {
      valueSchema: z.object({
        workspaceId: z.string(), sessionId: z.string(), cwd: z.string(),
        turn: z.number(), baseline: snapshotSchema,
      }),
    },
    cursors: {
      valueSchema: z.object({ seq: z.number(), updatedAt: z.number() }),
    },
    snapshots: { valueSchema: snapshotSchema },
  },
};
const cleanJSON = (value) => JSON.parse(JSON.stringify(value));
function send(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(value));
}
async function body(req) {
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json"))
    throw Object.assign(new Error("JSON request required"), { status: 415 });
  const buffers = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536)
      throw Object.assign(new Error("Request too large"), { status: 413 });
    buffers.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(buffers).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}
export function trashCommand(file, platform = process.platform) {
  if (platform === "darwin")
    return [
      "osascript",
      "-e",
      'on run argv\n set targetFile to POSIX file (item 1 of argv) as alias\n tell application "Finder" to delete targetFile\nend run',
      file,
    ];
  if (platform === "linux") return ["gio", "trash", "--", file];
  if (platform === "win32") {
    const encoded = Buffer.from(file, "utf8").toString("base64");
    return [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Add-Type -AssemblyName Microsoft.VisualBasic; $p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')); [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin','ThrowException')`,
    ];
  }
  throw new Error("System trash is not supported on this platform");
}
export async function moveToTrash(record, roots, subprocess, signal) {
  if (record.burst)
    throw new Error(
      "Batch summaries cannot be deleted; select individual files",
    );
  if (!subprocess) throw new Error("subprocess service unavailable");
  const file = await authorizedPath(record.path, roots);
  const argv = trashCommand(file);
  const handle = subprocess.spawn({
    argv,
    cwd: path.dirname(file),
    stdio: {
      stdin: "ignore",
      stdout: { maxBytes: 4096 },
      stderr: { maxBytes: 16384 },
    },
    graceMs: 5000,
    signal,
  });
  const result = await handle.done;
  if (result.exitCode !== 0)
    throw new Error(
      handle.collected.stderr?.readFrom(0).text ||
        `Trash command exited ${result.exitCode}`,
    );
  const remains = await stat(file).then(
    () => true,
    (e) => {
      if (e.code === "ENOENT") return false;
      throw e;
    },
  );
  if (remains)
    throw new Error("Trash command completed but the source file still exists");
}
export function searchTool(index, ready = Promise.resolve()) {
  return {
    name: "artifact_search",
    description:
      "Search files produced by DSH conversations across registered workspaces. Matches file names, paths, conversation titles, descriptions and bounded text content. Returns metadata and absolute paths; version entries describe provenance, not saved historical file contents. Missing and trashed files are labeled.",
    parameters: {
      query: { type: "string", required: true },
      workspace: { type: "string" },
      type: { type: "string" },
      tag: { type: "string" },
      since: { type: "string" },
      limit: { type: "integer" },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      await (typeof ready==='function'?ready():ready);
      exec.signal?.throwIfAborted();
      const filter = z
        .object({
          query: z.string().max(500),
          workspace: z.string().optional(),
          type: z.string().optional(),
          tag: z.string().optional(),
          since: z.string().datetime({ offset: true }).optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
        .parse(args);
      const result = await index.search({
        ...filter,
        content: true,
        limit: filter.limit ?? 20,
        signal: exec.signal,
      });
      exec.signal?.throwIfAborted();
      return cleanJSON({
        ...result,
        status: index.status.phase,
        message: result.total
          ? "Matched indexed artifacts"
          : "No matching indexed artifacts",
      });
    },
  };
}
export function apply(ctx, config = {}) {
  const services = { logger: ctx.logger };
  for (const key of ["workspaceRegistry", "sessionQuery", "subprocess"])
    Object.defineProperty(services, key, { get: () => ctx.get(key) });
  const index = new ArtifactIndex(services, config),
    controller = new AbortController();
  let ready = Promise.resolve(),
    initialized = false;
  ctx.effect(
    () => () => {
      controller.abort();
      return index.dispose();
    },
    "artifact-center: lifecycle",
  );
  // Wait only this optional subsystem for storage/history; HTTP diagnostics mount immediately.
  ctx.inject(
    ["sessionQuery", "workspaceRegistry"],
    async (subctx) => {
      if (initialized) return;
      initialized = true;
      ready = (async () => {
        let domain;
        try {
          const storage = subctx.get("storageDomain");
          if (storage) domain = await storage.open(domainSpec);
          else index.warn("storageDomain unavailable; using an in-memory index");
        } catch (e) {
          index.warn(e);
        }
        try {
          await index.init(domain);
          if (!domain) index.status.phase = "degraded";
        } catch (e) {
          index.warn(e);
          index.status.phase = "degraded";
        }
      })();
      await ready;
      if (index.config.backfillOnStart)
        index.enqueue(() => index.backfill()).catch(() => {});
    },
  );
  ctx.effect(
    () =>
      ctx.on("session/event", (session, event) => {
        if (
          ![
            "tool/call",
            "deliverables/presented",
            "turn/start",
            "turn/end",
            "session/title",
          ].includes(event.type)
        )
          return;
        index
          .enqueue(async () => {
            await ready;
            await index.handleEvent(session, event);
          })
          .catch(() => {});
      }),
    "artifact-center: session events",
  );
  ctx.effect(() => {
    const timer = setInterval(
      () => index.enqueue(() => index.validate()).catch(() => {}),
      index.config.validationIntervalMs,
    );
    timer.unref?.();
    return () => clearInterval(timer);
  }, "artifact-center: validation");
  ctx.inject(["tools"], (toolctx) => {
    try {
      toolctx.effect(
        () => toolctx.tools.register(searchTool(index, () => ready)),
        "artifact-center: Agent search",
      );
    } catch (e) {
      index.warn(e);
    }
  });
  function authorized(req, res) {
    if (!trustedRequest(req, index.config.trustedHosts)) {
      send(res, 403, {
        error: "Cross-origin or untrusted Host request rejected",
      });
      return false;
    }
    const connection = ctx.get("connection");
    if (!connection?.requestRejection) {
      send(res, 503, { error: "Host authentication service unavailable" });
      return false;
    }
    const rejected = connection.requestRejection(req);
    if (rejected !== undefined) {
      send(res, rejected, { error: "Host authentication required" });
      return false;
    }
    return true;
  }
  async function recordFor(id) {
    await index.refreshWorkspaces();
    const record = index.records.get(id);
    if (!record)
      throw Object.assign(new Error("Artifact not found"), { status: 404 });
    const roots = index.workspaces
      .filter((w) => w.id === record.workspaceId)
      .map((w) => w.path);
    if (!roots.length)
      throw Object.assign(new Error("Workspace is no longer registered"), {
        status: 403,
      });
    await authorizedPath(record.path, roots, {
      allowMissing: false,
      allowRoot: record.burst,
    });
    return { record, roots };
  }
  const wrap = (handler) => async (req, res) => {
    if (!authorized(req, res)) return;
    try {
      await handler(req, res);
    } catch (e) {
      if (res.headersSent) {
        res.destroy(e);
        return;
      }
      send(res, e.status ?? (e.code === "ENOENT" ? 404 : 400), {
        error: e.message,
      });
    }
  };
  const routes = [
    {
      kind: "prefix",
      path: "/artifact-center/api",
      handler: wrap(async (req, res) => {
        const url = new URL(req.url, "http://localhost"),
          action = url.pathname.slice("/artifact-center/api/".length);
        if (req.method === "GET") {
          if (action === "status") return send(res, 200, index.state());
          if (action === "list") {
            const filter = Object.fromEntries(url.searchParams);
            filter.content = filter.content === "true";
            filter.starred = filter.starred === "true";
            filter.missing = filter.missing === "true";
            filter.trashed = filter.trashed === "true";
            if (url.searchParams.getAll("tag").length > 1)
              filter.tag = url.searchParams.getAll("tag");
            return send(res, 200, await index.search(filter));
          }
          if (action === "text") {
            const { record } = await recordFor(url.searchParams.get("id"));
            if ((record.size ?? 0) > index.config.previewMaxBytes)
              throw new Error("File exceeds preview limit");
            return send(res, 200, {
              text: await index.text(record),
              truncated: (record.size ?? 0) > index.config.textMaxBytes,
            });
          }
          if (action === "applications") {
            const { record } = await recordFor(url.searchParams.get("id"));
            const desktop = ctx.get("sessionController");
            if (desktop?.workspacePathApplications)
              return send(
                res,
                200,
                await desktop.workspacePathApplications(
                  { path: record.path },
                  controller.signal,
                ),
              );
            const native = await import("@deepseek-ai/dsh-native-command");
            return send(
              res,
              200,
              await native.nativeFileApplications(
                record.path,
                controller.signal,
              ),
            );
          }
        }
        if (req.method !== "POST") {
          res.setHeader("allow", "GET, POST");
          return send(res, 405, { error: "Method not allowed" });
        }
        const data = await body(req);
        if (action === "refresh") {
          index
            .enqueue(async () => {
              await index.backfill();
              await index.validate();
            })
            .catch(() => {});
          return send(res, 202, { queued: true });
        }
        if (action === "validate") {
          await index.enqueue(() => index.validate());
          return send(res, 200, index.state());
        }
        if (action === "clean-missing") {
          if (data.confirm !== true) throw new Error("Confirmation required");
          return send(res, 200, {
            removed: await index.enqueue(() => index.cleanMissing()),
          });
        }
        if (action === "patch")
          return send(
            res,
            200,
            await index.enqueue(() => index.patch(data.id, data.patch ?? {})),
          );
        if (action === "trash") {
          if (
            data.confirm !== true ||
            !Array.isArray(data.ids) ||
            !data.ids.length ||
            data.ids.length > 100
          )
            throw new Error("Confirm one to 100 selected artifacts");
          const results = [];
          await index.enqueue(async () => {
            for (const id of [...new Set(data.ids)]) {
              try {
                const { record, roots } = await recordFor(id);
                await moveToTrash(
                  record,
                  roots,
                  services.subprocess,
                  controller.signal,
                );
                await index.markTrashed(id);
                results.push({ id, ok: true });
              } catch (e) {
                results.push({ id, ok: false, error: e.message });
              }
            }
          });
          return send(res, 200, { results });
        }
        if (action === "open") {
          const { record } = await recordFor(data.id),
            desktop = ctx.get("sessionController");
          if (desktop?.openWorkspacePath)
            await desktop.openWorkspacePath(
              {
                path: record.path,
                ...(data.action === "reveal" ? { action: "reveal" } : {}),
                ...(data.application
                  ? { application: String(data.application) }
                  : {}),
              },
              controller.signal,
            );
          else {
            const native = await import("@deepseek-ai/dsh-native-command");
            if (data.action === "reveal")
              await native.revealNativePath(record.path, controller.signal);
            else if (data.application)
              await native.openNativeFileApplication(
                record.path,
                String(data.application),
                controller.signal,
              );
            else
              await native.openNativeAssociatedPath(
                record.path,
                controller.signal,
              );
          }
          return send(res, 200, { ok: true });
        }
        send(res, 404, { error: "Unknown operation" });
      }),
    },
    {
      kind: "exact",
      path: "/artifact-center/file",
      handler: wrap(async (req, res) => {
        if (!["GET", "HEAD"].includes(req.method)) {
          send(res, 405, { error: "Method not allowed" });
          return;
        }
        const url = new URL(req.url, "http://localhost"),
          { record } = await recordFor(url.searchParams.get("id"));
        const file = await open(record.path, "r");
        try {
          const info = await file.stat();
          if (!info.isFile()) throw new Error("Regular file required");
          if (
            info.size > index.config.previewMaxBytes &&
            record.kind !== "media"
          )
            throw Object.assign(new Error("File exceeds preview limit"), {
              status: 413,
            });
          let range;
          try {
            range = parseRange(req.headers.range, info.size);
          } catch (e) {
            res.setHeader("content-range", `bytes */${info.size}`);
            throw e;
          }
          const mime = MIME[record.ext] ?? "text/plain; charset=utf-8";
          const headers = {
            "content-type": mime,
            "content-length": range ? range.end - range.start + 1 : info.size,
            "accept-ranges": "bytes",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            "content-security-policy": PREVIEW_CSP,
            "referrer-policy": "no-referrer",
            "cross-origin-resource-policy": "same-origin",
          };
          if (range)
            headers["content-range"] =
              `bytes ${range.start}-${range.end}/${info.size}`;
          res.writeHead(range ? 206 : 200, headers);
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          await pipeline(
            file.createReadStream({
              start: range?.start ?? 0,
              ...(range ? { end: range.end } : {}),
              autoClose: false,
            }),
            res,
          );
        } finally {
          await file.close();
        }
      }),
    },
    {
      kind: "prefix",
      path: "/artifact-center/vendor",
      handler: wrap(async (req, res) => {
        if (!["GET", "HEAD"].includes(req.method))
          return send(res, 405, { error: "Method not allowed" });
        const pathname = new URL(req.url, "http://localhost").pathname,
          filename = pathname.slice("/artifact-center/vendor/".length);
        if (
          !/^(markdown-it\.min\.js|purify\.min\.js|mermaid\.min\.js)$/.test(
            filename,
          )
        )
          return send(res, 404, { error: "Unknown renderer" });
        const file = await open(
          path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            "vendor",
            filename,
          ),
          "r",
        );
        try {
          res.writeHead(200, {
            "content-type": "text/javascript; charset=utf-8",
            "x-content-type-options": "nosniff",
            "cache-control": "private, max-age=3600",
          });
          if (req.method === "HEAD") res.end();
          else await pipeline(file.createReadStream({ autoClose: false }), res);
        } finally {
          await file.close();
        }
      }),
    },
  ];
  for (const route of routes)
    try {
      ctx.effect(
        () => ctx.webServer.register(route),
        `artifact-center: ${route.path}`,
      );
    } catch (e) {
      index.warn(e);
    }
}
