# build.md — AI-Assisted Salesforce Delivery Blueprint

**Status:** Team working standard for AI-assisted changes  
**Audience:** Salesforce engineers, solution designers, technical leads  
**Repo:** RapidDev implements **TS2 — Sandbox Build**; see [delivery modes](#delivery-modes-two-tracks) below.

**Related:** [CURSOR_RAPID_DEVELOPMENT_GUIDE.md](./CURSOR_RAPID_DEVELOPMENT_GUIDE.md) · [`.cursorrules`](../../.cursorrules) · [`.cursor/skills/ai-assisted-delivery/SKILL.md`](../../.cursor/skills/ai-assisted-delivery/SKILL.md)

---

## Purpose

Balance **speed for the business** with **architectural controls** needed to keep the platform stable as AI-assisted delivery scales.

This document is the **single source of truth** for:

- How we use **Cursor** in delivery (TS1 and TS2)
- Who is accountable at each step
- What may be promoted vs what stays prototype-only
- Review checkpoints, Jira linkage, validation, and Gearset promotion

---

## Delivery modes (two tracks)

| Track | Name | Tooling | Output status | Accountability |
|-------|------|---------|---------------|----------------|
| **TS1** | **Rapid Prototyping** | **Cursor** (discovery-focused; spike branch or lightweight workspace — not necessarily this repo) | **Prototype artifacts** — spikes, mocks, narrative, experimental XML | **Not production-ready** Salesforce metadata; do **not** promote to shared sandboxes without TS2 |
| **TS2** | **Sandbox Build** | **Cursor** + **Salesforce sandbox** + **RapidDev** repo | Versioned metadata/scripts intended for **reviewed** promotion | **Salesforce engineer** owns decomposition, review, org-standard validation, and promote/no-promote decision |

### When to use which

| Situation | Use |
|-----------|-----|
| Ambiguous requirement, UX flow, integration unknowns | **TS1** first — reduce ambiguity |
| Confirmed design, ready to implement in org patterns | **TS2** |
| TS1 produced metadata/XML | Treat as **draft**; re-implement or harden in **TS2** before Gearset |
| Production-bound change | **TS2 only**, with full [baseline process](#baseline-process-ai-assisted-change) |

**Principle:** **Cursor** accelerates execution in both tracks; **accountability stays with engineering**.

---

## Baseline process (AI-assisted change)

Every AI-assisted change that may leave a sandbox should follow:

| Step | Activity | Owner | Evidence |
|------|----------|-------|----------|
| 1 | **Capture requirement** — link to **Jira** (key in branch + PR) | Engineer / BA | Jira URL, acceptance criteria |
| 2 | **Choose track** — TS1 vs TS2 per table above | Engineer | Comment on Jira or PR description |
| 3 | **Build in sandbox** (TS2) or prototype (TS1) | Engineer + AI | Branch, commits, deploy logs |
| 4 | **Review** — org patterns, dependencies, permissions | **Salesforce engineer** (mandatory) | Review checklist below |
| 5 | **Add/update tests** — Apex tests, and/or repo verification scripts/features where applicable | Engineer | Test results / `npm run build` |
| 6 | **Promote via Gearset** to QA (then higher per release process) | Engineer + release practice | Gearset deployment record |
| 7 | **Audit trail** — Jira + deployment summary | Engineer | Jira comment + PR body template |
| 8 | **Proceed** only when validated in target env | Engineer + approver | Sign-off in Jira |

**Gate:** Do not promote until step 4–5 are explicitly complete.

---

## TS2 engineer responsibilities (non-delegable)

The engineer **must** perform these; AI does not replace them:

1. **Decompose** the request — objects, metadata types, integrations, FLS, profiles.
2. **Review** all AI-generated metadata — naming, references, XML validity, side effects.
3. **Validate** against org standards (see [Architecture governance](#architecture-governance)).
4. **Decide** what is safe to promote — including partial promote / follow-up stories.
5. **Override AI** when output conflicts with standards or is incomplete (see skill: *when to override*).

---

## Architecture governance

Primary risk at scale is **cumulative inconsistency** across the org, not a single defect. Apply this lightweight standard on every TS2 change:

| Area | Standard |
|------|----------|
| **Naming** | Match existing repo and org conventions; no new prefixes without architecture approval |
| **CMT** | Use established Custom Metadata patterns; document new types in Jira |
| **Flow vs Apex** | Prefer Flow when repo/org already does; Apex when bulk, complex logic, or existing Apex boundaries — document decision |
| **Permissions** | Profiles, permission sets, FLS called out in review; no “admin fixes” in sandbox-only |
| **Deployment boundaries** | What ships in this story vs dependent story; ordering for Gearset |
| **Rollback** | Document revert steps (metadata names, assignments, data impact) |
| **Dependencies** | Upstream/downstream systems (MuleSoft, integrations) identified before promote |
| **Prototype leakage** | No TS1 artifacts promoted without TS2 review |

*Extend this table as the architecture group defines org-specific rules.*

---

## Build approach (RapidDev / TS2)

| Layer | Practice |
|-------|----------|
| **Rules** | [`.cursorrules`](../../.cursorrules) + this `build.md` |
| **Skills** | [`.cursor/skills/ai-assisted-delivery/`](../../.cursor/skills/ai-assisted-delivery/) |
| **Metadata** | `metadata/<env>/` — versioned, deploy via `scripts/deploy-*.ts` |
| **Scripts** | Connectivity, deploy, diagnose under `scripts/` |
| **Verify** | `npm run build`, connectivity scripts, optional `src/features/` for repeatable checks |
| **Secrets** | `.env.*` / Key Vault only — never in git |

---

## Guardrails

- Do not invent requirements; clarify in Jira first.
- Do not promote TS1 output as production metadata.
- Do not skip engineer review because “AI tested it.”
- Do not bypass Gearset or deployment boundaries for shared environments.
- Minimal diffs — one Jira story per cohesive promote unit where possible.
- Sandbox-only assumptions must be resolved before QA promote.

---

## Review checkpoints

Use before PR merge and before Gearset:

- [ ] Jira key on branch and PR title
- [ ] TS1 vs TS2 declared
- [ ] Naming and metadata types match org patterns
- [ ] Flow vs Apex (or other) decision documented
- [ ] Permissions / FLS impact listed
- [ ] Dependencies and deploy order noted
- [ ] Rollback steps written
- [ ] Validation run (build, connectivity, tests as applicable)
- [ ] AI-generated files human-reviewed (not blind Accept)

---

## Jira integration

| Item | Convention |
|------|------------|
| Branch | `feature/<JIRA-KEY>-short-description` |
| PR title | Include Jira key |
| Jira comment on complete | Link PR, Gearset deployment (when done), validation summary |
| Blocked / ambiguous | Jira comment + questions before TS2 build continues |

---

## Validation expectations

| Type | When |
|------|------|
| `npm run build` / `lint` | Every TS2 PR touching repo code |
| Sandbox connectivity | After env or auth changes |
| Deploy script success | Metadata changes |
| Apex / Flow tests | Per team Salesforce standards |
| Repo verification (optional) | When adding/regression-sensitive behavior |

---

## Promotion criteria

Promote to QA (via Gearset) only when:

1. Engineer review checklist complete  
2. Validation evidence attached (Jira or PR)  
3. Rollback documented  
4. No open architecture questions  
5. TS2 metadata — not unreviewed TS1 draft  

Higher environments follow existing release governance.

---

## PR / deployment summary template

Paste into PR description and Jira when promoting:

```markdown
## Jira
- **Key:** SF-XXXX
- **Track:** TS1 | TS2

## Summary
<What changed and why>

## Design decisions
- Flow vs Apex / metadata:
- Permissions:
- Dependencies:

## Validation
- [ ] Sandbox deploy / build commands run:
- [ ] Engineer review complete:

## Rollback
<Steps to revert>

## Gearset
- **Target:** QA (or other)
- **Package / components:**
- **Ordering notes:**
```

---

## Shared Cursor skills (team)

Install skills from `.cursor/skills/` in this repo:

| Skill | Path | Use when |
|-------|------|----------|
| **AI-assisted delivery** | `ai-assisted-delivery/SKILL.md` | Any TS2 story — decomposition, impact, prototype vs build, override AI |

Add domain skills (e.g. `salesforce-*`) per [skills guide](../process/CURSOR_PROJECT_SKILLS_SKILLMD_GUIDE.md).

**In prompts:** `@docs/rapid-dev/build.md` `@.cursor/skills/ai-assisted-delivery/SKILL.md`

---

## Open decisions (fill with your leads)

| Question | Decision |
|----------|----------|
| TS1 workspace (separate repo vs branch on RapidDev) | _TBD_ |
| Architecture sign-off required for CMT / new objects | _TBD_ |
| Mandatory Gearset path (QA only vs UAT) | _TBD_ |

---

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-05-27 | RapidDev / Engineering | Initial team blueprint from delivery model discussion |
