# Getting the latest `main` without losing local work

Share this with anyone who already cloned the repo. **You do not need to delete the folder or clone again** to pick up changes merged to GitHub’s `main`.


**POC remote:** This repo's primary remote is `origin` → [rv-qa-ga/rapid-dev](https://github.com/rv-qa-ga/rapid-dev). The optional `upstream` remote may point at the parent framework; do not push to `upstream` unless you intentionally contribute back.

---

## Quick concepts

| Command | What it does |
|--------|----------------|
| `git fetch origin` | Downloads new commits from GitHub. **Does not** change your working files. |
| `git pull origin main` | Fetches **and** merges `origin/main` into your **current** branch. |
| `git merge origin/main` | Merges remote `main` into the branch you are on (after `fetch`). |

If the same lines changed on GitHub and on your machine, Git will ask you to **resolve conflicts** once, then you finish the merge or rebase.

**Default branch:** `main` (adjust if your admin renames it).

---

## Scenario A — Work is on a **feature branch** (recommended)

This is the normal case: you branched from `main` for a Jira ticket.

```bash
git fetch origin
git checkout your-feature-branch
git merge origin/main
```

Optional (linear history; only if your team agrees — avoid on shared branches unless you know rebase):

```bash
git fetch origin
git checkout your-feature-branch
git rebase origin/main
```

After a **rebase**, if the branch was already pushed, the next push may need:

```bash
git push --force-with-lease
```

---

## Scenario B — You are on **`main`** with **uncommitted** changes

### Option 1: Stash, update, restore

```bash
git stash push -m "wip before pull"
git fetch origin
git pull origin main
git stash pop
```

If `stash pop` reports conflicts, fix the files, then `git add` and continue (or commit on a branch).

### Option 2: Commit onto a WIP branch first (often clearer)

```bash
git checkout -b wip/local-changes
git add -A
git commit -m "WIP: describe change"
git fetch origin
git checkout main
git pull origin main
git checkout wip/local-changes
git merge main
```

Your work stays on `wip/local-changes` with `main` up to date merged in.

---

## Scenario C — You are on **`main`** with **local commits** you have not pushed

If policy allows commits on local `main` (many teams avoid this):

```bash
git fetch origin
git merge origin/main
```

If you **should not** keep those commits on `main`, preserve them on a branch, then align `main` with GitHub:

```bash
git branch backup/my-work
git fetch origin
git checkout main
git reset --hard origin/main
git checkout backup/my-work
git merge origin/main
```

`backup/my-work` still has your commits, now combined with latest `main`.

---

## Scenario D — You only want to **see** what changed (no merge yet)

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

---

## Using Cursor / VS Code

- **Source Control** panel: **Pull** updates the current branch from its remote tracking branch (often `main` ↔ `origin/main` if you are on `main`).
- For feature branches, prefer **Fetch** then **Merge** from `main`, or use the built-in **Sync** / branch merge actions after fetching.

If the UI is unclear, the commands above are the same operations.

---

## Checklist before asking for help

1. `git status` — are you on `main` or a feature branch? Any uncommitted files?
2. `git fetch origin` then `git log -1 origin/main` — is GitHub’s `main` newer than your local `main`?
3. If merge/rebase failed: read the message; open conflicted files, choose or combine changes, `git add`, then `git merge --continue` or `git rebase --continue`.

---

## Related

- Contribution and PR workflow: [CODE_REVIEW_AND_CONTRIBUTION.md](CODE_REVIEW_AND_CONTRIBUTION.md)
- Visual diagrams (branch + `main`): [CODE_REVIEW_AND_BRANCHING_DIAGRAMS.md](CODE_REVIEW_AND_BRANCHING_DIAGRAMS.md)

*Last updated: March 2026*
