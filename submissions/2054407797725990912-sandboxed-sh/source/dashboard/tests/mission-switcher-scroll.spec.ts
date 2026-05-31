import { test, expect, type Page, type Route } from '@playwright/test';

// Regression test for the Cmd+K mission switcher scroll-yank bug.
//
// History: scroll-to-selected used to re-run on every `renderedRows` array
// change. SWR poll refetches (every 3–5s) and the late-arriving server
// search rescore both produce new `renderedRows` references, so users who
// had manually scrolled were yanked back to the selected row (often row 0)
// each time. The fix gates `scrollToIndex` to fire only on real selection
// or query changes; this test pins that behavior.

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  });
}

function buildMission(i: number) {
  const id = `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
  return {
    id,
    title: `Mission ${i} — audit ${i % 3 === 0 ? 'token' : 'state'} projection`,
    short_description: `Investigate item ${i}`,
    status: 'completed' as const,
    workspace_id: 'ws-1',
    workspace_name: 'ws',
    backend: 'claudecode',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: `2026-01-${(i % 27 + 1).toString().padStart(2, '0')}T00:00:00Z`,
    history: [],
    resumable: false,
  };
}

async function mockMissionsApi(
  page: Page,
  options: { missionCount?: number; searchResponseDelayMs?: number } = {}
) {
  const missionCount = options.missionCount ?? 60;
  const searchDelay = options.searchResponseDelayMs ?? 800;
  let pollCount = 0;
  const baseMissions = Array.from({ length: missionCount }, (_, i) => buildMission(i));

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

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

    if (path === '/api/health') {
      await fulfillJson(route, { auth_required: false, auth_mode: 'disabled', max_iterations: 50 });
      return;
    }
    if (path === '/api/control/missions') {
      // Mutate one mission's updated_at each poll so SWR sees the data as
      // changed and re-renders — the situation that used to yank scroll.
      pollCount += 1;
      const mutated = baseMissions.map((m, i) =>
        i === 0
          ? { ...m, updated_at: `2026-05-${(pollCount % 27 + 1).toString().padStart(2, '0')}T00:00:00Z` }
          : m
      );
      await fulfillJson(route, mutated);
      return;
    }
    if (path === '/api/control/missions/current') {
      await fulfillJson(route, null);
      return;
    }
    if (path === '/api/control/running') {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/control/missions/search') {
      // Simulate the slow server response that used to trigger a "second yank".
      await new Promise((r) => setTimeout(r, searchDelay));
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const matches = baseMissions
        .filter((m) => m.title.toLowerCase().includes(q))
        .map((mission, idx) => ({ mission, relevance_score: 100 - idx }));
      await fulfillJson(route, matches);
      return;
    }
    if (path === '/api/workspaces') {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/control/queue' || path === '/api/desktop/sessions') {
      await fulfillJson(route, []);
      return;
    }
    if (path === '/api/control/progress') {
      await fulfillJson(route, { run_state: 'idle', queue_len: 0 });
      return;
    }

    await fulfillJson(route, {});
  });
}

async function openCmdKAndGetScroller(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Meta+k');
  await page.waitForSelector('input[placeholder="Search missions..."]');
  // The scroller is the only z-50 descendant with overflow-y:auto and clientHeight ~400.
  const handle = await page.evaluateHandle(() => {
    const candidates = Array.from(document.querySelectorAll('div'));
    for (const el of candidates) {
      const cs = getComputedStyle(el);
      if (cs.overflowY !== 'auto') continue;
      if (el.clientHeight < 200 || el.clientHeight > 500) continue;
      let p: HTMLElement | null = el;
      while (p) {
        if (p.classList?.contains('z-50')) return el;
        p = p.parentElement;
      }
    }
    return null;
  });
  expect(handle).toBeTruthy();
  return handle;
}

test.describe('Cmd+K mission switcher scroll', () => {
  test('SWR poll refetch with changed data does not yank scroll', async ({ page }) => {
    await mockMissionsApi(page, { missionCount: 60 });
    const scroller = await openCmdKAndGetScroller(page);

    // Establish a tall, scrollable list, then scroll the user away from the top.
    const initial = await scroller.evaluate((el: HTMLDivElement) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight + 1000);

    await scroller.evaluate((el: HTMLDivElement) => {
      el.scrollTo({ top: 1200 });
    });
    expect(await scroller.evaluate((el: HTMLDivElement) => el.scrollTop)).toBe(1200);

    // Wait long enough to cover at least two SWR polls (the list refetches
    // every 5s and the running-missions list every 3s). Without the fix,
    // each poll re-runs scrollToIndex(0, 'auto') and yanks scrollTop back.
    await page.waitForTimeout(7000);

    const scrollTopAfter = await scroller.evaluate((el: HTMLDivElement) => el.scrollTop);
    expect(scrollTopAfter).toBe(1200);
  });

  test('late server search response does not yank scroll', async ({ page }) => {
    await mockMissionsApi(page, { missionCount: 60, searchResponseDelayMs: 1000 });
    const scroller = await openCmdKAndGetScroller(page);

    // Scroll to mid-list first, then type a query. Typing should yank to
    // the top — that's the intentional UX. We capture that first.
    await scroller.evaluate((el: HTMLDivElement) => el.scrollTo({ top: 1200 }));
    const searchInput = page.getByPlaceholder('Search missions...');
    await searchInput.fill('audit');

    // Give the local filter time to apply, then verify the intentional
    // scroll-to-top happened.
    await page.waitForTimeout(150);
    const afterFilter = await scroller.evaluate((el: HTMLDivElement) => el.scrollTop);
    expect(afterFilter).toBe(0);

    // Now scroll within the filtered results before the server response lands.
    await scroller.evaluate((el: HTMLDivElement) => el.scrollTo({ top: 300 }));
    expect(await scroller.evaluate((el: HTMLDivElement) => el.scrollTop)).toBe(300);

    // Wait past the mocked server response (>= 1000ms delay + render commit).
    await page.waitForTimeout(1800);

    // The late server scores must not yank scroll back to the top.
    const finalScrollTop = await scroller.evaluate((el: HTMLDivElement) => el.scrollTop);
    expect(finalScrollTop).toBe(300);
  });
});
