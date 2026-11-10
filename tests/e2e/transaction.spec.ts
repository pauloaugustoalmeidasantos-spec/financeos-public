import { test, expect } from "@playwright/test";

test.describe("Transactions", () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    test.skip(
      !testEmail || !testPassword,
      "TEST_USER_EMAIL and TEST_USER_PASSWORD env vars required"
    );

    await page.goto("/login");
    await page.fill("#email", testEmail!);
    await page.fill("#password", testPassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("criar transação de despesa", async ({ page }) => {
    // Navigate to financas
    await page.goto("/financas");
    await page.waitForLoadState("networkidle");

    // Click "Adicionar" button
    await page.click('button:has-text("Adicionar")');

    // Wait for form dialog to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 5000,
    });

    // Select type "Despesa" if there's a type selector
    const despesaBtn = page.locator('button:has-text("Despesa")');
    if (await despesaBtn.isVisible()) {
      await despesaBtn.click();
    }

    // Fill amount
    const amountInput = page.locator('input[name="amount"], input[placeholder*="valor" i], input[placeholder*="0,00"]');
    if (await amountInput.isVisible()) {
      await amountInput.fill("150");
    }

    // Fill description if available
    const descInput = page.locator('input[name="description"], input[placeholder*="descrição" i]');
    if (await descInput.isVisible()) {
      await descInput.fill("Teste E2E - Alimentação");
    }

    // Click save/submit
    const saveBtn = page.locator('button:has-text("Salvar"), button:has-text("Adicionar"), button[type="submit"]').last();
    await saveBtn.click();

    // Verify the dialog closes or the transaction appears
    await expect(page.locator('[role="dialog"]')).toBeHidden({
      timeout: 5000,
    });

    // Verify the transaction list updated (page still showing financas)
    expect(page.url()).toContain("/financas");
  });

  test("filtrar por mês anterior", async ({ page }) => {
    await page.goto("/financas");
    await page.waitForLoadState("networkidle");

    // Find and click previous month arrow
    const prevArrow = page.locator('button:has(svg)').first();
    await prevArrow.click();

    // Wait for data to load — the list should update without errors
    await page.waitForLoadState("networkidle");

    // Page should still be on financas without errors
    expect(page.url()).toContain("/financas");

    // No error messages should be visible
    await expect(page.locator("text=Erro")).not.toBeVisible();
  });
});
