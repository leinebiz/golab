import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated API returns 401', async ({ request }) => {
    const response = await request.get('/api/v1/tests');
    expect(response.status()).toBe(401);
  });
});
