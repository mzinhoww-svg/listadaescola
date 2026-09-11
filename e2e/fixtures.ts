import type { Page } from "@playwright/test";

/**
 * Values captured from running supabase/tests/e2e-seed.sql once (see
 * docs/development/e2e-testing.md). `school` is a REAL, existing MT
 * school (schools is INEP master data -- never fabricated, CLAUDE.md);
 * everything else was created by the seed script, prefixed `e2e-p17-`.
 * Re-running the seed script picks the same school again (ordered by
 * inep_code, a permanent identifier), so these stay valid.
 */
export const FIXTURE = {
  school: {
    id: "12a1bb8b-e174-4672-8db0-dd95c24532aa",
    slug: "emcarlos-pompermayer-comodoro-0016",
    uf: "MT",
    municipality: "Comodoro",
    name: "EMCARLOS POMPERMAYER",
    searchTerm: "POMPERMAYER",
  },
  list: {
    id: "a936d5c2-bc8d-4f04-814a-e85eaab6e2e8",
    slug: "e2e-p17-lista-12a1bb8b",
    seriesName: "5º Ano",
    schoolYear: 2026,
  },
  store: {
    id: "e586345c-8900-4d42-8edf-6da9ee1cd421",
    name: "E2E Prompt17 Papelaria",
  },
  users: {
    user: { id: "9713b0a9-d828-4a62-aef0-fb6a7d1d58d9", email: "e2e-p17-user@example.com", password: "E2ePr0mpt17!" },
    userB: { id: "332cb8c5-b8a1-457a-a9e9-bf0b8f6f2f7d", email: "e2e-p17-user-b@example.com", password: "E2ePr0mpt17!" },
    admin: { id: "3f0de398-c915-4d27-ab17-2d3d3f4f2d41", email: "e2e-p17-admin@example.com", password: "E2ePr0mpt17!" },
  },
};

export interface TestUser {
  email: string;
  password: string;
}

/** Logs in via the real form + Server Action -- never a shortcut/cookie hack.
 * Only navigates to a fresh /auth/entrar if not already there: a caller
 * that arrived via a protected-route redirect (?next=...) needs that
 * query string preserved, not discarded by a second bare navigation. */
export async function loginAs(page: Page, user: TestUser): Promise<void> {
  if (!page.url().includes("/auth/entrar")) {
    await page.goto("/auth/entrar");
  }
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/entrar"));
}

/** Switching identity mid-spec: clearing cookies is more robust than
 * hunting for a nav logout control that may not exist on every page. */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
}

export interface DraftSubmissionOptions {
  seriesName: string;
  schoolYear: string;
}

/**
 * Drives the real enviar-lista wizard (School → Série/Ano) through
 * `startSubmissionAction`, landing on the itens step. Returns the new
 * submission id (parsed from the URL) so callers can add items,
 * continue to revisão, and submit -- or, for the IDOR test, hand the id
 * to a different logged-in user and confirm it's unreachable.
 */
export async function startDraftSubmission(page: Page, opts: DraftSubmissionOptions): Promise<string> {
  await page.goto("/enviar-lista");
  await page.getByLabel("Nome da escola ou código INEP").fill(FIXTURE.school.searchTerm);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("button", { name: new RegExp(FIXTURE.school.name) }).click();
  await page.getByLabel("Etapa de ensino").selectOption({ label: "Ensino Fundamental" });
  await page.getByLabel("Série/ano escolar").fill(opts.seriesName);
  await page.getByLabel("Ano letivo").selectOption(opts.schoolYear);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/enviar-lista\/[^/]+\/itens/);

  const match = page.url().match(/\/enviar-lista\/([^/]+)\/itens/);
  if (!match) throw new Error(`could not extract submission id from ${page.url()}`);
  return match[1];
}

/** Adds one item on the itens step -- assumes the wizard is already
 * there (right after startDraftSubmission). */
export async function addWizardItem(page: Page, name: string): Promise<void> {
  // getByLabel("Item") also substring-matches the "Item obrigatório"
  // checkbox's accessible name -- scope by role, same fix pattern as
  // every other label-collision this project has hit (docs/architecture/analytics-vendas.md).
  await page.getByRole("textbox", { name: "Item" }).fill(name);
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.getByText(name).waitFor();
}

/** Walks itens (already has ≥1 item) → anexo (skipped) → revisão →
 * submit, ending on the confirmação step. */
export async function submitWizard(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.waitForURL(/\/anexo$/);
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.waitForURL(/\/revisao$/);
  await page.getByRole("button", { name: "Enviar para moderação" }).click();
  await page.waitForURL(/\/confirmacao$/);
}
