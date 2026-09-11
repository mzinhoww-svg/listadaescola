/**
 * Shared across every page emitting structured data (Prompt 15, PRD §14:
 * "JSON-LD apropriado quando aplicável"). `jsonLdScript` started as an
 * inline helper on the school detail page (Prompt 07) -- extracted here
 * once a second/third page needed the exact same escaping, rather than
 * reimplementing it per page.
 */
export function jsonLdScript(data: unknown): string {
  // JSON.stringify doesn't escape "</script>" -- without this replace, a
  // description containing that literal string could break out of the
  // script tag (SEC-005).
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
