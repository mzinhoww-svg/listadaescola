"use client";

import { useEffect } from "react";

/**
 * Prompt 19 (produção): catches an error thrown by the root layout itself
 * (src/app/layout.tsx) -- the one place error.tsx can't reach, since it
 * only covers segments below the root. Next.js requires this file to
 * render its own <html>/<body>, replacing the root layout entirely when
 * it triggers, so it deliberately doesn't import the design system or
 * globals.css: if the root layout is what broke, depending on more of the
 * app to render the error page risks the same failure.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "24rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Algo deu errado</h1>
          <p style={{ color: "#525252", marginBottom: "1.5rem" }}>
            Não foi possível carregar o Listada Escola agora. Tente novamente em alguns instantes.
          </p>
          <button
            onClick={reset}
            style={{
              height: "2.75rem",
              padding: "0 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d4d4d4",
              background: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
