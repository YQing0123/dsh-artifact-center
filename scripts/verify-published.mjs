import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Read-only verification: no npm credentials, publication or registry writes.
const checked = spawnSync(process.execPath, ["scripts/release-check.mjs"], { encoding: "utf8" });
if (checked.status !== 0) {
  process.stderr.write(checked.stderr || checked.stdout || "Local candidate verification failed\n");
  process.exit(1);
}
const candidate = JSON.parse(checked.stdout);
const bytes = await readFile(candidate.archive);
assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, candidate.integrity);
const endpoint = `https://registry.npmjs.org/${encodeURIComponent(candidate.name)}/${encodeURIComponent(candidate.version)}`;
const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000), headers: { accept: "application/json" } });
if (response.status === 404) {
  console.log(JSON.stringify({ name: candidate.name, version: candidate.version, status: "not-published", registry: endpoint,
    candidateCommit: candidate.commit, candidateIntegrity: candidate.integrity }, null, 2));
  process.exitCode = 2;
} else {
  if (!response.ok) throw new Error(`Registry check failed: HTTP ${response.status}`);
  const published = await response.json();
  assert.equal(published.name, candidate.name); assert.equal(published.version, candidate.version);
  const matches = published.dist?.integrity === candidate.integrity && published.dist?.shasum === candidate.sha1;
  console.log(JSON.stringify({ name: candidate.name, version: candidate.version,
    status: matches ? "published-candidate-matches" : "published-integrity-mismatch", registry: endpoint,
    candidateCommit: candidate.commit, candidateIntegrity: candidate.integrity,
    publishedIntegrity: published.dist?.integrity, publishedSha1: published.dist?.shasum }, null, 2));
  process.exitCode = matches ? 0 : 1;
}
