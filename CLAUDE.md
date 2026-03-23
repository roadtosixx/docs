# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mintlify documentation site for **RoadShop** — a collection of FiveM (GTA V roleplay) scripts (RoadPhone Pro, RoadPhone, RoadPad, RoadCarPlay, RoadPods, RoadBackup). There is no `package.json` or local build toolchain; Mintlify handles everything.

## Commands

```bash
# Local dev server (requires: npm install -g mintlify)
mintlify dev

# Validate config and check for broken links
mintlify check
```

## Architecture

- **`docs.json`** — Single Mintlify config file defining navigation, theme, logos, colors, and all page references. Every `.mdx` page must be listed here to appear in the site.
- **Product folders** — Each product has its own directory (`roadphone/`, `roadphonepro/`, `roadpad/`, `roadcarplay/`, `roadpods/`, `roadbackup/`) containing installation guides, FAQs, commands, and API docs.
- **Shared pages** — Root-level `.mdx` files (`license-system.mdx`, `common-issues.mdx`, `discord-customer-role.mdx`, `customer-dev.mdx`) are cross-product guides.
- **Two navigation tabs** defined in `docs.json`: **Guides** (user-facing) and **Developer** (API reference).

## MDX Conventions

**Frontmatter** (required on every page):
```mdx
---
title: 'Page Title'
description: 'Short description'
icon: 'lucide-icon-name'
---
```

**Mintlify components used throughout:**
- `<Steps>` / `<Step>` — sequential instructions
- `<Tabs>` / `<Tab>` — framework variants (ESX/QBCore/Qbox)
- `<CodeGroup>` — multiple code alternatives
- `<AccordionGroup>` / `<Accordion>` — collapsible sections (FAQ/troubleshooting)
- `<CardGroup>` / `<Card>` — navigation grids with icons and links
- `<ParamField path="" type="" required>` — command/API parameter docs
- `<ResponseField name="" type="">` — API return value docs
- `<Note>`, `<Warning>`, `<Info>`, `<Tip>` — callout boxes
- `<Frame><img /></Frame>` — styled image containers

## Key Rules

- When adding a new page, always add the corresponding entry in `docs.json` navigation.
- Icons use the **Lucide** icon library.
- Code blocks use language tags with optional labels: `` ```lua config.lua ``, `` ```cfg server.cfg ``.
- Product docs consistently use tabs for framework-specific config (ESX vs QBCore vs Qbox).
