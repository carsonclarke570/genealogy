import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Our Family Archive",
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const hasError = searchParams?.error === "1";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-xl)",
        background: "var(--color-bg)",
        color: "var(--color-ink)",
      }}
    >
      <form
        method="POST"
        action="/api/login"
        className="fa-card"
        style={{
          width: "min(360px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
        }}
      >
        <header>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "1.5rem",
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          >
            Our Family Archive
          </h1>
          <p
            style={{
              margin: "var(--space-xs) 0 0",
              fontSize: "var(--text-body-sm)",
              color: "var(--color-muted)",
            }}
          >
            This archive is private. Enter the password to continue.
          </p>
        </header>

        <div className="fa-field">
          <label className="fa-field__label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            className={`fa-input${hasError ? " fa-input--invalid" : ""}`}
          />
          {hasError ? (
            <p className="fa-field__error">Incorrect password. Try again.</p>
          ) : null}
        </div>

        <button type="submit" className="fa-btn fa-btn--primary fa-btn--block">
          Enter
        </button>
      </form>
    </main>
  );
}
