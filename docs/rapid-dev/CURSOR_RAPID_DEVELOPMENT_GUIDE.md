# RapidDev — Developer Tool & POC Repository

**What this is:** A **developer workspace** for building and proving changes in Salesforce (and related) sandboxes using **Cursor**, scripted deploys, API clients, and optional verification runs — before you promote via Gearset or your release pipeline.

**Who this is for:** Application developers, solution designers, and technical leads doing **rapid POCs** — not a QA-only or “test automation specialist” toolkit.

**Companion presentation:** [`RapidDev-Cursor-Presentation.html`](./RapidDev-Cursor-Presentation.html) (browser: **← →** navigate, **N** = speaker notes).

**Team blueprint (source of truth):** [`build.md`](./build.md) — delivery modes, governance, review checkpoints, promotion criteria.

**New to Cursor?** Start with **Part 1**, then **Part 2** (delivery model), then setup and POC workflow.

---

## Part 2 — Delivery model (organization standard)

Engineering intent: balance **speed for the business** with **architectural controls** as AI-assisted delivery scales. **Cursor** is the only AI IDE. **RapidDev** is the workspace for **TS2**; **TS1** uses Cursor for discovery (spike branch or separate folder — prototype output only).

### Two tracks

| Track | Name | Tooling | Output | Who decides promote |
|-------|------|---------|--------|---------------------|
| **TS1** | Rapid Prototyping | **Cursor** (discovery / spike — not production promote) | **Prototype artifacts** — not production-ready SF metadata | N/A — do not promote without TS2 |
| **TS2** | Sandbox Build | **Cursor** + sandbox + **RapidDev** | Reviewed metadata & scripts | **Salesforce engineer** |

**TS2 engineer responsibilities (non-delegable):**

- Decompose the request  
- Review AI-generated metadata against org standards  
- Validate dependencies, permissions, naming  
- Decide what is safe to promote  
- Override AI when output is wrong or incomplete  

Cursor **accelerates execution**; it does **not** replace engineering accountability.

### Baseline process (every AI-assisted change)

| # | Step |
|---|------|
| 1 | Capture requirement — **link Jira** |
| 2 | Build in sandbox (**TS2**) or prototype (**TS1**) |
| 3 | **Review** org patterns and dependencies |
| 4 | Add/update tests (Apex + repo verification as applicable) |
| 5 | **Promote via Gearset** to QA (per release practice) |
| 6 | **Audit trail** — Jira comment + deployment summary |
| 7 | Proceed only once validated in target environment |

Full detail, PR template, and promotion gates: **[`build.md`](./build.md)**.

### Architecture governance

At scale, the main risk is **cumulative inconsistency** across the org. Every TS2 change should align with standards for:

- Naming conventions  
- CMT usage patterns  
- Flow vs Apex decisioning  
- Permission handling  
- Deployment boundaries  
- Rollback expectations  
- Integration dependencies  

Without this, style drifts with prompts and individuals. Definitions live in **`build.md`** and evolve with your architecture group.

### Cursor rules & skills (repeatable team-wide)

| Asset | Location | Purpose |
|-------|----------|---------|
| **build.md** | `docs/rapid-dev/build.md` | Onboarding + delivery source of truth |
| **Project rules** | `.cursorrules` | TS1/TS2 + TS2 workflow (top of file) |
| **Delivery skill** | `.cursor/skills/ai-assisted-delivery/SKILL.md` | Decompose requirements, impact, prototype vs build, override AI |
| **Path rule** | `.cursor/rules/rapid-dev-delivery.mdc` | Auto-context for metadata & deploy scripts |

**Recommended Agent prefix:**

```text
@docs/rapid-dev/build.md @.cursor/skills/ai-assisted-delivery/SKILL.md @.cursorrules

Jira: SF-XXXX · Track: TS2
<your requirement>
```

---

## Part 1 — Getting started with Cursor IDE

This section assumes you have used **VS Code** or similar editors, but **not** Cursor’s AI features.

### 1.1 What is Cursor?

| Topic | Explanation |
|-------|-------------|
| **What** | **Cursor** is a code editor (a fork of VS Code) with built-in AI that can read your **open project**, edit files, and run terminal commands. |
| **vs ChatGPT in a browser** | Cursor sees your repo, applies multi-file edits, and follows project rules (e.g. `.cursorrules` in RapidDev). |
| **vs GitHub Copilot** | Copilot mainly suggests lines as you type; Cursor **Agent** can plan and execute a whole task across many files. |
| **Cost** | Your organisation may provide a **Cursor Business/Team** seat — ask IT or your lead. |

Official site: [https://cursor.com](https://cursor.com) · Docs: [https://docs.cursor.com](https://docs.cursor.com)

### 1.2 Install Cursor (Windows)

1. Go to [https://cursor.com](https://cursor.com) → **Download**.
2. Run the installer (`.exe`) — accept defaults unless IT says otherwise.
3. Launch **Cursor** from the Start menu.
4. **Optional:** Import settings from **VS Code** on first run.

### 1.3 Sign in and updates

1. Profile / account icon → **Sign in** (company email or SSO).
2. Enable **automatic updates** when prompted.

Without signing in, AI features may be disabled or limited.

### 1.4 Main window (30-second tour)

```
┌─────────────────────────────────────────────────────────────┐
│  Menu bar   File  Edit  Selection  View  Terminal  …        │
├──────────┬──────────────────────────────────┬───────────────┤
│ Explorer │   Editor (code / diffs)          │  AI panel     │
│ Search   │                                  │  Chat / Agent │
│ Git      │                                  │               │
├──────────┴──────────────────────────────────┴───────────────┤
│  Terminal — npm, deploy scripts, git                        │
└─────────────────────────────────────────────────────────────┘
```

| Area | Use it for |
|------|------------|
| **Explorer** | `metadata/`, `scripts/`, `src/api-clients/`, etc. |
| **Editor** | Review Agent **diffs** before Accept |
| **AI panel** | **Chat** (questions) or **Agent** (POC implementation) |
| **Terminal** | `npm run c2c:deploy:…`, `npm run build`, `git` |

### 1.5 Four ways to use AI

| Mode | How to open | Best for |
|------|-------------|----------|
| **Tab completion** | Type; accept ghost text with `Tab` | Small edits while coding |
| **Inline edit** | Select code → `Ctrl+K` | Local refactor of one area |
| **Chat** | `Ctrl+L` | “What does this deploy script do?” |
| **Agent** | `Ctrl+I` or AI panel → **Agent** | **POC work**: metadata, scripts, multi-file changes |

**For RapidDev POCs, use Agent** when the task spans files or needs `npm run …`.

**In this repo:** Agent follows [`.cursorrules`](../../.cursorrules) — clarify requirements, reuse existing clients/scripts, verify before calling work “done”.

### 1.6 Essential shortcuts (Windows)

| Action | Shortcut |
|--------|----------|
| Open folder | **File → Open Folder** or `Ctrl+K` `Ctrl+O` |
| Command Palette | `Ctrl+Shift+P` |
| Chat | `Ctrl+L` |
| Agent | `Ctrl+I` (or AI panel) |
| Inline edit | `Ctrl+K` |
| Terminal | `` Ctrl+` `` |
| Save | `Ctrl+S` |

### 1.7 `@` mentions (point Agent at the right code)

| Mention | Example | When to use |
|---------|---------|-------------|
| **@Files** | `@deploy-c2c-home-flexipages.ts` | One script or module |
| **@Folders** | `@metadata/c2c/flexipages` | All POC metadata for an env |
| **@Codebase** | `@Codebase salesforce-auth` | Semantic search (use sparingly) |

```text
@.cursorrules @metadata/c2c/flexipages @scripts/deploy-c2c-home-flexipages.ts

Deploy role-based Home pages to ENV=c2c and list rollback steps.
```

### 1.8 Reviewing Agent changes

1. Inspect each file in the diff list.
2. **Accept** / **Reject** per file or hunk — treat like a PR review.
3. Check for secrets, wrong paths, or scope creep.
4. Run `npm run build` or your deploy script in the terminal.

### 1.9 Integrated terminal

`` Ctrl+` `` → PowerShell at repo root (folder with `package.json`).

If `node` or `az` works in Windows Terminal but not in Cursor, fix **PATH** and restart Cursor.

### 1.10 First exercise (5 minutes)

1. **File → Open Folder** → `RapidDev` root.
2. Open **Agent**, paste:

```text
@.cursorrules @docs/rapid-dev/CURSOR_RAPID_DEVELOPMENT_GUIDE.md

In five bullets: what is RapidDev as a dev POC repo? Do not edit any files.
```

3. Confirm `.cursorrules` appears in Explorer at the repo root.

### 1.11 Cursor troubleshooting

| Problem | Try this |
|---------|----------|
| No AI | Sign in; check company license |
| Wrong project edited | Open **Folder** = `RapidDev` root only |
| `@file` missing | Pick from dropdown after typing `@` |
| Huge unwanted diff | Narrow `@folder`; ask for “minimal scope only” |

---

## Part 3 — What is RapidDev?

**RapidDev** is your team’s **Cursor-powered POC repository**: implement in sandbox, deploy from git, verify with scripts — then hand a small PR to reviewers.

> **Note:** The npm package name in `package.json` may still read `e2e-automation-framework` for historical reasons. Treat the repo as **RapidDev / Dev POC**, not as a QA-only project.

| Capability | What developers use it for |
|------------|----------------------------|
| **`.cursorrules`** | POC workflow: intake → design → implement in sandbox → verify → promotion notes |
| **`metadata/` + deploy scripts** | Versioned Salesforce XML and one-command deploy to C2C / other sandboxes |
| **`scripts/`** | Connectivity checks, seed data, diagnostics, screenshots, reports |
| **`src/api-clients/`** | Call Salesforce, Dynamics, MuleSoft from TypeScript (same auth as scripts) |
| **`src/page-objects/`** | Reusable UI interaction layer when you need browser verification |
| **Postman collections** | API exploration per work item under `postman-collections/` |
| **Optional verification specs** | Cucumber/Playwright assets in `src/features/` when you need repeatable checks — use when useful, not as your primary job role |

**Typical dev loop:** Jira story → Cursor Agent + `@metadata` / `@scripts` → deploy to sandbox → `npm run build` + connectivity or targeted verify → PR → Gearset.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Cursor** | Installed, signed in — Part 1 |
| **Git** | Clone access to this repository |
| **Node.js 20–22** | `node -v` |
| **Salesforce sandbox** | For SF POCs; credentials in `.env.*` (never committed) |
| **Azure CLI** (optional) | Key Vault secret pull: `az login` |

---

## 3. Clone and install

```powershell
git clone <your-org-remote-url> RapidDev
cd RapidDev
npm install
npm run build
```

```powershell
npm run lint
npm run ci:system-tests
```

---

## 4. Configure sandbox credentials

| File | Purpose |
|------|---------|
| `src/config/env/.env.c2c` | Rapid POC sandboxes (`ENV=c2c`) |
| `src/config/env/.env.qa` | Shared non-prod sandbox (`ENV=qa`) |
| `src/config/env/env.sample` | Template — copy with values from your lead |

**Key Vault (team):**

```powershell
az login
$env:KEY_VAULT_URL = "https://<vault-name>.vault.azure.net"
npm run setup:fetch-secrets
```

Details: [`docs/setup/TEAM_SECRETS_AND_ONBOARDING.md`](../setup/TEAM_SECRETS_AND_ONBOARDING.md).

**Prove sandbox access:**

```powershell
npm run c2c:connectivity-check
# or:
cross-env ENV=qa npm run connectivity:check
```

---

## 5. Open RapidDev in Cursor

1. **File → Open Folder** → `RapidDev` root (`package.json` + `.cursorrules` together).
2. New **Agent** chat per Jira story.
3. Always `@.cursorrules` + relevant `@folder` on the first message.

| Mechanism | Effect |
|-----------|--------|
| **`.cursorrules`** | POC guardrails: no guessing requirements, minimal diffs, sandbox-only implementation |
| **`@file` / `@folder`** | Keeps Agent focused in a large monorepo |
| **Existing scripts** | Agent should extend `scripts/deploy-*.ts`, not duplicate deploy logic |

---

## 6. Dev POC workflow (TS2)

Aligned with **`build.md`** baseline process and **Rapid POC / TS2** in `.cursorrules`:

```
  Jira / design notes
       │
       ▼
  1. Intake ──────────► scope, permissions, risks
       │
       ▼
  2. Design ──────────► Flow vs Apex vs metadata; match repo patterns
       │
       ▼
  3. Clarify ─────────► stop if ambiguous (Agent should ask)
       │
       ▼
  4. Build in sandbox ► metadata, Apex, scripts — minimal change
       │
       ▼
  5. Verify ──────────► deploy script, connectivity, build, optional screenshot/API check
       │
       ▼
  6. Promote-ready ───► Gearset order, dependencies, rollback
       │
       ▼
  7. Handoff ─────────► PR + Jira: deployment summary, audit trail (see build.md template)
```

### Example Agent prompt (TS2)

```text
@docs/rapid-dev/build.md @.cursor/skills/ai-assisted-delivery/SKILL.md
@.cursorrules @metadata/c2c/flexipages @scripts/deploy-c2c-home-flexipages.ts

Jira: SF-1093 · Track: TS2 — Role-based Home pages (C2C).

1. Align with existing deploy patterns.
2. Deploy ENV=c2c.
3. Run or add a quick verify (connectivity / screenshot script if present).
4. Document profile/app impacts and rollback.

Ask before assuming profile assignments.
```

### Reuse these building blocks

| Need | Location |
|------|----------|
| SF auth / API | `src/utils/salesforce-auth.ts`, `src/api-clients/salesforce/` |
| Deploy | `scripts/deploy-*.ts`, `metadata/<env>/` |
| UI verify (if needed) | `src/page-objects/salesforce/`, `FieldRegistry.ts` |
| Seed / probe data | `scripts/generate-*`, `scripts/*-connectivity-check.ts` |
| API manual check | `postman-collections/<WORK-ITEM>-Postman-Collection.json` |

---

## 7. Repository layout (dev-focused)

```
RapidDev/
├── .cursorrules           # POC + implementation rules for Cursor Agent
├── metadata/              # Salesforce metadata (deploy to sandbox)
├── scripts/               # Deploy, diagnose, seed, report — primary dev tools
├── src/
│   ├── api-clients/       # REST clients for SF / Dynamics / integrations
│   ├── page-objects/      # UI helpers when you verify in browser
│   ├── config/env/        # .env.c2c, .env.qa, JSON config
│   └── utils/             # Auth, helpers shared by scripts and clients
├── postman-collections/
├── docs/rapid-dev/        # build.md (blueprint) + this guide
└── .cursor/skills/ai-assisted-delivery/  # Team delivery skill
```

Optional deeper verification assets live under `src/features/` and `src/step-definitions/` — use when the POC needs a repeatable check-in; day-to-day POC work is **`metadata/` + `scripts/` + Cursor**.

---

## 8. Commands developers use for POCs

| Goal | Command |
|------|---------|
| Typecheck | `npm run build` |
| Lint | `npm run lint` |
| Deploy C2C Home flexipages | `npm run c2c:deploy:home-flexipages` |
| Sandbox connectivity | `npm run c2c:connectivity-check` |
| Capture POC screenshot | `npm run sf1093:c2c:screenshots` (example; see `package.json`) |
| Interactive browser session | `npm run test:interactive` |
| HTML evidence report | `npm run report:full` |
| Scaffold from Jira | `npm run jira:generate` |

Search `package.json` for your work item key (e.g. `c2c`, `SF-1093`).

---

## 9. POC patterns

### A. Metadata-first (recommended for UI config)

1. Edit XML under `metadata/<env>/`.
2. Extend or run `scripts/deploy-*.ts`.
3. Agent runs deploy; you review diff and sandbox.

### B. Script-first (probes and integrations)

Add or run scripts under `scripts/` for field scans, API probes, one-off data setup — before committing to Flow/Apex.

### C. API check

Update `postman-collections/<JIRA>-Postman-Collection.json` or call via `src/api-clients/`.

### D. Browser check (when UI matters)

Use `npm run test:interactive` or extend Page Objects — keep selectors out of random one-off files.

---

## 10. Contributing

| Topic | Document |
|-------|----------|
| PRs, signing, Jira | [`docs/process/CODE_REVIEW_AND_CONTRIBUTION.md`](../process/CODE_REVIEW_AND_CONTRIBUTION.md) |
| Secrets | [`docs/setup/TEAM_SECRETS_AND_ONBOARDING.md`](../setup/TEAM_SECRETS_AND_ONBOARDING.md) |

- Branch: `feature/<JIRA-KEY>-short-description`
- No secrets in git
- Small PRs with POC summary and rollback notes

---

## 11. Troubleshooting

### Cursor + Agent

| Issue | What to try |
|-------|-------------|
| Ignores team rules | Open Folder = RapidDev root; `@.cursorrules` in prompt |
| Wrong area edited | `@folder metadata/c2c` (or relevant path) |
| Scope too large | “POC only — list files you will touch before editing” |

### Sandbox / scripts

| Issue | What to try |
|-------|-------------|
| Auth failures | `ENV=` and `.env.<env>`; run connectivity script |
| `az` not in Cursor PATH | Use Windows Terminal or fix PATH |
| Deploy fails | Check `SF_*` vars in `.env.c2c`; API version in script |

---

## 12. Further reading

| Resource | Notes |
|----------|--------|
| [Cursor docs](https://docs.cursor.com) | Product help |
| [`build.md`](./build.md) | Delivery blueprint — **start here for TS1/TS2** |
| [`.cursorrules`](../../.cursorrules) | TS2 + POC rules Agent follows |
| [`ai-assisted-delivery` skill](../../.cursor/skills/ai-assisted-delivery/SKILL.md) | Shared delivery skill |
| [`docs/framework-documentation.md`](../framework-documentation.md) | Optional: platform map if you touch verification assets |

---

## Quick checklist

**Cursor**

- [ ] Installed, signed in, tried Chat + Agent
- [ ] Used `@file` / `@folder` in a prompt
- [ ] Reviewed an Agent diff before Accept

**Delivery model**

- [ ] Read [`build.md`](./build.md) — TS1 vs TS2 and baseline process
- [ ] Know when to use TS1 (discovery) vs TS2 (sandbox build)

**RapidDev POC (TS2)**

- [ ] Cloned repo; `npm install`; `npm run build`
- [ ] `.env.c2c` or `.env.qa` configured (or Key Vault fetch)
- [ ] Connectivity check passes
- [ ] Open Folder = RapidDev root; `.cursorrules` visible
- [ ] Completed one **TS2** story: engineer review + verify + PR/Jira summary per `build.md`

**Questions for leads** (confirm with architecture / release management):

- **TS1** workspace pattern (spike branch vs separate repo)?  
- Who signs off **architecture** exceptions (new CMT types, naming)?  
- **Gearset** path after QA (UAT/prod gates)?  

**Setup:** Ask your tech lead for repo URL, vault name, and sandbox access.
