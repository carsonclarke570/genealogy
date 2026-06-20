import type { Metadata } from "next";
import { Hanken_Grotesk, Spectral } from "next/font/google";
import "@family-archive/ui/styles.css";
import "./app.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Production font strategy (see DESIGN.md + comments in the design system's
// fonts.css/tokens.css): self-host the brand fonts via next/font so they are
// preloaded with a size-adjusted fallback — no render-blocking Google @import,
// no flash of system fonts. These override the design-system's --font-sans /
// --font-serif token stacks on <html>.
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});
const serif = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Whitfield Family Archive",
  description:
    "A private archive for recording and exploring the Whitfield family — people, relationships, and the documents that prove them.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Set data-theme before paint so there is no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
