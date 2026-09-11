import { defineConfig, devices } from "@playwright/test";

/**
 * Prompt 17 (testes E2E). No local Supabase stack and no CI runner exist
 * for this project (docs/development/WORKFLOW.md) -- these tests run
 * against the real hosted Supabase project, driven at a running
 * `next dev`/`next start` server. Fixtures are NOT created by Playwright
 * itself (no service-role key belongs in local env -- see
 * docs/security/final-audit.md's secrets section): run
 * supabase/tests/e2e-seed.sql before this suite and
 * supabase/tests/e2e-cleanup.sql after, same seed -> test -> cleanup
 * discipline used throughout this project's live testing. See
 * docs/development/e2e-testing.md for the full runbook.
 *
 * `workers: 1` / `fullyParallel: false` deliberately: fixtures are a
 * small shared dataset (one real school, one seeded list, one seeded
 * store, two seeded users), not isolated per test -- correctness and
 * determinism matter more than wall-clock time for a journeys suite,
 * and there's no CI to parallelize across anyway.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
