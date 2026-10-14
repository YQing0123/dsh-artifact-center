import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ArtifactIndex } from "../core.js";
import { moveToTrash } from "../index.js";

if (process.platform !== "darwin") throw new Error("This acceptance check requires macOS Finder");
const cache = path.resolve(".cache");
await mkdir(cache, { recursive: true });
const root = await realpath(await mkdtemp(path.join(cache, "native-trash-")));
assert.equal(path.dirname(root), await realpath(cache));
const filename = `artifact-trash-${randomUUID()}.txt`;
const file = path.join(root, filename), content = `Native acceptance fixture ${randomUUID()}\n`;
await writeFile(file, content, { flag: "wx" });
assert.equal(await realpath(file), file);
assert.equal(await readFile(file, "utf8"), content);

function execute(spec) {
  let stdout = "", stderr = "";
  const child = spawn(spec.argv[0], spec.argv.slice(1), { cwd: spec.cwd, stdio: ["ignore", "pipe", "pipe"], signal: spec.signal });
  child.stdout.on("data", chunk => { stdout = (stdout + chunk).slice(0, 4096); });
  child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(0, 16384); });
  const timer = setTimeout(() => child.kill("SIGTERM"), 15000);
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  }).finally(() => clearTimeout(timer));
  return { done, collected: { stderr: { readFrom: offset => ({ text: stderr.slice(offset) }) } }, output: () => stdout };
}
async function apple(script, args) {
  const handle = execute({ argv: ["osascript", "-e", script, ...args], cwd: root });
  const result = await handle.done;
  if (result.exitCode !== 0) throw new Error(handle.collected.stderr.readFrom(0).text || `osascript exited ${result.exitCode}`);
  return handle.output().trim();
}
async function exists(file) {
  try { await stat(file); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
const workspace = { id: "native-fixture", title: "Native fixture", path: root, sessionIds: [] };
const index = new ArtifactIndex({ workspaceRegistry: { list: () => [workspace] }, logger: { warn: () => {} } });
await index.init();
await index.upsert(workspace, { path: file, source: "manual", sessionId: "native-acceptance" });
const record = [...index.records.values()][0];
assert(record, "Fixture was indexed");
await index.patch(record.id, { tags: ["Retain"], starred: true, note: "Retain original annotations" });
const inspectTrash = 'on run argv\n tell application "Finder"\n set targetFile to file (item 1 of argv) of trash\n return POSIX path of (targetFile as alias)\n end tell\nend run';
async function restore() {
  if (await exists(file)) return;
  const source = await apple(inspectTrash, [filename]);
  assert(path.isAbsolute(source));
  assert.equal(path.resolve(source), source);
  assert.equal(path.basename(source), filename);
  assert(source.split(path.sep).some(part => [".Trash", ".Trashes"].includes(part)), "Finder must resolve the fixture inside system trash");
  assert.equal(await realpath(root), root);
  const script = 'on run argv\n set targetFile to POSIX file (item 1 of argv) as alias\n set targetFolder to POSIX file (item 2 of argv) as alias\n tell application "Finder"\n if name of targetFile is not (item 3 of argv) then error "Fixture name mismatch"\n move targetFile to targetFolder\n end tell\nend run';
  await apple(script, [source, root, filename]);
}
const checks = [];
try {
  // Only this uniquely named, freshly created, canonical-path fixture may be moved.
  assert.equal(await realpath(record.path), file);
  assert.equal(await readFile(file, "utf8"), content);
  await moveToTrash(record, [root], { spawn: execute }, new AbortController().signal);
  assert.equal(await exists(file), false);
  checks.push("real Finder trash removes source");
  await index.markTrashed(record.id);
  assert.equal((await index.search({ trashed: true })).total, 1);
  checks.push("trashed artifact remains searchable");
  await restore();
  assert.equal(await readFile(file, "utf8"), content);
  checks.push("Finder restores identical fixture content");
  await index.validate();
  const restored = index.records.get(record.id);
  assert.equal(restored.missing, false); assert.equal(restored.trashed, false);
  assert.deepEqual(restored.tags, ["Retain"]); assert.equal(restored.starred, true);
  assert.equal(restored.note, "Retain original annotations");
  checks.push("validation clears flags and retains annotations");
  console.log(JSON.stringify({ platform: process.platform, realFilesystem: true, hostSubprocessService: false,
    fixture: path.relative(process.cwd(), file), checks, passed: checks.length }, null, 2));
} finally {
  await restore();
  await index.dispose();
}
