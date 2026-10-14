import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Exercise the public language setting; always restore the original preference.
export async function localeRegression(page) {
  let original, changed = false;
  try {
    await page.reload();
    await page.getByRole("button", { name: /^(设置|Settings)$/ }).click();
    original = await page.getByRole("button", { name: "中文", exact: true }).isVisible() ? "中文" : "English";
    if (original === "中文") {
      await page.getByRole("button", { name: "中文", exact: true }).click();
      await page.getByText("English", { exact: true }).click();
      changed = true;
    }
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Artifact center", exact: true }).click();
    const checkbox = page.getByRole("checkbox", { name: "Show .md", exact: true });
    await checkbox.waitFor({ state: "visible" });
    const sidebar = await page.getByText("Readable formats", { exact: true }).count() === 1;
    await page.locator(".ac-row .ac-fileinfo button").first().click();
    const toolbar = page.locator(".ac-preview-tools");
    const preview = await toolbar.getByRole("button", { name: "File information", exact: true }).count() === 1;
    await toolbar.getByRole("button", { name: "Close", exact: true }).click();
    return { englishSidebar: sidebar, englishFormatCheckbox: await checkbox.count() === 1, englishPreviewToolbar: preview };
  } finally {
    if (changed) {
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("button", { name: "English", exact: true }).click();
      await page.getByText(original, { exact: true }).click();
      await page.getByRole("button", { name: original, exact: true }).waitFor({ state: "visible" });
    }
    await page.reload();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, ["scripts/p0-browser.mjs", "run-code", localeRegression.toString()], { encoding: "utf8" });
  process.stdout.write(result.stdout ?? ""); process.stderr.write(result.stderr ?? "");
  const match = (result.stdout ?? "").match(/### Result\n([^\n]+)/), report = match ? JSON.parse(match[1]) : null;
  process.exitCode = result.status || (!report || Object.values(report).some(value => value !== true) ? 1 : 0);
}
