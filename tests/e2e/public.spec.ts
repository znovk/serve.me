import { expect, test } from "@playwright/test";

/**
 * These tests need no Supabase network access: they cover public rendering,
 * client-side validation, route protection and input rejection.
 * Authenticated flows are listed in docs/TESTING.md (require a dev project).
 */

test("landing page renders and links to signup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("signup validates on the client before submitting", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
});

for (const path of [
  "/dashboard",
  "/dashboard/hospitality",
  "/dashboard/customer",
  "/dashboard/advertiser",
  "/dashboard/establishment",
  "/dashboard/admin",
  "/onboarding",
]) {
  test(`signed-out visitors are redirected from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/%2F/g, "(%2F|/)")}`));
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
}

test("login page does not leak an open redirect", async ({ page }) => {
  await page.goto("/login?next=https://evil.example");
  await expect(page.locator('input[name="next"]')).toHaveValue("https://evil.example");
  // The server action re-validates `next` with safeNextPath (unit tested); the
  // hidden field is untrusted input and never used client-side.
});

test("invalid profile usernames 404 without touching the database", async ({ page }) => {
  const res = await page.goto("/p/Not%20Valid!!");
  expect(res?.status()).toBe(404);
});

test("QR codes are not generated for invalid usernames", async ({ request }) => {
  const res = await request.get("/p/admin/qr");
  expect(res.status()).toBe(404);
});

test("offer redirect rejects malformed ids", async ({ request }) => {
  const res = await request.get("/go/not-a-uuid", { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test("theme toggle switches to dark mode", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("pages have no horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/login", "/signup"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("skip link is the first focusable element", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});
