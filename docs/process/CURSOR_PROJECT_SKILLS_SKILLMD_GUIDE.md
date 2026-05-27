# Cursor project skills: using `SKILL.md` in the Automation repo

This document explains how the QA and automation team can **author, organize, and review** [Cursor project skills](https://cursor.com) stored under `.cursor/skills/` in this repository. Project skills teach the AI assistant repeatable workflows (for example, how we validate Salesforce → SQL mappings or how we smoke-test Dynamics RDM) while staying aligned with our Playwright + Cucumber framework.

**Related docs:** [QA Cursor getting started](../QA_CURSOR_GETTING_STARTED.md), [Framework documentation](../framework-documentation.md), and the repository [`.cursorrules`](../../.cursorrules) file.

---

## 1. What a project skill is

- A **skill** is a folder that contains a mandatory **`SKILL.md`** file: markdown with a short YAML header plus instructions the agent should follow when the skill applies.
- **Project skills** live in **`.cursor/skills/<skill-name>/`** inside this repo. They are **versioned with Git** and shared with everyone who clones the project.
- **Personal skills** (optional) live in **`~/.cursor/skills/`** on your machine only; use those for individual preferences, not team standards.

Do **not** place custom skills under `~/.cursor/skills-cursor/`; that area is reserved for Cursor’s built-in skills.

---

## 2. Recommended folder layout (team standard)

Use one folder per workflow. Name the folder with **`{system}-{short-task}`** in **lowercase kebab-case**, matching the pattern in our team diagram.

```text
.cursor/skills/
├── salesforce-lead-conversion/
│   ├── SKILL.md                 # Required: instructions + metadata
│   └── assets/                  # Optional: screenshots, diagrams
│       ├── sf-lead-status-path-qualified.png
│       └── README.md            # Optional: index of assets (see §5)
├── dynamics-rdm-party/
│   ├── SKILL.md
│   └── assets/
│       └── d365-rdm-party-search-results.png
├── mulesoft-bordereau-error-check/
│   ├── SKILL.md
│   ├── examples.md              # Optional: concrete prompts / outcomes
│   └── assets/
│       └── anypoint-runtime-error-list.png
└── sqlserver-month-end-validation/
    ├── SKILL.md
    ├── scripts/                 # Optional: read-only helpers (see §7)
    │   └── README.md
    └── assets/
        └── ssms-reporting-db-month-end-rowcounts.png
```

**Rules of thumb**

| Item | Convention |
|------|----------------|
| Skill folder name | `{system}-{task}` e.g. `salesforce-lead-conversion`, `sqlserver-ods-repositoryid-validation` |
| Main file | Always **`SKILL.md`** (exact name, case-sensitive on Linux/macOS CI) |
| Extra docs | **`examples.md`**, **`reference.md`** at the same level as `SKILL.md` (optional) |
| Paths in markdown | Use **forward slashes** (`assets/foo.png`), not backslashes |

---

## 3. `SKILL.md` structure (required metadata + body)

Every `SKILL.md` must start with YAML **frontmatter** and a clear **description** so the agent knows *when* to use the skill.

```markdown
---
name: salesforce-lead-conversion
description: >-
  Guides lead conversion checks in Salesforce and downstream SQL validation for this repo.
  Use when working on lead conversion, SF-xxx features under src/features/kb/sf/lead, or SQL mappings for leads.
---

# Salesforce lead conversion (Automation framework)

## Scope
…

## Framework pointers
…

## Steps
…

## Assets
See [assets/README.md](assets/README.md) for named screenshots.
```

### Frontmatter fields (minimum)

| Field | Purpose |
|--------|---------|
| `name` | Lowercase letters, numbers, hyphens only; max 64 characters; should match the folder theme (does not have to equal folder name but should be consistent). |
| `description` | **Third person**, states **what** the skill does and **when** to use it (triggers: systems, paths, Jira prefixes, tags). Cursor uses this for discovery. |

**Description tips:** Include product names (**Salesforce**, **Dynamics**, **SQL Server**, **MuleSoft**), and paths such as `src/features/integration/sqlserver/` so the skill matches real tasks in this repo.

Keep the main body **focused**; if it grows past ~500 lines, move detail to `reference.md` or `examples.md` and link one level deep from `SKILL.md`.

---

## 4. Mapping skills to systems in *this* framework

Our automation stack spans several systems. Each skill should **point authors and the agent** to the right code and config—**reuse first**, no duplicate utilities (per [`.cursorrules`](../../.cursorrules)).

| System | Typical skill topics | Where code / tests live (indicative) | Config / docs |
|--------|----------------------|----------------------------------------|----------------|
| **Salesforce** | Lead/opportunity flows, UI/API parity, governance | `src/features/ui/SF/`, `src/features/api/SF/`, `src/features/kb/sf/` | `src/config/env/*.json` → `salesforce`; certs / JWT as in README |
| **Dynamics 365** | RDM, party, connectivity, UCI flows | `src/features/ui/dynamics/` | `src/config/env/*.json` → `dynamics`; `docs/dynamics-spn-application-user-setup.md` |
| **SQL Server** | ODS/TDS validation, month-end, SF/Dynamics → SQL checks | `src/features/integration/sqlserver/`, `src/sqlserver/` | `sqlserver` in env JSON; `src/sqlserver/config/databases.json`; `.cursorrules` “SQL Server Module” |
| **MuleSoft** | APIs, bordereau, runtime errors, integration checks | Step definitions under `src/step-definitions/` (e.g. integration); related features | `mulesoft` in env JSON; `docs/setup/MULESOFT_ACCESS_REQUIREMENTS.md` |
| **Jira / Zephyr / GitHub Actions** | Work items, tags, pipelines | `docs/QUICK_START_PROCESS_QA_ITEMS.md`, `docs/process/` | Team process docs |

When you add a skill for a **cross-system** flow (for example Salesforce → SQL), list **both** sides and the shared validation helpers (`src/sqlserver/tests/helpers/validation.ts`, mappings under `src/sqlserver/mappings/`) so implementers do not bypass the standard pattern.

---

## 5. `assets/` folder and screenshot naming

Screenshots and diagrams are optional but valuable for UI-specific or data-grid steps. To avoid ambiguity when **multiple** images exist:

### 5.1 File naming

- Use **descriptive kebab-case** names: **`{system}-{screen-or-topic}-{optional-detail}.png`**
- **Good:** `sf-lead-convert-modal-confirm.png`, `d365-rdm-party-form-account-name.png`, `sql-ssms-ods-party-by-repositoryid.png`
- **Avoid:** `screenshot1.png`, `image.png`, `tmp.png`

Include **format** in the extension (`.png`, `.jpg`, `.svg`) and keep names stable after review so links in `SKILL.md` do not break.

### 5.2 Pointing to assets from `SKILL.md`

Use **relative links** from `SKILL.md` so they work in the repo and in Cursor:

```markdown
## UI reference

- Qualified path on Lead: see [Lead status path (Qualified)](assets/sf-lead-status-path-qualified.png).
- Dynamics party search: [RDM party search results](assets/d365-rdm-party-search-results.png).
```

### 5.3 Optional `assets/README.md` index

For skills with **many** screenshots, add `assets/README.md` as a **catalog**:

| Filename | What it shows | Referenced in SKILL.md section |
|----------|----------------|----------------------------------|
| `sf-lead-convert-modal-confirm.png` | Convert modal with Confirm | § Steps → Convert |
| `sf-lead-status-path-qualified.png` | Path field when Qualified | § Preconditions |

This gives humans and the agent a single place to resolve “which screenshot is which.”

---

## 6. Optional: `examples.md`

Use **`examples.md`** for:

- Example **user prompts** that should trigger this skill
- Example **expected outcomes** (e.g. “agent should run feature X with tag @Y”)
- **Anti-examples** (“do not create a new SqlClient in the feature file”)

Link it once from `SKILL.md` under an “Examples” heading.

---

## 7. Optional: `scripts/`

The **`scripts/`** folder is for **small, repeatable** helpers (for example, a read-only script that formats a query result). **Document in `SKILL.md`:**

- Whether the agent should **run** the script or **read** it as reference
- Any prerequisites (Node version, `ENV`, VPN)

Prefer reusing framework code under `src/` over duplicating logic inside `.cursor/skills/`.

---

## 8. Security and compliance

- **Never** put secrets, passwords, tokens, connection strings, or client IDs in `SKILL.md` or any file under `.cursor/skills/`.
- Point to **environment variables** and **`.env` patterns** already described in `docs/setup/` and `src/config/env/env.sample`.
- For screenshots, **blur or crop** sensitive data before committing.

---

## 9. How the team uses these skills in Cursor

1. **Discover:** With project skills enabled in Cursor, the agent can use the `description` field to decide when a skill applies.
2. **Explicit context:** You can **@ mention** a skill folder or `SKILL.md` in chat when you want that workflow followed for a specific task.
3. **Review in PRs:** Treat changes under `.cursor/skills/` like documentation: at least one reviewer should confirm accuracy against the framework and naming rules in this guide.

---

## 10. Review checklist (before merging)

- [ ] Folder name is `{system}-{task}` kebab-case; **`SKILL.md` is present** and frontmatter is valid.
- [ ] **Description** states what/when in third person and mentions relevant **systems** and **paths** in this repo.
- [ ] Instructions align with **`.cursorrules`**: reuse page objects, field registry, factories, shared steps—no one-off patterns unless justified.
- [ ] **Assets** use descriptive filenames; **multiple** assets are listed or indexed so they are easy to reference.
- [ ] No secrets; sensitive screenshots redacted.
- [ ] Large content is split into `examples.md` / `reference.md` if needed; links are one level deep from `SKILL.md`.

---

## 11. Summary

| Goal | Action |
|------|--------|
| Share a team workflow with Cursor | Add a folder under **`.cursor/skills/{system}-{task}/`** with **`SKILL.md`**. |
| Help the agent find the right skill | Write a rich **`description`** (systems, folders, Jira/tag hints). |
| Attach screenshots | Put them in **`assets/`** with **descriptive names**; link from `SKILL.md` and optionally maintain **`assets/README.md`**. |
| Stay consistent with our tests | Reference the real paths in **`src/features/`**, **`src/sqlserver/`**, and config from **`src/config/env/`**. |

For day-to-day Cursor usage (running tests, VPN, tags), start with [QA Cursor getting started](../QA_CURSOR_GETTING_STARTED.md).
