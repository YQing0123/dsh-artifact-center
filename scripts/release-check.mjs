import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(pkg.name, "dsh-artifact-center");
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/);
const archive = path.resolve(".cache", `${pkg.name}-${pkg.version}.tgz`);
function run(command, args) {
  const result = spawnSync(command, args, { maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr)}`);
  return result.stdout;
}
const commit = run("git", ["rev-parse", "HEAD"]).toString().trim();
assert.match(commit, /^[a-f0-9]{40,64}$/);
const names = run("tar", ["-tf", archive]).toString().trim().split("\n");
assert(names.every(name => name.startsWith("package/") && !name.split("/").includes("..")), "Unexpected archive path");
assert(!names.some(name => /^package\/(?:\.cache|\.git|node_modules|test|scripts)\//.test(name)), "Private/development content must not ship");
const packedPkg = JSON.parse(run("tar", ["-xOf", archive, "package/package.json"]).toString());
assert.equal(packedPkg.name, pkg.name); assert.equal(packedPkg.version, pkg.version);
assert.equal(packedPkg.dsh.bundle.patch, "./cordis.patch.yml");
const required = ["package.json", "index.js", "core.js", "security.js", "client.js", "cordis.patch.yml",
  "locale/en.json", "locale/zh.json", "vendor/markdown-it.min.js", "vendor/purify.min.js", "vendor/mermaid.min.js",
  "README.md", "README.zh-CN.md", "LICENSE", "THIRD_PARTY_NOTICES.md"];
const files = [];
for (const file of required) {
  assert(names.includes(`package/${file}`), `Missing packed file: ${file}`);
  const actual = run("tar", ["-xOf", archive, `package/${file}`]);
  const local = await readFile(file);
  const committed = run("git", ["show", `${commit}:${file}`]);
  assert(actual.equals(local), `Archive is stale: ${file}`);
  assert(actual.equals(committed), `Packed source differs from HEAD: ${file}`);
  files.push({ file, bytes: actual.length, sha256: createHash("sha256").update(actual).digest("hex") });
}
const bytes = await readFile(archive);
const receipt = { name: pkg.name, version: pkg.version, commit, archive: path.relative(process.cwd(), archive),
  bytes: bytes.length, integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  sha1: createHash("sha1").update(bytes).digest("hex"), checkedAt: new Date().toISOString(),
  status: "verified-local-candidate-not-published", files };
const target = `.cache/release-receipt-${commit.slice(0, 12)}.json`;
try {
  await writeFile(target, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  const previous = JSON.parse(await readFile(target, "utf8"));
  assert.equal(previous.integrity, receipt.integrity, "Candidate changed after its receipt; retain the old receipt and investigate");
}
console.log(JSON.stringify({ ...receipt, files: files.length, receipt: target }, null, 2));
