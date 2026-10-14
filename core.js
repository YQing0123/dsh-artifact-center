import path from "node:path";
import { createHash } from "node:crypto";
import { readdir, stat, realpath, open } from "node:fs/promises";
import { authorizedPath, within } from "./security.js";

export const DEFAULTS = {
  ignorePatterns: [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "target",
    ".cache",
    ".dsh",
    ".overflow-diagnostic-*",
  ],
  burstThreshold: 500,
  maxIndexedFiles: 50000,
  previewMaxBytes: 20 * 1024 * 1024,
  textMaxBytes: 1024 * 1024,
  backfillOnStart: true,
  snapshotOnTurnEnd: true,
  enableBetterSidebar: false,
  validationIntervalMs: 300000,
  trustedHosts: [],
  autoTags: [{ name: "交付物", kind: "glob", value: "outputs/**" }],
  readableExtensions: [],
};
const KINDS = {
  doc: ["pdf", "doc", "docx", "md", "txt", "rtf", "odt"],
  sheet: ["xls", "xlsx", "ods"],
  slide: ["ppt", "pptx", "odp"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"],
  web: ["html", "htm"],
  data: ["csv", "tsv", "json", "yaml", "yml", "xml", "sql"],
  code: [
    "js",
    "ts",
    "tsx",
    "jsx",
    "py",
    "java",
    "go",
    "rs",
    "c",
    "cpp",
    "h",
    "css",
    "sh",
    "mmd",
  ],
  media: ["mp4", "webm", "mov", "mp3", "wav", "ogg", "flac", "m4a"],
  archive: ["zip", "tar", "gz", "7z", "rar"],
};
export const READABLE_EXTENSIONS = Object.values(KINDS).flat();
export const kindOf = (file) =>
  Object.entries(KINDS).find(([, exts]) =>
    exts.includes(path.extname(file).slice(1).toLowerCase()),
  )?.[0] ?? "other";
export const idOf = (workspace, file) =>
  createHash("sha256")
    .update(`${workspace}\0${file}`)
    .digest("hex")
    .slice(0, 32);
const priority = { snapshot: 0, edit: 1, write: 2, present: 3, manual: 3 };
export function globMatch(pattern, value) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0001/g, ".*");
  return new RegExp(`^${escaped}$`).test(value.replaceAll(path.sep, "/"));
}
export function ignored(rel, patterns) {
  return patterns.some((p) =>
    p.includes("/")
      ? globMatch(p, rel)
      : rel.split("/").some((part) => globMatch(p, part)),
  );
}
export async function snapshot(root, config = DEFAULTS, signal) {
  const entries = {},
    warnings = [];
  let truncated = false,
    count = 0;
  async function walk(dir) {
    if (signal?.aborted) throw new Error("Cancelled");
    let children;
    try {
      children = await readdir(dir, { withFileTypes: true });
    } catch (e) {
      warnings.push(`${path.relative(root, dir)}: ${e.code}`);
      return;
    }
    for (const child of children) {
      const file = path.join(dir, child.name),
        rel = path.relative(root, file).replaceAll(path.sep, "/");
      if (ignored(rel, config.ignorePatterns) || child.isSymbolicLink())
        continue;
      if (child.isDirectory()) await walk(file);
      else if (child.isFile()) {
        if (count >= config.maxIndexedFiles) {
          truncated = true;
          return;
        }
        try {
          const s = await stat(file);
          entries[file] = [s.mtimeMs, s.size];
          count++;
        } catch (e) {
          warnings.push(`${rel}: ${e.code}`);
        }
      }
      if (truncated) return;
    }
  }
  await walk(root);
  return { entries, takenAt: Date.now(), truncated, warnings };
}
export function changedFiles(before, after) {
  return Object.entries(after.entries)
    .filter(
      ([file, v]) =>
        !before.entries[file] ||
        before.entries[file][0] !== v[0] ||
        before.entries[file][1] !== v[1],
    )
    .map(([file]) => file);
}
export function extractArtifacts(events, cwd, canonicalCwd = cwd) {
  const resolveFile = file => {
    const resolved = path.resolve(cwd,file);
    return within(cwd,resolved) ? path.resolve(canonicalCwd,path.relative(cwd,resolved)) : resolved;
  };
  const results = [];
  let turn;
  for (const envelope of events) {
    const event = { ...envelope, ...envelope.data };
    turn = event.turn ?? turn;
    const time =
      typeof event.time === "number"
        ? event.time
        : Date.parse(event.time ?? "") || Date.now();
    if (event.type === "deliverables/presented") {
      for (const f of event.files ?? event.deliverables ?? []) {
        const file = f.path ?? f.file_path;
        if (typeof file === "string")
          results.push({
            path: resolveFile(file),
            source: "present",
            description: f.description,
            turn,
            time,
            seq: event.seq,
          });
      }
    }
    if (
      event.type === "tool/call" &&
      [
        "write",
        "edit",
        "str_replace_editor",
        "functions.write",
        "functions.edit",
        "functions.str_replace_editor",
      ].includes(event.name)
    ) {
      let args;
      try {
        args =
          typeof event.arguments === "string"
            ? JSON.parse(event.arguments)
            : event.arguments;
      } catch {
        continue;
      }
      const file = args?.file_path ?? args?.path;
      if (typeof file === "string")
        results.push({
          path: resolveFile(file),
          source: event.name.endsWith("write") ? "write" : "edit",
          turn,
          time,
          seq: event.seq,
        });
    }
  }
  return results;
}
const yieldTask = () => new Promise((resolve) => setImmediate(resolve));
export class ArtifactIndex {
  constructor(services, config = {}) {
    this.services = services;
    this.config = {
      ...DEFAULTS,
      ...config,
      readableExtensions:
        config.readableExtensions?.length
          ? [...new Set(config.readableExtensions.map((x) => String(x).replace(/^\\./, "").toLowerCase()))]
          : READABLE_EXTENSIONS,
    };
    this.records = new Map();
    this.recordRevision = 0;
    this.cursors = new Map();
    this.snapshots = new Map();
    this.workspaces = [];
    this.queue = Promise.resolve();
    this.disposed = false;
    this.status = {
      phase: "starting",
      processed: 0,
      total: 0,
      errors: [],
      warnings: [],
      lastValidatedAt: null,
      snapshots: 0,
      persistent: false,
    };
  }
  warn(error) {
    const msg = error instanceof Error ? error.message : String(error);
    this.status.errors = [...this.status.errors.slice(-19), msg];
    this.services.logger?.warn?.(msg);
  }
  enqueue(fn) {
    const result = this.queue.then(() => (this.disposed ? undefined : fn()));
    this.queue = result.catch((e) => this.warn(e));
    return result;
  }
  async init(domain) {
    this.domain = domain;
    if (domain) {
      for (const [id, record] of domain.table("artifacts").entries())
        this.records.set(id, record);
      for (const [id, record] of domain.table("cursors").entries())
        this.cursors.set(id, record);
      for (const [id, record] of domain.table("snapshots").entries())
        this.snapshots.set(id, record);
      this.status.persistent = true;
    }
    await this.refreshWorkspaces();
    for (const w of this.workspaces) {
      // Baseline belongs to startup, never infer historical shell outputs from present-day files.
      try {
        const current = await snapshot(w.path, this.config);
        this.snapshots.set(w.id, current);
        await this.save("snapshots", w.id, current);
      } catch (e) {
        this.warn(e);
      }
    }
    await this.validate();
    this.status.phase = "ready";
  }
  async refreshWorkspaces() {
    const listed = (await this.services.workspaceRegistry?.list()) ?? [];
    this.workspaces = [];
    for (const w of listed) {
      try {
        this.workspaces.push({
          id: w.id,
          title: w.title,
          path: await realpath(w.path),
          sessionIds: [...w.sessionIds],
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        });
      } catch (e) {
        this.warn(`Workspace ${w.title}: ${e.message}`);
      }
    }
  }
  async save(table, id, record) {
    if (this.domain) await this.domain.table(table).put(id, record);
    if(table==='artifacts')this.recordRevision++;
  }
  async workspaceFor(header) {
    const canonical = await realpath(header.cwd).catch(() => null);
    return this.workspaces.find(
      (w) => w.path === canonical && w.sessionIds?.includes(header.id),
    );
  }
  async upsert(w, input) {
    const file = path.resolve(input.path),
      ext = path.extname(file).slice(1).toLowerCase(),
      rel = path.relative(w.path, file).replaceAll(path.sep, "/");
    if (
      (!input.burst && !this.config.readableExtensions.includes(ext)) ||
      !within(w.path, file) ||
      ignored(rel, this.config.ignorePatterns)
    )
      return;
    try {
      await authorizedPath(file, [w.path], { allowMissing: true });
    } catch {
      return;
    }
    const id = idOf(w.id, file),
      old = this.records.get(id);
    if (!old && this.records.size >= this.config.maxIndexedFiles) {
      this.status.warnings = ["Index limit reached"];
      return;
    }
    const info = await stat(file).catch(() => null);
    const time = input.time ?? Date.now();
    const version = {
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      turn: input.turn,
      time,
      size: info?.size,
      source: input.source,
      seq: input.seq,
    };
    const versions = (old?.versions ?? []).map((v) => ({ ...v }));
    const previous = versions.find(
      (v) => v.sessionId === version.sessionId && v.turn === version.turn,
    );
    if (previous) {
      if ((priority[input.source] ?? 0) >= (priority[previous.source] ?? 0))
        Object.assign(previous, version);
    } else versions.push(version);
    versions.sort((a, b) => a.time - b.time);
    const latest = versions.at(-1);
    const auto = this.config.autoTags
      .filter((r) =>
        r.kind === "ext"
          ? r.value.replace(/^\./, "").toLowerCase() ===
            path.extname(file).slice(1).toLowerCase()
          : r.kind === "session"
            ? (input.sessionTitle ?? "").includes(r.value)
            : globMatch(r.value, rel),
      )
      .map((r) => r.name);
    const record = {
      ...old,
      id,
      workspaceId: w.id,
      workspaceTitle: w.title,
      path: file,
      relPath: rel,
      name: path.basename(file),
      ext: path.extname(file).toLowerCase(),
      kind: kindOf(file),
      size: info?.size,
      mtime: info?.mtimeMs,
      sessionId: latest.sessionId,
      sessionTitle: latest.sessionTitle,
      turn: latest.turn,
      source: latest.source,
      description: input.description ?? old?.description,
      firstSeenAt: Math.min(old?.firstSeenAt ?? time, time),
      lastSeenAt: Math.max(old?.lastSeenAt ?? time, time),
      versions,
      tags: [...new Set([...(old?.tags ?? []), ...auto])],
      missing: !info,
      trashed: info ? false : (old?.trashed ?? false),
    };
    await this.save("artifacts", id, record);
    this.records.set(id, record);
    return record;
  }
  async backfill() {
    const query = this.services.sessionQuery;
    if (!query) {
      this.status.phase = "degraded";
      this.warn("sessionQuery unavailable");
      return;
    }
    this.status.phase = "backfill";
    this.status.processed = 0;
    await this.refreshWorkspaces();
    const sessions = await query.listSessions();
    this.status.total = sessions.length;
    const titles = await query
      .readTitleSnapshots(sessions.map((s) => s.header.id))
      .catch(() => []);
    const titleMap = new Map(
      Array.isArray(titles)
        ? titles
            .filter((t) => t.status === "fulfilled")
            .map((t) => [t.sessionId, t.value?.title?.title])
        : [],
    );
    for (const item of sessions) {
      if (this.disposed) return;
      try {
        const header = item.header,
          w = await this.workspaceFor(header);
        if (w) {
          const meta = await query.listEvents(header.id);
          const lastSeq = meta.at(-1)?.seq ?? -1;
          const cursor = this.cursors.get(header.id);
          if (!cursor || cursor.seq !== lastSeq) {
            const replay = await query.readSession(header.id);
            const events = replay.events ?? [];
            const title =
              titleMap.get(header.id) ??
              [...events].reverse().find((e) => e.type === "session/title")
                ?.data?.title ??
              header.id;
            const fresh = cursor
              ? events.filter((e) => e.seq > cursor.seq)
              : events;
            for (const input of extractArtifacts(fresh, header.cwd, w.path))
              await this.upsert(w, {
                ...input,
                sessionId: header.id,
                sessionTitle: title,
              });
            const next = { seq: lastSeq, updatedAt: Date.now() };
            await this.save("cursors", header.id, next);
            this.cursors.set(header.id, next);
          } else {
            const title = titleMap.get(header.id);
            if (title) await this.updateTitle(header.id, title);
          }
        }
      } catch (e) {
        this.warn(e);
      }
      this.status.processed++;
      await yieldTask();
    }
    this.status.phase = this.status.errors.length ? "degraded" : "ready";
  }
  async updateTitle(sessionId, title) {
    for (const [id, r] of this.records) {
      if (
        !r.versions?.some((v) => v.sessionId === sessionId) ||
        (r.sessionId === sessionId && r.sessionTitle === title)
      )
        continue;
      const updated = {
        ...r,
        sessionTitle: r.sessionId === sessionId ? title : r.sessionTitle,
        versions: r.versions.map((v) =>
          v.sessionId === sessionId ? { ...v, sessionTitle: title } : v,
        ),
      };
      await this.save("artifacts", id, updated);
      this.records.set(id, updated);
    }
  }
  async handleEvent(session, envelope) {
    const event = { ...envelope, ...envelope.data };
    const header = session.header;
    if (!header?.cwd) return;
    await this.refreshWorkspaces();
    const w = await this.workspaceFor(header);
    if (!w) return;
    if(this.config.snapshotOnTurnEnd&&!this.snapshots.has(w.id)&&event.type!=="turn/end") {
      const baseline=await snapshot(w.path,this.config);
      this.snapshots.set(w.id,baseline);
      await this.save('snapshots',w.id,baseline);
    }
    if (event.type === "session/title") {
      await this.updateTitle(header.id, event.title);
      return;
    }
    const title =
      (await this.services.sessionQuery?.readTitle(header.id).catch(() => null))
        ?.title ?? header.id;
    for (const input of extractArtifacts([event], header.cwd, w.path))
      await this.upsert(w, {
        ...input,
        sessionId: header.id,
        sessionTitle: title,
      });
    if (event.type === "turn/end" && this.config.snapshotOnTurnEnd) {
      const after = await snapshot(w.path, this.config),
        before = this.snapshots.get(w.id);
      if (before) {
        const files = changedFiles(before, after);
        if (files.length > this.config.burstThreshold) {
          const id = idOf(w.id, `burst:${header.id}:${event.turn}`);
          const distributions = {};
          for (const f of files) {
            const top = path.relative(w.path, f).split(path.sep)[0];
            distributions[top] = (distributions[top] ?? 0) + 1;
          }
          const record = {
            id,
            workspaceId: w.id,
            workspaceTitle: w.title,
            name: `${files.length} files`,
            path: w.path,
            kind: "other",
            ext: "",
            source: "snapshot",
            sessionId: header.id,
            sessionTitle: title,
            turn: event.turn,
            firstSeenAt: Date.now(),
            lastSeenAt: Date.now(),
            burst: true,
            count: files.length,
            distributions,
            tags: [],
            versions: [],
          };
          await this.save("artifacts", id, record);
          this.records.set(id, record);
        } else
          for (const file of files)
            await this.upsert(w, {
              path: file,
              source: "snapshot",
              sessionId: header.id,
              sessionTitle: title,
              turn: event.turn,
              time:
                typeof event.time === "number"
                  ? event.time
                  : Date.parse(event.time) || Date.now(),
            });
      }
      this.snapshots.set(w.id, after);
      await this.save("snapshots", w.id, after);
      this.status.snapshots++;
      if (after.truncated || after.warnings.length)
        this.status.warnings = [
          ...after.warnings.slice(0, 10),
          ...(after.truncated ? ["Snapshot file limit reached"] : []),
        ];
    }
  }
  async validate() {
    await this.refreshWorkspaces();
    for (const [id, r] of this.records) {
      if (r.burst) continue;
      let info;
      try {
        await authorizedPath(
          r.path,
          this.workspaces
            .filter((w) => w.id === r.workspaceId)
            .map((w) => w.path),
        );
        info = await stat(r.path);
      } catch {
        info = null;
      }
      const updated = {
        ...r,
        missing: !info,
        trashed: info ? false : r.trashed,
        size: info?.size ?? r.size,
        mtime: info?.mtimeMs ?? r.mtime,
      };
      if (JSON.stringify(updated) !== JSON.stringify(r)) {
        await this.save("artifacts", id, updated);
        this.records.set(id, updated);
      }
    }
    this.status.lastValidatedAt = Date.now();
  }
  async patch(id, patch) {
    const old = this.records.get(id);
    if (!old)
      throw Object.assign(new Error("Artifact not found"), { status: 404 });
    const safe = {};
    if (patch.tags !== undefined) {
      if (
        !Array.isArray(patch.tags) ||
        patch.tags.some((t) => typeof t !== "string" || t.length > 80) ||
        patch.tags.length > 30
      )
        throw new Error("Invalid tags");
      safe.tags = [...new Set(patch.tags.map((t) => t.trim()).filter(Boolean))];
    }
    if (patch.starred !== undefined) safe.starred = !!patch.starred;
    if (patch.note !== undefined) {
      if (typeof patch.note !== "string" || patch.note.length > 10000)
        throw new Error("Invalid note");
      safe.note = patch.note;
    }
    const next = { ...old, ...safe };
    await this.save("artifacts", id, next);
    this.records.set(id, next);
    return next;
  }
  async markTrashed(id) {
    const old = this.records.get(id),
      next = { ...old, trashed: true, missing: true };
    await this.save("artifacts", id, next);
    this.records.set(id, next);
  }
  async cleanMissing() {
    let count = 0;
    for (const [id, r] of this.records)
      if (r.missing && !r.trashed) {
        if (this.domain) await this.domain.table("artifacts").delete(id);
        this.records.delete(id);
        this.recordRevision++;
        count++;
      }
    return count;
  }
  async text(record) {
    if (
      record.burst ||
      record.missing ||
      !["doc", "code", "web", "data"].includes(record.kind) ||
      [".pdf", ".doc", ".docx", ".rtf", ".odt"].includes(record.ext)
    )
      return "";
    await authorizedPath(
      record.path,
      this.workspaces
        .filter((w) => w.id === record.workspaceId)
        .map((w) => w.path),
    );
    const file = await open(record.path, "r");
    try {
      const buf = Buffer.alloc(
        Math.min((await file.stat()).size, this.config.textMaxBytes),
      );
      const { bytesRead } = await file.read(buf, 0, buf.length, 0);
      return buf.subarray(0, bytesRead).toString("utf8");
    } finally {
      await file.close();
    }
  }
  async search(filter = {}) {
    const q = String(filter.query ?? "").toLocaleLowerCase();
    const tags = Array.isArray(filter.tag)
      ? filter.tag
      : filter.tag
        ? [filter.tag]
        : [];
    let rows = [...this.records.values()].filter(
      (r) =>
        (!filter.workspace ||
          [r.workspaceId, r.workspaceTitle].includes(filter.workspace)) &&
        (!filter.type || r.kind === filter.type || r.ext === filter.type) &&
        (!tags.length || tags.some((t) => r.tags?.includes(t))) &&
        (!filter.starred || r.starred) &&
        (!filter.missing || (r.missing && !r.trashed)) &&
        (!filter.trashed || r.trashed) &&
        (!filter.since ||
          r.lastSeenAt >=
            (typeof filter.since === "number"
              ? filter.since
              : Date.parse(filter.since))),
    );
    if (q) {
      const matched = [];
      for (const r of rows) {
        filter.signal?.throwIfAborted();
        if (
          [
            r.name,
            r.path,
            r.description,
            r.note,
            r.sessionTitle,
            ...(r.tags ?? []),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(q)
        )
          matched.push(r);
        else if (filter.content) {
          const text = await this.text(r).catch(() => ""),
            i = text.toLocaleLowerCase().indexOf(q);
          if (i >= 0)
            matched.push({
              ...r,
              preview: text.slice(Math.max(0, i - 50), i + q.length + 100),
            });
        }
      }
      rows = matched;
    }
    const sort = filter.sort ?? "time";
    rows.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "workspace"
          ? a.workspaceTitle.localeCompare(b.workspaceTitle)
          : sort === "size"
            ? (b.size ?? 0) - (a.size ?? 0)
            : b.lastSeenAt - a.lastSeenAt,
    );
    const total = rows.length,
      offset = Math.max(0, Number(filter.offset) || 0),
      limit = Math.max(1, Math.min(50000, Number(filter.limit) || 200));
    return { records: rows.slice(offset, offset + limit), total };
  }
  state() {
    const counts = {types:{},workspaces:{},tags:{},starred:0,missing:0,trashed:0};
    for (const r of this.records.values()) {
      counts.types[r.kind]=(counts.types[r.kind]??0)+1;
      counts.workspaces[r.workspaceId]=(counts.workspaces[r.workspaceId]??0)+1;
      for(const tag of r.tags??[])counts.tags[tag]=(counts.tags[tag]??0)+1;
      if(r.starred)counts.starred++;
      if(r.trashed)counts.trashed++;else if(r.missing)counts.missing++;
    }
    return {
      ...this.status,
      counts,
      recordRevision: this.recordRevision,
      count: this.records.size,
      workspaces: this.workspaces.map(({ id, title, path }) => ({
        id,
        title,
        path,
      })),
      config: this.config,
    };
  }
  async dispose() {
    this.disposed = true;
    await this.queue;
    await this.domain?.close();
  }
}
