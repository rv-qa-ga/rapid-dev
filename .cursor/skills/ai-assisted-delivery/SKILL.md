---
name: ai-assisted-delivery
description: >-
  Guides Salesforce engineers through AI-assisted delivery (TS1 prototype vs TS2 sandbox build).
  Use for Jira-backed changes, metadata deploys, RapidDev POC work, or when the user mentions
  build.md, Gearset promotion, architecture governance, or reviewing AI-generated Salesforce metadata.
---

# AI-assisted delivery (TS1 / TS2)

Read **`docs/rapid-dev/build.md`** for the full blueprint. This skill applies **practical steps** during Agent sessions.

## Modes

| Mode | Rule |
|------|------|
| **TS1 — Rapid Prototyping** | **Cursor** discovery only (spike/lightweight work — not RapidDev promote path). Outputs are **prototype artifacts**. Do **not** treat as production-ready metadata or recommend Gearset promote without TS2. |
| **TS2 — Sandbox Build** | Implement in connected sandbox via RapidDev patterns. Engineer **must** review all generated metadata before promote. |

If the user has not stated TS1 vs TS2, **ask** which track applies before large edits.

## Skill 1 — Break ambiguous requirements into safe steps

1. Restate the Jira requirement in your own words; list unknowns.
2. Split into ordered steps (design → sandbox change → verify → promote-ready).
3. Flag steps that need human decision (permissions, Flow vs Apex, CMT).
4. Do not implement past the current step without confirmation when ambiguous.

## Skill 2 — Assess platform impact

Before coding, state impact on:

- Objects, fields, record types, page layouts, FlexiPages, apps
- Flows, Apex, triggers, validation rules
- Profiles, permission sets, FLS, sharing
- Integrations and deployment order
- Cumulative org consistency (naming, patterns)

## Skill 3 — Prototype vs build

| Signal | Recommendation |
|--------|----------------|
| Unclear UX, scope, or integration | **TS1** or clarify only — no production metadata |
| Accepted design, known metadata types | **TS2** in RapidDev |
| User pasted TS1 spike XML | **Reconcile in TS2** — do not promote as-is |

## Skill 4 — Validate dependencies and metadata

- Inspect existing `metadata/` and `scripts/deploy-*.ts` for the target env.
- Reuse `src/api-clients/`, auth helpers — no duplicate clients.
- After changes: propose `npm run build`, connectivity check, or deploy script.
- List components that must deploy together.

## Skill 5 — When to override AI output

Engineer (user) always wins. Stop and recommend override when:

- Naming diverges from repo/org conventions
- New patterns invented without precedent in codebase
- Permissions hand-waved or “use System Admin”
- TS1 artifact suggested for direct Gearset promote
- Scope creep beyond Jira acceptance criteria
- Missing rollback or dependency analysis

Say explicitly: **“Recommend rejecting this hunk / rewriting because …”**

## TS2 completion summary

When finishing TS2 work, output:

1. Jira key and track (TS2)
2. Design decisions (Flow vs Apex, CMT, permissions)
3. Files touched and deploy command
4. Validation run (or what the engineer must run)
5. Rollback steps
6. Promotion readiness: yes / no / blocked — and why

## Framework pointers (RapidDev)

- Rules: `.cursorrules`, `docs/rapid-dev/build.md`
- Deploy: `metadata/<env>/`, `scripts/deploy-*.ts`
- Env: `src/config/env/.env.<env>` — never commit secrets
