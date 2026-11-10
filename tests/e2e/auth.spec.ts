import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("cadastro de novo usuário", async ({ page }) => {
    await page.goto("/cadastro");

    // Fill signup form
    const timestamp = Date.now();
    await page.fill("#name", `Teste E2E ${timestamp}`);
    await page.fill("#email", `teste.e2e.${timestamp}@financeos.test`);
    await page.fill("#password", `SecureP@ss${timestamp}`);
    await page.fill("#confirmPassword", `SecureP@ss${timestamp}`);

    // Submit
    await page.click('button[type="submit"]');

    // Should show confirmation or redirect
    await expect(
      page.getByText("Verifique seu e-mail").or(page.locator('text="Dashboard"'))
    ).toBeVisible({ timeout: 10000 });
  });

  test("login com email/senha", async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    // Skip if env vars not set
    test.skip(
      !testEmail || !testPassword,
      "TEST_USER_EMAIL and TEST_USER_PASSWORD env vars required"
    );

    await page.goto("/login");

    // Fill login form
    await page.fill("#email", testEmail!);
    await page.fill("#password", testPassword!);

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");

    // Sidebar should be visible on desktop
    await expect(page.locator("text=FinanceOS")).toBeVisible();
  });

  test("rota protegida redireciona para login", async ({ page }) => {
    // Navigate directly to protected route without auth
    await page.goto("/dashboard");

    // Should redirect to login
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
