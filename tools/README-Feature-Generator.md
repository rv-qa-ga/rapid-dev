# Feature File Generator – QA Tool

This folder contains a **batch/PowerShell wrapper** so the QA team can generate Gherkin feature files from Jira work items without typing npm commands.

## What it does

- Reads work item IDs from Jira (e.g. **SF-451**, **SF-645 SF-646 SF-647**).
- Runs the framework’s **Feature Generator** (same as `npm run process:new-qa-items`).
- Produces **UI** and **API** `.feature` files under:
  - `src/features/ui/SF/<WORKITEM>.feature`
  - `src/features/api/SF/<WORKITEM>.feature`

## Prerequisites

1. **Node.js and npm** installed (same as the rest of the framework).
2. **Repo cloned** and dependencies installed (`npm install` already run from repo root).
3. **Jira access** configured (e.g. `src/config/env/.env.qa` or your env file with Jira URL and API token).

## How to run

### Option A: Batch script (double‑click or Command Prompt)

1. Open the repo in File Explorer.
2. Go to the **`tools`** folder.
3. Double‑click **`Generate-Feature-Files.bat`**  
   **or** open Command Prompt, `cd` to the repo root, then run:
   ```bat
   tools\Generate-Feature-Files.bat
   ```
4. When prompted:
   - **Work item(s):** e.g. `SF-451` or `SF-645 SF-646 SF-647` (space‑separated). Leave empty to process all items in the QA queue.
   - **Mode (1–4):** Press Enter for **4** (Risk‑Based Testing, recommended for QA).
   - **Overwrite (Y/N):** **N** = only generate when files don’t exist; **Y** = regenerate and overwrite existing feature files.

The script changes to the repo root automatically, then runs the generator.

### Option B: PowerShell

From repo root:

```powershell
.\tools\Generate-Feature-Files.ps1
```

Same prompts as the batch script. Use this if you prefer PowerShell or need to run from a PS terminal.

### Option C: Command line (no prompts)

If you already know the options, you can run npm directly from the **repo root**:

```bat
npm run process:new-qa-items -- --mode 4 SF-451
npm run process:new-qa-items -- --mode 4 --overwrite SF-645 SF-646 SF-647
```

- **Mode 4** = Risk‑Based Testing (UI scenarios + minimal API).
- **--overwrite** = overwrite existing UI/API feature files for the given work items.

## Generation modes

| Mode | Description |
|------|-------------|
| 1 | User Scenarios Only |
| 2 | User Scenarios + Augmentation |
| 3 | Generator Only |
| 4 | **Risk-Based Testing (RBT)** – recommended for QA; UI scenarios + minimal API smoke |

## After generation

- Feature files: **`src/features/ui/SF/`** and **`src/features/api/SF/`** (or the right project folder).
- To generate **step definitions** for missing steps:
  ```bat
  npm run generate:steps -- --work-item SF-451
  ```
- To **upload test cases to Zephyr** (no link):
  ```bat
  npm run zephyr:UploadTestCase -- --work-item SF-451
  ```

## Troubleshooting

- **“npm not found”**  
  Run from the repo root or ensure Node/npm are on the system PATH.

- **Jira / API errors**  
  Check your env config (e.g. `.env.qa`) for Jira URL and API token.

- **Script won’t run from `tools`**  
  The batch and PowerShell scripts both `cd` to the repo root (parent of `tools`). Run them from anywhere inside the repo, or double‑click from `tools`.

- **Overwrite not working**  
  Use **Y** when asked “Overwrite existing feature files?” or pass **--overwrite** when using npm directly.
