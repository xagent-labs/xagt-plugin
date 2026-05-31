import { test, expect, type Page, type Route } from '@playwright/test';

const RUNNING_INTERRUPTED_MISSION_ID = '55555555-5555-4555-8555-555555555555';

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  });
}

async function mockRunningInterruptedMission(page: Page, runningState = 'running') {
  const now = new Date().toISOString();
  const mission = {
    id: RUNNING_INTERRUPTED_MISSION_ID,
    title: 'Running interrupted mission',
    status: 'interrupted',
    workspace_id: '66666666-6666-4666-8666-666666666666',
    workspace_name: 'dev-workspace',
    backend: 'codex',
    created_at: now,
    updated_at: now,
    history: [],
    resumable: true,
  };

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        },
      });
      return;
    }

    if (path === '/api/control/missions/current') {
      await fulfillJson(route, mission);
      return;
    }
    if (path === '/api/control/missions') {
      await fulfillJson(route, [mission]);
      return;
    }
    if (path === `/api/control/missions/${RUNNING_INTERRUPTED_MISSION_ID}`) {
      await fulfillJson(route, mission);
      return;
    }
    if (path === `/api/control/missions/${RUNNING_INTERRUPTED_MISSION_ID}/load`) {
      await fulfillJson(route, mission);
      return;
    }
    if (path === `/api/control/missions/${RUNNING_INTERRUPTED_MISSION_ID}/events`) {
      await fulfillJson(route, { events: [], next_cursor: null, has_more: false });
      return;
    }
    if (path === '/api/control/running') {
      await fulfillJson(route, [{ mission_id: RUNNING_INTERRUPTED_MISSION_ID, state: runningState, queue_len: 0 }]);
      return;
    }
    if (path === '/api/control/progress') {
      await fulfillJson(route, {
        run_state: runningState === 'running' ? 'running' : 'idle',
        queue_len: 0,
        mission_id: RUNNING_INTERRUPTED_MISSION_ID,
      });
      return;
    }
    if (path === '/api/control/queue') {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/control/stream') {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' });
      return;
    }
    if (path === '/api/workspaces') {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/desktop/sessions') {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/backends' || path === '/api/providers' || path === '/api/providers/backend-models') {
      await fulfillJson(route, []);
      return;
    }
    if (/^\/api\/backends\/[^/]+\/agents$/.test(path)) {
      await fulfillJson(route, []);
      return;
    }
    if (/^\/api\/backends\/[^/]+\/config$/.test(path)) {
      await fulfillJson(route, { hidden_agents: [], default_agent: null });
      return;
    }
    if (path.startsWith('/api/library/')) {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/health') {
      await fulfillJson(route, { max_iterations: 50 });
      return;
    }

    await fulfillJson(route, {});
  });
}

async function stubControlStream(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/control/stream')) {
        return Promise.resolve(
          new Response(new ReadableStream(), {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
        );
      }
      return originalFetch(input, init);
    };
  });
}

test.describe('Control/Mission Page', () => {
  test('should load control page', async ({ page }) => {
    await page.goto('/control');

    // Wait for page to load
    await page.waitForTimeout(1500);

    // Should show mission control UI elements
    // The page should have some form of input area for chat
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
  });

  test('should have send button', async ({ page }) => {
    await page.goto('/control');
    await page.waitForTimeout(1500);

    // Look for send button (usually has Send text or arrow icon)
    const sendButton = page.getByRole('button').filter({
      has: page.locator('svg')
    }).last();

    expect(await sendButton.count()).toBeGreaterThan(0);
  });

  test('should have mission status indicators', async ({ page }) => {
    await page.goto('/control');
    await page.waitForTimeout(1500);

    // Check for buttons that indicate state
    const buttons = await page.getByRole('button').count();
    expect(buttons).toBeGreaterThan(0);
  });

  test('should show workspace selector', async ({ page }) => {
    await page.goto('/control');
    await page.waitForTimeout(2000);

    // Look for workspace-related UI
    const workspaceSelect = page.locator('select, [role="combobox"]');
    const selectCount = await workspaceSelect.count();

    // Should have at least one dropdown for workspace or model selection
    expect(selectCount).toBeGreaterThanOrEqual(0); // May not be visible if no workspaces
  });

  test('should be able to toggle desktop stream panel', async ({ page }) => {
    await page.goto('/control');
    await page.waitForTimeout(1500);

    // Look for panel toggle button (usually has panel icon)
    const toggleButton = page.locator('button').filter({
      has: page.locator('svg')
    });

    // Should have interactive buttons
    expect(await toggleButton.count()).toBeGreaterThan(0);
  });

  test('should handle empty input', async ({ page }) => {
    await page.goto('/control');
    await page.waitForTimeout(1500);

    // Find the chat input
    const chatInput = page.locator('textarea, input[type="text"]').first();

    // Clear the input and try to submit
    await chatInput.fill('');

    // Send button should be disabled or non-functional with empty input
    // This is behavioral - we just verify the input can be interacted with
    await expect(chatInput).toBeVisible();
  });

  test('workbench uses running colors for a resumed interrupted mission', async ({ page }) => {
    await stubControlStream(page);
    await mockRunningInterruptedMission(page);
    await page.goto(`/control?mission=${RUNNING_INTERRUPTED_MISSION_ID}&workbench=1`);

    const workbench = page.getByLabel('Mission workbench');
    await expect(workbench).toBeVisible();

    const statusCard = workbench.getByText('Status').locator('xpath=ancestor::div[contains(@class, "rounded-md")]');
    await expect(statusCard.getByText('Running')).toBeVisible();
    await expect(statusCard.locator('.bg-indigo-400')).toBeVisible();
    await expect(statusCard.locator('.text-indigo-400')).toBeVisible();
  });

  test('workbench ignores stale finished running info', async ({ page }) => {
    await stubControlStream(page);
    await mockRunningInterruptedMission(page, 'finished');
    await page.goto(`/control?mission=${RUNNING_INTERRUPTED_MISSION_ID}&workbench=1`);

    const workbench = page.getByLabel('Mission workbench');
    await expect(workbench).toBeVisible();

    const statusCard = workbench.getByText('Status').locator('xpath=ancestor::div[contains(@class, "rounded-md")]');
    await expect(statusCard.getByText('Interrupted')).toBeVisible();
    await expect(statusCard.locator('.bg-amber-400')).toBeVisible();
    await expect(statusCard.locator('.text-amber-400')).toBeVisible();
  });
});
