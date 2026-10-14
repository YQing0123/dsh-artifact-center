import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".cache", { recursive: true });
const extra = process.env.ARTIFACT_PROBE_PATCH ? ["--patch", process.env.ARTIFACT_PROBE_PATCH] : [];
const child = spawn("dsh", ["artifact-dev", ...extra, "--port", "0", "--no-open"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let text = "",
  found = false;
const output = async (chunk) => {
  text += chunk.toString();
  const match = text.match(/dsh web: (http:\/\/[^\s]+)/);
  if (match && !found) {
    found = true;
    await writeFile(
      ".cache/p0-address.json",
      JSON.stringify({ url: match[1] }),
      { mode: 0o600 },
    );
    const u = new URL(match[1]);
    console.log(`P0_HOST_URL=${u.origin}`);
  }
  for (const line of chunk.toString().split("\n"))
    if (line && !line.includes("dsh web:"))
      console.log(line.replace(/([?&]token=)[^\s&]+/g, "$1[redacted]"));
};
child.stdout.on("data", output);
child.stderr.on("data", output);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
