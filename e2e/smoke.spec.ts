import { test, expect } from '@playwright/test';

test.describe('TaskWave public pages', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TaskWave/i);
  });

  test('pricing page shows plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/Gratuito|Pro|Business/i).first()).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('docs page lists API endpoints', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.getByText(/Documentazione API/i)).toBeVisible();
    await expect(page.getByText(/\/api\/v1\/workspaces/i)).toBeVisible();
  });

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByText(/Blog/i).first()).toBeVisible();
  });

  test('blog post page loads from MDX content', async ({ page }) => {
    await page.goto('/blog/privacy-opt-out-ip');
    await expect(page.getByRole('heading', { name: /Privacy e opt-out IP/i })).toBeVisible();
  });

  test('invite page handles invalid token gracefully', async ({ page }) => {
    await page.goto('/invite/invalid-token-test');
    await expect(page.getByText(/invito|non valido|scaduto/i).first()).toBeVisible();
  });
});

test.describe('Privacy opt-out', () => {
  test('opt-out page loads and session opt-out works', async ({ page }) => {
    await page.goto('/privacy/opt-out');
    await expect(page.getByText(/Opt-out tracciamento IP/i)).toBeVisible();
    await page.getByRole('button', { name: /Applica a questa sessione/i }).click();
    await expect(page.getByText(/Opt-out applicato/i)).toBeVisible({ timeout: 10_000 });
  });

  test('privacy policy mentions opt-out', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/Opt-out tracciamento IP/i)).toBeVisible();
  });
});

test.describe('Auth redirect', () => {
  test('dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('board page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/workspace/test-workspace/board/test-board');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });
});
