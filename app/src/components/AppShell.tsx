"use client";

import { useEffect, useState } from "react";
import { Avatar, Button, Toast } from "@family-archive/ui";
import { getResolvedTheme, toggleTheme, type Theme } from "@/lib/theme";
import { DatasetProvider } from "@/lib/dataset";
import type { Dataset } from "@/lib/family-data";
import { Icon, type IconName } from "./Icon";
import { Explorer } from "./Explorer";
import { PersonRecord } from "./PersonRecord";
import { Gallery } from "./Gallery";
import { Search } from "./Search";
import { AddPerson } from "./AddPerson";
import { Timeline } from "./Timeline";
import type { TreeMode } from "@/lib/tree-layout";

export type Screen = "explorer" | "person" | "gallery" | "search" | "add" | "timeline";

interface Route {
  screen: Screen;
  personId: string;
  /** When on the "add" screen, the person being edited — null means a fresh add. */
  editId: string | null;
}

const NAV: [Screen, string, IconName][] = [
  ["explorer", "Explorer", "tree"],
  ["timeline", "Timeline", "clock"],
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
  timeline: "Family timeline",
};

export function AppShell({ data }: { data: Dataset }) {
  const [route, setRoute] = useState<Route>({ screen: "explorer", personId: "eleanor", editId: null });
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

  // Any ordinary navigation clears edit mode; only openPerson(id, "edit") sets it.
  const navigate = (screen: Screen, personId?: string) =>
    setRoute((r) => ({ screen, personId: personId ?? r.personId, editId: null }));
  const openPerson = (personId: string, mode?: "edit") =>
    mode === "edit"
      ? setRoute((r) => ({ screen: "add", personId: r.personId, editId: personId }))
      : navigate("person", personId);

  return (
    <DatasetProvider value={data}>
    <div className="app">
      <aside className="app-side">
        <div className="app-brand">
          <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
            <Icon name="tree" size={22} />
          </span>
          <div>
            <div className="app-brand-name">Our Family</div>
            <div className="app-brand-sub">family archive</div>
          </div>
        </div>
        <nav className="app-nav-list">
          {NAV.map(([k, label, icon]) => (
            <button
              key={k}
              className={"app-nav" + (route.screen === k ? " on" : "")}
              aria-current={route.screen === k ? "page" : undefined}
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
          <div className="app-top-title">
            {route.screen === "add" && route.editId ? "Edit person" : TITLES[route.screen]}
          </div>
          <button
            type="button"
            className="app-search app-hide-mobile"
            style={{ marginLeft: "auto" }}
            aria-label="Search people and documents"
            onClick={() => navigate("search")}
          >
            <Icon name="search" />
            <span>Search people &amp; docs</span>
          </button>
          <button
            className="app-iconbtn app-only-mobile"
            style={{ marginLeft: "auto" }}
            aria-label={theme === "light" ? "Dark mode" : "Light mode"}
            onClick={() => setThemeState(toggleTheme())}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
          </button>
          <span className="app-hide-mobile">
            <Button variant="primary" iconStart={<Icon name="plus" size={16} />} onClick={() => navigate("add")}>
              Add person
            </Button>
          </span>
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
            <PersonRecord id={route.personId} onOpen={openPerson} onNavigate={navigate} onToast={setToast} />
          )}
          {route.screen === "timeline" && <Timeline onOpen={openPerson} onNavigate={navigate} />}
          {route.screen === "gallery" && <Gallery onOpen={openPerson} onToast={setToast} />}
          {route.screen === "search" && <Search onOpen={openPerson} onNavigate={navigate} />}
          {route.screen === "add" && (
            <AddPerson
              key={route.editId ?? "new"}
              editId={route.editId}
              onNavigate={navigate}
              onToast={setToast}
            />
          )}
        </div>
      </main>

      <nav className="app-mobnav">
        {NAV.map(([k, label, icon]) => (
          <button
            key={k}
            className={"app-mobnav-item" + (route.screen === k ? " on" : "")}
            aria-current={route.screen === k ? "page" : undefined}
            onClick={() => navigate(k)}
          >
            <Icon name={icon} />
            <span>{label === "Media archive" ? "Media" : label === "Add person" ? "Add" : label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className="app-toast-viewport">
          <Toast tone="success" title="Saved" onDismiss={() => setToast(null)}>
            {toast}
          </Toast>
        </div>
      )}
    </div>
    </DatasetProvider>
  );
}
