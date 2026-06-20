"use client";

import { useEffect, useState } from "react";
import { Avatar, Button, Toast } from "@family-archive/ui";
import { getResolvedTheme, toggleTheme, type Theme } from "@/lib/theme";
import { Icon, type IconName } from "./Icon";
import { Explorer } from "./Explorer";
import { PersonRecord } from "./PersonRecord";
import { Gallery } from "./Gallery";
import { Search } from "./Search";
import { AddPerson } from "./AddPerson";
import type { TreeMode } from "@/lib/tree-layout";

export type Screen = "explorer" | "person" | "gallery" | "search" | "add";

interface Route {
  screen: Screen;
  personId: string;
}

const NAV: [Screen, string, IconName][] = [
  ["explorer", "Explorer", "tree"],
  ["search", "Search", "search"],
  ["gallery", "Media archive", "gallery"],
  ["add", "Add person", "plus"],
];

const TITLES: Record<Screen, string> = {
  explorer: "Family explorer",
  person: "Person record",
  gallery: "Media archive",
  search: "Search the archive",
  add: "Add a person",
};

export function AppShell() {
  const [route, setRoute] = useState<Route>({ screen: "explorer", personId: "eleanor" });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [layout, setLayout] = useState<TreeMode>("vertical");
  const [theme, setThemeState] = useState<Theme>("light");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setThemeState(getResolvedTheme());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const navigate = (screen: Screen, personId?: string) =>
    setRoute((r) => ({ screen, personId: personId ?? r.personId }));
  const openPerson = (personId: string, mode?: "edit") =>
    mode === "edit" ? navigate("add", personId) : navigate("person", personId);

  return (
    <div className="app">
      <aside className="app-side">
        <div className="app-brand">
          <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
            <Icon name="tree" size={22} />
          </span>
          <div>
            <div className="app-brand-name">Whitfield</div>
            <div className="app-brand-sub">family archive</div>
          </div>
        </div>
        <nav style={{ display: "grid", gap: 4 }}>
          {NAV.map(([k, label, icon]) => (
            <button
              key={k}
              className={"app-nav" + (route.screen === k ? " on" : "")}
              onClick={() => navigate(k)}
            >
              <Icon name={icon} /> {label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "grid", gap: "var(--space-md)" }}>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            iconStart={<Icon name={theme === "light" ? "moon" : "sun"} size={16} />}
            onClick={() => setThemeState(toggleTheme())}
          >
            <span style={{ marginLeft: 2 }}>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </Button>
          <div className="app-curator">
            <Avatar name="Sarah Bain" size="sm" />
            <div style={{ fontSize: "var(--text-body-sm)" }}>
              <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>Sarah Bain</div>
              <div className="app-muted" style={{ fontSize: "var(--text-label)" }}>
                Curator
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-top">
          <div className="app-top-title">{TITLES[route.screen]}</div>
          <div className="app-search" style={{ marginLeft: "auto" }} onClick={() => navigate("search")}>
            <Icon name="search" />
            <span>Search people &amp; docs</span>
          </div>
          <Button variant="primary" iconStart={<Icon name="plus" size={16} />} onClick={() => navigate("add")}>
            Add person
          </Button>
        </header>

        <div className="app-body">
          {route.screen === "explorer" && (
            <Explorer
              layout={layout}
              setLayout={setLayout}
              focusId={focusId}
              setFocusId={setFocusId}
              onOpen={openPerson}
            />
          )}
          {route.screen === "person" && (
            <PersonRecord id={route.personId} onOpen={openPerson} onNavigate={navigate} />
          )}
          {route.screen === "gallery" && <Gallery onOpen={openPerson} />}
          {route.screen === "search" && <Search onOpen={openPerson} onNavigate={navigate} />}
          {route.screen === "add" && <AddPerson onNavigate={navigate} onToast={setToast} />}
        </div>
      </main>

      {toast && (
        <div
          style={{
            position: "fixed",
            right: "var(--space-xl)",
            bottom: "var(--space-xl)",
            zIndex: 1400,
          }}
        >
          <Toast tone="success" title="Saved" onDismiss={() => setToast(null)}>
            {toast}
          </Toast>
        </div>
      )}
    </div>
  );
}
