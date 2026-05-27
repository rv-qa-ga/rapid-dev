## Summary

<!-- Short description of what this PR does. -->

## Jira

- **Key:** <!-- e.g. SF-620 -->
- **Link:** <!-- paste Jira URL -->
- [ ] This work is tied to a Jira issue in the **current sprint**

## Type of change

- [ ] New / updated `.feature` (Gherkin)
- [ ] Step definitions / hooks
- [ ] Page objects / field registry
- [ ] API client / integration scripts
- [ ] Config / env **names only** (no secrets)
- [ ] Docs only
- [ ] Other: <!-- describe -->

## Local validation

The org-required **`system-tests`** check on PRs to `main` only runs **`npm run ci:system-tests`** (typecheck + lint) after `npm ci` — intentionally minimal. Run any extra checks locally before merge as needed:

Describe what you ran and the outcome (pass / skip with reason):

| Check | Run? | Notes |
|-------|------|--------|
| `npm run build` | [ ] | |
| `npm run lint` | [ ] | |
| `npm run validate:steps` (or `:all` if needed) | [ ] | |
| `npm run test:unit` | [ ] | |
| Targeted test run (feature / tag / script) | [ ] | **Command:** |

## Security

- [ ] No passwords, tokens, or private keys added to the repo
- [ ] No real secrets in `.env` files committed (use Key Vault / approved secrets flow per team docs)

## Framework reuse

- [ ] Reused or extended existing common steps / POM / clients where possible (no unnecessary duplication)

## Reviewer notes

_Process doc: `docs/process/CODE_REVIEW_AND_CONTRIBUTION.md`_
