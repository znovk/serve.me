import { test } from "@playwright/test";

/** Captures layout screenshots for manual review (test-results/screens). */
test("capture public screens", async ({ page }, info) => {
  for (const [name, path] of [
    ["landing", "/"],
    ["signup", "/signup"],
    ["login", "/login"],
  ] as const) {
    await page.goto(path);
    await page.screenshot({ path: `test-results/screens/${info.project.name}-${name}.png`, fullPage: true });
  }
});
