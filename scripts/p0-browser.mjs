import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const { url } = JSON.parse(await readFile(".cache/p0-address.json", "utf8"));
const privateURL = new URL(url),
  args = process.argv.slice(2);
if (args[0] === "open") args.splice(1, 0, url, "--headed");
const result = spawnSync(
  "/Users/yqing/.dsh/skills/playwright/scripts/playwright_cli.sh",
  ["--session", "artifact-p0", ...args],
  {
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: process.cwd() + "/.cache/npm" },
  },
);
const scrub = (text) =>
  String(text ?? "")
    .replaceAll(url, privateURL.origin + "/")
    .replaceAll(
      privateURL.searchParams.get("token") ?? "__no_token__",
      "[redacted]",
    );
process.stdout.write(scrub(result.stdout));
process.stderr.write(scrub(result.stderr));
process.exitCode = result.status ?? 1;
