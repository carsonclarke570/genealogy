# Product

## Register

product

## Users

A small, trusted group: the curator (the primary owner who builds and maintains the
tree) plus a few family contributors who are mostly tech-comfortable. Everyone is
authenticated — there is no public or anonymous audience. People arrive with a
concrete task in mind: add or correct a person, trace a relationship, find a photo
or certificate, or simply explore how the family connects. Sessions are
intermittent and reference-like, not daily-driver, so the interface must be
immediately legible without re-learning it each visit.

## Product Purpose

A private web application for recording and exploring a family genealogy tree. It
exists to be the single, durable source of truth for the family's history: the
people, the relationships between them, and the documents that prove and enrich the
record (photos, birth/death certificates, news articles, obituaries).

Three core jobs:
- **Explore** an interactive, searchable family-tree graph of people and their
  relationships.
- **Record** rich biographical detail for each person — names, dates, places, notes,
  and links to others.
- **Archive** media: upload and attach images and PDFs to the people they document.

Success looks like a relative opening the app, finding the person or document they
came for in seconds, trusting that what they see is accurate, and occasionally
staying longer than they meant to because the tree is genuinely explorable. It is a
keepsake that happens to be software — low-maintenance, self-contained, and built to
outlast trends.

## Brand Personality

Quiet, precise, trustworthy. The voice is plain and respectful — it talks about
people and records, never about "engagement." Warmth comes from the content (faces,
handwriting, dates that mean something), not from decorative chrome. Think the calm
confidence of a well-kept archive or a tool like Linear or Notion: efficient,
unfussy, and out of the way. The emotional goal is reassurance and a little wonder —
never sentimentality manufactured by the UI itself.

## Anti-references

- **Ancestry.com / corporate genealogy SaaS** — busy, commercial, ad- and
  upsell-driven, cluttered dashboards, stock imagery. This is private and
  ad-free; nothing is selling anything.
- **Cheesy skeuomorphic "heritage"** — faux parchment, sepia overload, scrollwork,
  ornate script fonts, fake-wood/leather textures. Heritage is conveyed by the
  records, not by costume.
- **Generic AI-SaaS template** — cream/sand body background, tracked-uppercase
  eyebrows over every section, identical icon-card grids, gradient text. The
  category-default look; avoid it.
- **Social network feed** — likes, activity streams, notifications, infinite scroll,
  engagement-bait patterns. This is a private archive, not a network.

## Design Principles

- **The tool disappears.** The family is the content; the UI is the frame. Earned
  familiarity over novelty — standard affordances so any relative can use it without
  a tutorial.
- **Warmth from content, not chrome.** Photos, handwriting, and real dates carry the
  emotion. The interface stays calm and quiet so the records can speak.
- **Records are sacred.** Accuracy, provenance, and the privacy of sensitive
  documents (certificates, records of living people) come before convenience or
  flourish. Never serve a protected document without an authenticated session.
- **Built to last.** Boring, well-supported, self-contained choices over trends.
  This should still work and still feel right in ten years.
- **Restraint as trust.** No upsells, no metrics theater, no decoration for its own
  sake. What's on screen is there because the task needs it.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body text ≥ 4.5:1 contrast; large text ≥ 3:1. Full keyboard
operability across the tree graph, records, and uploads, with visible focus states.
Honor `prefers-reduced-motion` — the explorable tree and any transitions must have a
non-animated path. Although today's contributors are tech-comfortable, the family
may widen over time, so keep targets generous, language jargon-free, and never rely
on color alone to convey state or relationship type.
