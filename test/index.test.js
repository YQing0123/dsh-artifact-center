import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, writeFile, rename, symlink } from "node:fs/promises";
import { createServer } from "node:http";
import {
  ArtifactIndex,
  DEFAULTS,
  snapshot,
  changedFiles,
  extractArtifacts,
  globMatch,
} from "../core.js";
import { authorizedPath, trustedRequest, parseRange } from "../security.js";
import { apply, domainSpec, trashCommand, searchTool } from "../index.js";

async function fixture() {
  await mkdir(".cache/tests", { recursive: true });
  const root = await mkdtemp(path.resolve(".cache/tests/workspace-"));
  const workspace = Object.create({
    get id() { return "w1"; },
    get title() { return "Test workspace"; },
    get path() { return root; },
    get sessionIds() { return ["s1"]; },
  });
  assert.match(domainSpec.name, /^[a-z][a-z0-9_]*$/);
  const header = { id: "s1", cwd: root, createdAt: Date.now(), version: 4 };
  const events = [];
  const query = {
    listSessions: async () => [{ header, live: false, persisted: true }],
    listEvents: async () =>
      events.map(({ data, ...e }) => ({
        ...e,
        sessionId: "s1",
        surface: "current",
      })),
    readSession: async () => ({ session: header, events }),
    readTitleSnapshots: async () => [
      {
        sessionId: "s1",
        status: "fulfilled",
        value: { session: header, title: { title: "Payment analysis" } },
      },
    ],
    readTitle: async () => ({ title: "Payment analysis" }),
  };
  const tables = new Map(
    Object.keys(domainSpec.tables).map((k) => [k, new Map()]),
  );
  const domain = {
    table: (name) => ({
      entries: () => tables.get(name).entries(),
      put: async (id, value) => {
        domainSpec.tables[name].valueSchema.parse(value);
        tables.get(name).set(id, structuredClone(value));
      },
      delete: async (id) => tables.get(name).delete(id),
    }),
    close: async () => {},
  };
  const services = {
    sessionQuery: query,
    workspaceRegistry: { list: () => [workspace] },
    logger: { warn: () => {} },
  };
  const index = new ArtifactIndex(services);
  await index.init(domain);
  return {
    root,
    workspace,
    header,
    events,
    query,
    domain,
    services,
    index,
    tables,
  };
}
test("extension configuration accepts leading dots and uppercase", async () => {
  const f = await fixture();
  const index = new ArtifactIndex(f.services, { readableExtensions: [".MD", "md", ".JSON"] });
  assert.deepEqual(index.config.readableExtensions, ["md", "json"]);
});

test("title refresh repairs every historical version even when the latest title matches", async () => {
  const f = await fixture(), file = path.join(f.root, "titles.md");
  await writeFile(file, "history");
  for (const [turn, sessionTitle] of [[1, "Old"], [2, "Current"]])
    await f.index.upsert(f.workspace, { path: file, sessionId: "s1", turn, time: turn, sessionTitle, source: "write" });
  await f.index.updateTitle("s1", "Current");
  const record = [...f.index.records.values()][0];
  assert.deepEqual(record.versions.map(v => v.sessionTitle), ["Current", "Current"]);
});

test("history refresh rediscovers a restored file after cleaning missing records", async () => {
  const f = await fixture(), file = path.join(f.root, "clean-and-restore.md");
  await writeFile(file, "original");
  f.events.push({ type: "tool/call", seq: 1, time: 1, data: { name: "write", turn: 1, arguments: { file_path: file } } });
  await f.index.backfill();
  await rename(file, file + ".away");
  await f.index.validate();
  assert.equal(await f.index.cleanMissing(), 1);
  assert.equal(f.index.cursors.has("s1"), false);
  assert.equal(f.tables.get("cursors").has("s1"), false);
  await rename(file + ".away", file);
  await f.index.backfill();
  assert.equal(f.index.records.size, 1);
  assert.equal([...f.index.records.values()][0].missing, false);
});

test("missing optional storage preserves in-memory history indexing", async () => {
  const f = await fixture();
  await writeFile(path.join(f.root, "memory.md"), "memory index");
  f.events.push({ type: "tool/call", seq: 1, time: 1, data: { name: "write", turn: 1, arguments: { file_path: "memory.md" } } });
  const pending = [], disposers = [];
  let tool;
  const services = { ...f.services, tools: { register(value) { tool = value; return () => {}; } } };
  const ctx = {
    ...services,
    webServer: { register: () => () => {} }, logger: f.services.logger,
    get: key => services[key], on: () => () => {},
    effect(fn) { const dispose = fn(); if (dispose) disposers.push(dispose); },
    inject(_keys, fn) { pending.push(Promise.resolve(fn(ctx))); },
  };
  apply(ctx, { backfillOnStart: false, validationIntervalMs: 100000 });
  await Promise.all(pending);
  const routeIndex = new ArtifactIndex(f.services);
  await routeIndex.init();
  await routeIndex.backfill();
  assert.equal((await routeIndex.search({ query: "memory.md" })).total, 1);
  assert.equal(routeIndex.status.persistent, false);
  const result = await tool.execute({ query: "none" }, { signal: new AbortController().signal });
  assert.equal(result.status, "degraded");
  for (const dispose of disposers.reverse()) await dispose();
  const missing = new ArtifactIndex({});
  assert.equal(missing.state().phase, "degraded");
  assert.deepEqual(missing.state().errors, ["sessionQuery unavailable", "workspaceRegistry unavailable"]);
});

test("readable extension whitelist excludes unsupported indexed files", async () => {
  const f = await fixture();
  f.index.config.readableExtensions = ["md"];
  const w = f.index.workspaces[0];
  const md = path.join(f.root, "allowed.md");
  const png = path.join(f.root, "blocked.png");
  await writeFile(md, "allowed");
  await writeFile(png, "blocked");
  await f.index.upsert(w, { path: md, source: "write", sessionId: "s1" });
  await f.index.upsert(w, { path: png, source: "write", sessionId: "s1" });
  assert.deepEqual([...f.index.records.values()].map((r) => r.name), ["allowed.md"]);
});

test("record revision changes when same-count metadata changes", async () => {
  const f = await fixture(), w = f.index.workspaces[0];
  const file = path.join(f.root, "revision.md");
  await writeFile(file, "first");
  const r = await f.index.upsert(w, {
    path: file,
    source: "write",
    sessionId: "s1",
    sessionTitle: "Old title",
    turn: 1,
    time: 1,
  });
  const before = f.index.state();
  await f.index.updateTitle("s1", "New title");
  assert.equal(f.index.state().count, before.count);
  assert.ok(f.index.state().recordRevision > before.recordRevision);
  const edited = f.index.state().recordRevision;
  await f.index.patch(r.id, { tags: ["A", "B"] });
  assert.ok(f.index.state().recordRevision > edited);
  assert.deepEqual(f.index.state().counts.tags, { A: 1, B: 1 });
});

  test('canonical workspace aliases retain relative and absolute provenance',async()=>{
  const f=await fixture(),alias=f.root+'-alias';await symlink(f.root,alias,'dir');f.header.cwd=alias;
  await writeFile(path.join(f.root,'alias.md'),'Alias output');
  f.events.push({type:'tool/call',seq:1,time:100,data:{name:'write',turn:1,arguments:{file_path:'alias.md'}}},{type:'deliverables/presented',seq:2,time:101,data:{turn:1,files:[{path:path.join(alias,'alias.md')}]}});
  await f.index.backfill();const records=[...f.index.records.values()];assert.equal(records.length,1);assert.equal(records[0].path,path.join(f.root,'alias.md'));assert.equal(records[0].source,'present');
});
test('a newly registered workspace captures its first shell-only turn',async()=>{
  const f=await fixture(),root=path.join(f.root,'new-workspace');await mkdir(root);await writeFile(path.join(root,'pre-existing.txt'),'Baseline');
  const w={id:'w2',title:'New',path:root,sessionIds:['s2']};f.services.workspaceRegistry.list=()=>[f.workspace,w];
  const session={header:{id:'s2',cwd:root}};
  await f.index.handleEvent(session,{type:'turn/start',time:100,data:{turn:1}});
  await writeFile(path.join(root,'shell.txt'),'Created after start');
  await f.index.handleEvent(session,{type:'turn/end',time:101,data:{turn:1}});
  const records=[...f.index.records.values()];assert.deepEqual(records.map(r=>r.name),['shell.txt']);assert.equal(records[0].lastSeenAt,101);
});
test("native event envelope paths and sources are extracted without trusting malformed arguments", () => {
  const events = [
    {
      type: "tool/call",
      seq: 1,
      time: 100,
      data: {
        turn: 1,
        name: "write",
        arguments: JSON.stringify({ file_path: "out.md" }),
      },
    },
    {
      type: "deliverables/presented",
      seq: 2,
      time: 101,
      data: { turn: 1, files: [{ path: "out.md", description: "Plan" }] },
    },
    {
      type: "tool/call",
      seq: 3,
      time: 102,
      data: { name: "write", arguments: "bad JSON" },
    },
  ];
  assert.deepEqual(
    extractArtifacts(events, "/tmp").map((r) => [
      r.path,
      r.source,
      r.turn,
      r.time,
    ]),
    [
      ["/tmp/out.md", "write", 1, 100],
      ["/tmp/out.md", "present", 1, 101],
    ],
  );
});
test("real full-session backfill is incremental and title snapshots are folded", async () => {
  const f = await fixture();
  await writeFile(path.join(f.root, "plan.md"), "Payment deliverable");
  f.events.push(
    {
      type: "tool/call",
      seq: 1,
      time: 100,
      data: {
        turn: 1,
        name: "write",
        arguments: JSON.stringify({ file_path: "plan.md" }),
      },
    },
    {
      type: "deliverables/presented",
      seq: 2,
      time: 101,
      data: {
        turn: 1,
        files: [{ path: "plan.md", description: "Payment plan" }],
      },
    },
  );
  await f.index.backfill();
  const record = [...f.index.records.values()][0];
  assert.equal(record.sessionTitle, "Payment analysis");
  assert.equal(record.source, "present");
  assert.equal(record.versions.length, 1);
  assert.equal(record.lastSeenAt, 101);
  let replayed = 0;
  f.query.readSession = async () => {
    replayed++;
    return { events: f.events };
  };
  await f.index.backfill();
  assert.equal(replayed, 0);
  const reloaded = new ArtifactIndex(f.services);
  await reloaded.init(f.domain);
  assert.equal(reloaded.records.size, 1);
  assert.equal(reloaded.cursors.get("s1").seq, 2);
});
test("snapshot baseline does not index pre-existing files; shell output is discovered after turn end", async () => {
  const f = await fixture();
  await writeFile(path.join(f.root, "shell-output.txt"), "from bash");
  await f.index.handleEvent(
    { header: f.header },
    { type: "turn/end", time: 200, data: { turn: 2 } },
  );
  const records = [...f.index.records.values()];
  assert.equal(records.length, 1);
  assert.equal(records[0].name, "shell-output.txt");
  assert.equal(records[0].source, "snapshot");
  await mkdir(path.join(f.root, "node_modules"));
  await writeFile(path.join(f.root, "node_modules", "noise.txt"), "ignored");
  const next = await snapshot(f.root, DEFAULTS);
  assert.equal(Object.keys(next.entries).length, 1);
});
test("burst rounds are folded and snapshot limit is explicit", async () => {
  const f = await fixture();
  f.index.config.burstThreshold = 2;
  for (let i = 0; i < 3; i++)
    await writeFile(path.join(f.root, `${i}.txt`), "x");
  await f.index.handleEvent(
    { header: f.header },
    { type: "turn/end", time: 300, data: { turn: 3 } },
  );
  assert.equal(f.index.records.size, 1);
  const r = [...f.index.records.values()][0];
  assert.equal(r.burst, true);
  assert.equal(r.count, 3);
  const limited = await snapshot(f.root, { ...DEFAULTS, maxIndexedFiles: 2 });
  assert.equal(limited.truncated, true);
  assert.equal(Object.keys(limited.entries).length, 2);
});
test("version updates preserve user metadata and do not mutate earlier durable objects", async () => {
  const f = await fixture(),
    file = path.join(f.root, "note.txt");
  await writeFile(file, "v1");
  const first = await f.index.upsert(f.workspace, {
    path: file,
    sessionId: "s1",
    sessionTitle: "Old title",
    turn: 1,
    time: 10,
    source: "write",
  });
  await f.index.patch(first.id, {
    tags: ["Review"],
    starred: true,
    note: "Keep",
  });
  await f.index.upsert(f.workspace, {
    path: file,
    sessionId: "s1",
    sessionTitle: "New title",
    turn: 2,
    time: 20,
    source: "edit",
  });
  const next = f.index.records.get(first.id);
  assert.equal(first.versions.length, 1);
  assert.equal(next.versions.length, 2);
  assert.deepEqual(next.tags, ["Review"]);
  assert.equal(next.starred, true);
  assert.equal(next.note, "Keep");
  assert.equal(
    (await f.index.search({ tag: "Review", starred: true })).total,
    1,
  );
});
test("restored path clears missing and trashed flags without reading system trash", async () => {
  const f = await fixture(),
    file = path.join(f.root, "restore.txt");
  await writeFile(file, "restore");
  const r = await f.index.upsert(f.workspace, {
    path: file,
    source: "write",
    sessionId: "s1",
    turn: 1,
  });
  await f.index.markTrashed(r.id);
  await f.index.validate();
  assert.equal(f.index.records.get(r.id).trashed, false);
  assert.equal(f.index.records.get(r.id).missing, false);
});
test("path boundaries reject external paths, workspace root, and external symlinks", async () => {
  const f = await fixture(),
    outside = await fixture();
  await writeFile(path.join(outside.root, "secret.txt"), "private");
  await symlink(outside.root, path.join(f.root, "escape"));
  await assert.rejects(
    authorizedPath(path.join(outside.root, "secret.txt"), [f.root]),
    /outside/,
  );
  await assert.rejects(
    authorizedPath(path.join(f.root, "escape", "secret.txt"), [f.root]),
    /outside/,
  );
  await assert.rejects(
    authorizedPath(path.join(f.root, "escape", "missing.txt"), [f.root], {
      allowMissing: true,
    }),
    /outside/,
  );
  await assert.rejects(authorizedPath(f.root, [f.root]));
  assert.equal(
    await authorizedPath(path.join(f.root, "missing.txt"), [f.root], {
      allowMissing: true,
    }),
    path.join(f.root, "missing.txt"),
  );
});
test("trust boundary includes origin port; byte ranges follow HTTP boundaries", () => {
  assert.equal(
    trustedRequest({
      headers: { host: "127.0.0.1:3080", origin: "http://127.0.0.1:4000" },
    }),
    false,
  );
  assert.equal(
    trustedRequest({
      headers: { host: "localhost:3080", origin: "http://localhost:3080" },
    }),
    true,
  );
  assert.equal(
    trustedRequest({
      headers: { host: "localhost:3080", "sec-fetch-site": "cross-site" },
    }),
    false,
  );
  assert.equal(
    trustedRequest({ headers: { host: "attacker.example" } }),
    false,
  );
  assert.deepEqual(parseRange("bytes=2-5", 10), { start: 2, end: 5 });
  assert.deepEqual(parseRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange("bytes=3-", 10), { start: 3, end: 9 });
  assert.throws(() => parseRange("bytes=10-", 10));
  assert.throws(() => parseRange("bytes=0-1,3-4", 10));
  assert.equal(globMatch("outputs/**", "outputs/a/b.txt"), true);
  assert.equal(trashCommand('"; unsafe.txt', "darwin").at(-1), '"; unsafe.txt');
});
test("agent search returns canonical metadata and bounded content matches", async () => {
  const f = await fixture(),
    file = path.join(f.root, "answer.txt");
  await writeFile(file, "A unique payment reference");
  await f.index.upsert(f.workspace, {
    path: file,
    source: "write",
    sessionId: "s1",
    sessionTitle: "Notes",
    turn: 1,
  });
  const tool = searchTool(f.index);
  const result = await tool.execute(
    { query: "unique payment" },
    { signal: new AbortController().signal },
  );
  assert.equal(result.total, 1);
  assert.match(result.records[0].preview, /unique payment/);
  assert.equal(result.records[0].path, file);
  assert.equal(
    (
      await tool.execute(
        { query: "unmatched" },
        { signal: new AbortController().signal },
      )
    ).records.length,
    0,
  );
});
test("host routes require auth, serve real byte ranges with CSP and enforce explicit trash confirmation", async (t) => {
  const f = await fixture(),
    file = path.join(f.root, "sample.pdf");
  await writeFile(file, "%PDF-test-0123456789");
  f.events.push({
    type: "deliverables/presented",
    seq: 1,
    time: 400,
    data: { turn: 1, files: [{ path: file }] },
  });
  const routes = [],
    disposers = [],
    pending = [];
  let tool;
  const services = {
    ...f.services,
    storageDomain: { open: async () => f.domain },
    connection: {
      requestRejection: (req) =>
        req.headers.cookie === "test-auth" ? undefined : 401,
    },
    tools: {
      register: (definition) => {
        tool = definition;
        return () => {};
      },
    },
    webServer: {
      register: (route) => {
        routes.push(route);
        return () => {};
      },
    },
  };
  const ctx = {
    ...services,
    logger: { warn: () => {} },
    get: (k) => services[k],
    effect: (fn) => {
      const d = fn();
      if (d) disposers.push(d);
    },
    inject: (keys, fn) => {
      pending.push(Promise.resolve(fn(ctx)));
    },
    on: () => () => {},
  };
  apply(ctx, { validationIntervalMs: 100000, backfillOnStart: false });
  await Promise.all(pending);
  await tool.execute(
    { query: "none" },
    { signal: new AbortController().signal },
  );
  // Exercise live event handler through a fresh backfill trigger.
  const server = createServer(async (req, res) => {
    const p = new URL(req.url, "http://localhost").pathname;
    const route = routes.find((r) =>
      r.kind === "exact"
        ? r.path === p
        : p === r.path || p.startsWith(r.path + "/"),
    );
    if (route) await route.handler(req, res);
    else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const d of disposers.reverse()) await d();
  });
  const base = `http://127.0.0.1:${server.address().port}`,
    headers = { cookie: "test-auth" };
  assert.equal((await fetch(base + "/artifact-center/api/status")).status, 401);
  assert.equal(
    (
      await fetch(base + "/artifact-center/api/status", {
        headers: { ...headers, origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/artifact-center/api/refresh", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    202,
  );
  const result = await tool.execute(
    { query: "sample" },
    { signal: new AbortController().signal },
  );
  // The refresh is serialized asynchronously; wait through API validation to observe its committed state.
  await fetch(base + "/artifact-center/api/validate", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: "{}",
  });
  const list = await (
    await fetch(base + "/artifact-center/api/list", { headers })
  ).json();
  assert.equal(list.total, 1);
  const id = list.records[0].id;
  const ranged = await fetch(`${base}/artifact-center/file?id=${id}`, {
    headers: { ...headers, range: "bytes=0-3" },
  });
  assert.equal(ranged.status, 206);
  assert.equal(await ranged.text(), "%PDF");
  assert.match(
    ranged.headers.get("content-security-policy"),
    /script-src 'none'/,
  );
  assert.equal(
    (
      await fetch(`${base}/artifact-center/file?id=${id}`, {
        headers: { ...headers, range: "bytes=1000-" },
      })
    ).status,
    416,
  );
  assert.equal(
    (
      await fetch(base + "/artifact-center/api/trash", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(base + "/artifact-center/file?path=/etc/passwd", { headers }))
      .status,
    404,
  );
});
