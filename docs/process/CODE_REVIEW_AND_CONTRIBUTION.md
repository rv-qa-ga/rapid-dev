# Code review and contribution process

This document is the **single source of truth** for how QA and engineering contribute to this automation framework. It reflects current org constraints: **`main` as default branch**, **GitHub admin–controlled reviewers**, **required lightweight PR checks to `main`** (GitHub-hosted workflow that reports the org check `system-tests`: typecheck + ESLint via `npm run ci:system-tests`; Playwright/Cucumber suites remain self-hosted / manual dispatch), **GPG-signed commits**, **Jira work in the current sprint**, and **secrets moving to Azure Key Vault** (see also `docs/setup/TEAM_SECRETS_AND_ONBOARDING.md` when updated).

---

## 1. Goals

- Keep **`main` stable** and reviews **fast** (small PRs, clear checklists).
- **Reuse** framework patterns (common steps, page objects, field registry, factories, API clients)—avoid duplicate utilities.
- Meet **enterprise** requirements: signing, no secrets in git, Jira traceability.

---

## 2. Branching and merge

| Rule | Detail |
|------|--------|
| Default branch | `main` — **no direct pushes**; changes land only via **pull request**. |
| Branch naming | `feature/<JIRA-KEY>-short-kebab-description` (example: `feature/SF-620-api-negative-paths`). Jira key is **required**. |
| Branch lifetime | Short-lived; delete after merge when practical. |
| Merge style | Follow **repository settings** (often **squash merge**). See §2.1. |

### 2.1 Squash merge (reference)

**Squash merge** combines all commits from a PR into **one commit** on `main`. Benefits: clean history on `main`, one logical change per PR. The detailed commit history remains visible on the **closed PR** on GitHub. Whether squash is required is set by **GitHub admins** (merge button / branch protection).

### 2.2 Commit messages and Jira

- Include the **Jira key** in the PR title and/or squash merge title when possible (helps search and future automation).
- Every PR must map to a **Jira issue in the current sprint** (see §5).

### 2.3 Clear commit messages (required)

Use **short, scannable** subjects and a **body** when the change needs context.

**Format (recommended):**

```text
<SF-XXXX|ENG-XXX>: <imperative summary, ~72 chars or less>

<Optional body: what changed, why, links. Wrap at ~72 chars.>
```

**Examples:**

```text
SF-699: Add UAT smoke workflow gate and build-validation tags

Wire GitHub workflow to self-hosted runner; tag scenarios in qa-smoke-test.feature.
```

```text
SF-620: Harden invalid-request examples for Risk Score POST

Align examples with QA sheet; no contract change.
```

**Rules:**

- Start the **first line** with the **primary Jira key** for the work (e.g. `SF-699`, `SF-620`). Use one key per commit when possible; if a commit spans multiple tickets, pick the **dominant** story and mention others in the body (`Also touches SF-726.`).
- Use the **imperative mood** (`Add`, `Fix`, `Merge`, not `Added` / `Fixes`).
- **Merge commits:** still use a clear subject and body—state what branches merged and what the batch delivers (features, docs, scripts).
- **Do not** rely on vague subjects (`update`, `fixes`, `wip`) without a Jira key.

---

## 3. GPG signing (required)

- All contributors must use **GPG (or org-approved) signing** so commits show **Verified** on GitHub.
- **Always use signed commits** on every machine that touches this repo—no routine unsigned commits.

### 3.1 Required Git configuration (once per machine)

Run after your signing key is generated and [added to GitHub](https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account):

```bash
# Use your key ID from: gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey YOUR_KEY_ID

# Every commit must be signed (do not rely on remembering -f)
git config --global commit.gpgsign true

# Optional but recommended: signed annotated tags
git config --global tag.gpgSign true
```

Verify: `git config --global --get commit.gpgsign` should print `true`.

- Configure once per machine: signing key registered in GitHub, `commit.gpgsign` enabled for this repo or globally.
- If using **Cursor** or other GUIs, confirm they commit with the **same signed identity** as the CLI—unsigned commits will fail policy or be rejected.
- **Do not use `git commit --no-gpg-sign`** for routine work. If signing fails (`gpg failed to sign`), fix the environment (GPG agent, `gpg --list-secret-keys`, pinentry, `echo "test" | gpg --clearsign`) and retry—do not bypass signing to “unblock” a commit unless a maintainer explicitly approves a one-off exception.
- **Cursor / AI assistance:** When creating commits in this repo, use normal `git commit` so `commit.gpgsign` applies; never pass `--no-gpg-sign` unless the human explicitly asks for an unsigned commit.

---

## 4. Secrets and configuration

- **Never** commit real credentials, tokens, or full `.env` files with secrets.
- Use **`src/config/env/env.sample`** (and team docs) for **names only**; real values come from approved channels.
- **Azure Key Vault**: when live, secrets are sourced per team onboarding (e.g. `setup:fetch-secrets` or documented flow—follow updated `docs/setup/TEAM_SECRETS_AND_ONBOARDING.md`).
- Do not bypass secret scanning: if a push is blocked, **rotate** the exposed secret and remove it from history per security process.

---

## 5. Jira linkage (current sprint)

Each PR must:

- Reference a **Jira work item** (key in branch name and PR title recommended).
- Be work that is **in the current sprint** for that item (reviewers may spot-check against the sprint board).

Optional: paste the Jira URL in the PR description.

---

## 6. Pull requests: size and readiness

| Practice | Why |
|----------|-----|
| **Small PRs** | Faster review, less merge risk. Prefer one work item or one logical slice. |
| **Author self-review** | Diff against `main`; fill the PR template completely. |
| **Local validation** | There is **no CI on PRs** today; the author runs checks before requesting review (§7). |

**Reviewer count and rules** are enforced by **GitHub branch protection** (admins). This doc does not duplicate those numbers—follow what the repo requires.

---

## 7. Pre-review checks (author — mandatory)

Because PRs are not automatically built, run what applies to your change:

| Change type | Suggested commands |
|-------------|-------------------|
| TypeScript / steps / hooks | `npm run build` (`tsc --noEmit`), `npm run lint` |
| Step definitions / Gherkin wiring | `npm run validate:steps` (or `validate:steps:all` if touching shared patterns) |
| Logic with unit tests | `npm run test:unit` |
| Automated tests you touched | Narrowest **`npm run test:feature`** / `test:ui` / `test:api` / tag- or file-scoped run you already use for that work item |

Document in the PR **what you ran** and the **result**.

---

## 8. Reviewer checklist (framework-aware)

Reviewers focus on **risk and consistency**, not style nitpicks unless lint fails.

- **Features (`.feature`)**: Appropriate **tags** (e.g. smoke, work-item); scenarios are **independent** where possible; no unnecessary full-journey coupling.
- **Steps**: Prefer **existing common steps** and clients; no duplicate helpers if an equivalent exists under `src/step-definitions/common` or project-specific shared areas.
- **UI**: Selectors and page interaction live in **page objects / field registry**, not raw, repeated selectors in steps.
- **API**: Use existing **Axios/client** patterns and env-based config.
- **Data**: Prefer **factories/builders** over hardcoded production-like IDs unless agreed.
- **Secrets**: No new secrets in code or committed env files.
- **Scope**: PR stays within the **Jira** scope; unrelated refactors discouraged.

**CODEOWNERS**: If the org enables required code owners, some paths may auto-request specific teams. If unsure whether this repo uses enforced CODEOWNERS, ask a **GitHub admin**.

---

## 9. Meetings and async culture

- **Default**: review is **fully async** on GitHub (comments, approve, merge per policy).
- **Optional**: **30 minutes biweekly “framework office hours”** for questions (flakiness, patterns, runner usage)—not a standing code-review meeting.
- **SLA (team norm)**: aim for **first review within one business day** when possible; escalate blockers in team channel.

---

## 10. Cursor and GitHub

- Use Cursor to **review your own diff** before opening the PR.
- Keep discussion and decisions on the **PR** so they are searchable.
- Paste **commands run** and **Jira** into the description using the repo **PR template**.

---

## 11. Related documentation

- PR template: `.github/pull_request_template.md`
- **Updating local clone with latest `main` (no reclone, keep your work):** [GIT_SYNC_WITH_MAIN.md](GIT_SYNC_WITH_MAIN.md)
- **Visual diagrams (PR flow + syncing `main` into feature branches):** [CODE_REVIEW_AND_BRANCHING_DIAGRAMS.md](CODE_REVIEW_AND_BRANCHING_DIAGRAMS.md)
- Framework overview: `docs/framework-documentation.md`
- Runner / workflows: `docs/setup/` (e.g. self-hosted runner plans)
- Secrets onboarding (update when Key Vault is live): `docs/setup/TEAM_SECRETS_AND_ONBOARDING.md`

---

## 12. Summary (quick reference)

1. Branch from `main`: `feature/<JIRA-KEY>-description`.  
2. **GPG-sign** all commits.  
3. No secrets in git; use Key Vault / approved env when available.  
4. Run **build, lint**, and relevant **validate/tests** locally; record in PR.  
5. Open PR with **template**; Jira item **in current sprint**.  
6. **One reviewer cycle** (or as admin requires); address comments.  
7. Merge per org settings (often **squash** to `main`).

*Document version: aligned with process agreed March 2026. Update this file when branch rules, Key Vault flow, or PR CI changes.*
