# Team Secrets and Onboarding – How the Automation Team Gets Access

This document describes how to give the **whole automation team** access to framework credentials (e.g. SPN client ID/secret for Dynamics and SQL Server, MuleSoft, Jira, **Microsoft Fabric**) **without sharing secrets in plain text**. The framework expects credentials in environment-specific `.env` files (e.g. `src/config/env/.env.qa`). Those files are **gitignored** and must never be committed. For Fabric variables, see **`docs/setup/FABRIC_CONNECTIVITY_SETUP.md`**.

---

## For support / Azure teams (Key Vault request clarification)

**What the Key Vault is for:**  
A single Azure Key Vault used only to **store secrets** (client IDs, client secrets, API tokens) for the **test automation framework**. Those secrets are used to authenticate to external systems (Dynamics 365, SQL Server, MuleSoft, Jira, Salesforce, etc.) when developers run tests locally or when CI runs tests. The vault is **not** used by Data Integration pipelines or other Azure services; it is only read by automation team members (and optionally a CI identity) via the standard Key Vault REST API.

**What the Key Vault needs to “talk to”:**  
**Nothing.** Access is **client-initiated** only:

- **Developers:** From their laptops/workstations they run `az login` (Azure AD) and then a small script that calls the Key Vault API over HTTPS to read secrets and write them into a local `.env` file. No VNet, private endpoint, or integration with other Azure resources is required.
- **CI (optional):** If we later want GitHub Actions (or another runner) to pull secrets at build time, the runner would use a service principal or managed identity with **Key Vault Secrets User** on the vault—again, just HTTPS to the vault; no other systems need to talk to the vault.

So: the vault only needs to be reachable via the **public Azure Key Vault endpoint** (`https://<vault-name>.vault.azure.net`) by users/identities that have been granted **Key Vault Secrets User** (or equivalent) on the vault. No outbound connections from the vault to other services are required.

**Where it should live (subscription / resource group):**  
**Yes—placing the Key Vault in the Data Integration subscription in its own resource group is a good option**, as long as:

- The **automation team’s Azure AD group** can be granted **Key Vault Secrets User** on that vault (i.e. the subscription/resource group and IAM are managed so that role assignment is allowed for that group).
- Naming and lifecycle are clear (e.g. resource group such as `rg-automation-secrets` or `rg-di-automation-keyvault` and a vault name that indicates purpose, e.g. `kv-automation-qa-secrets`).

If the Data Integration subscription is the one where the team already has access and where you prefer to manage automation-related resources, that subscription with a **dedicated resource group for this Key Vault** is appropriate. The vault does not need to be in the same subscription as Dynamics 365, SQL Server, or MuleSoft; it only needs to be in a subscription where you can grant the automation group access.

**Summary for the ticket:**  
- **Purpose:** Store test-automation secrets (D365, SQL Server, MuleSoft, Jira, etc.); no integration with Data Integration pipelines.  
- **Who accesses it:** Automation team members (Azure AD) and optionally CI; access via HTTPS only, client-initiated.  
- **Placement:** Data Integration subscription with its own resource group is fine; ensure the automation team’s Azure AD group can be assigned **Key Vault Secrets User** on the vault.

---

## The problem

- **SPN (Service Principal)** is created; client ID and client secret are stored in “your” secrets file.
- You **cannot** safely share the client secret via email, chat, or a shared document—anyone with the secret can authenticate as the app.
- The **team is in the same Azure AD group**—so we can use that for **access control** to a central secret store, not for “everyone has their own secret.”

---

## How the framework uses secrets

| What | Where it's read from |
|------|----------------------|
| **Local runs** | `src/config/env/.env.<env>` (e.g. `.env.qa`). Scripts load the first existing file from: `src/config/env/.env.qa`, `.env.qa`, `.env`. |
| **CI (GitHub Actions)** | GitHub repository **Secrets** (e.g. `D365_CLIENT_ID`, `D365_CLIENT_SECRET`, `SF_JWT_CLIENT_ID`, etc.). Injected as env vars in the workflow. |

Each developer (or runner) needs the **same** SPN credentials in their environment so that the framework can call Dynamics, SQL Server, MuleSoft, etc. The recommended approach is to store those credentials **once** in a secure store and have the team **retrieve** them into their local `.env` without ever copying the secret in plain text.

---

## Developer quick start (share with new joiners)

Use this checklist for **local QA runs** when shared secrets live in **Azure Key Vault** (team vault: only the secrets listed below are fetched; nothing else is read from the vault).

### What you need first

| Requirement | Notes |
|---------------|--------|
| **Git access** | Clone the automation repo. |
| **Node.js 18+** | `node -v` |
| **npm dependencies** | From repo root: `npm install` |
| **Azure CLI** | [Install Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli). In PowerShell, `az --version` must work. |
| **Azure AD access** | Your account must be in the automation team’s Azure AD group that has **Key Vault Secrets User** on the vault. |
| **Vault URL** | Your lead shares `https://<vault-name>.vault.azure.net` (no secrets in chat—only this URL). |

### One-time: sign in to Azure

```powershell
az login
```

Pick the subscription/tenant your admin told you to use. Confirm access:

```powershell
az account show
az keyvault secret list --vault-name "<vault-name>" -o table
```

If `secret list` fails with **ForbiddenByConnection**, you are blocked by vault networking (firewall/VPN/private endpoint)—ask your Azure admin. If you get **403**, you lack **Secrets User** on that vault.

### Pull secrets into `.env.qa`

From the **repository root** (same folder as `package.json`):

```powershell
$env:KEY_VAULT_URL = "https://<vault-name>.vault.azure.net"
npm run setup:fetch-secrets
```

(On cmd.exe use `set KEY_VAULT_URL=...` then `npm run setup:fetch-secrets`.)

**What this does:** The script uses **Azure CLI** identity (`az login`) to read the vault and **writes** `src/config/env/.env.qa`. That file is **gitignored**—never commit it.

**Important:** By default the fetch script **merges** into existing `.env.qa`: it updates only the Key Vault–backed variables and **keeps** your other lines (Salesforce, URLs, etc.). To **replace the entire file** with secrets only, set `KEY_VAULT_OVERWRITE=1` when running fetch. If `.env.qa` does not exist yet, fetch creates it with secrets plus a short header—then add the rest from `env.sample` as needed.

**Secrets the script expects in the vault** (names must match exactly):

| Key Vault name | Written to `.env.qa` as |
|----------------|-------------------------|
| `D365-CLIENT-ID` | `D365_CLIENT_ID` |
| `D365-CLIENT-SECRET` | `D365_CLIENT_SECRET` |
| `D365-TENANT-ID` | `D365_TENANT_ID` |
| `D365-SCOPE` | `D365_SCOPE` |
| `SQLSERVER-CLIENT-ID` | `SQLSERVER_CLIENT_ID` |
| `SQLSERVER-CLIENT-SECRET` | `SQLSERVER_CLIENT_SECRET` |
| `SQLSERVER-TENANT-ID` | `SQLSERVER_TENANT_ID` |
| `SQLSERVER-HOST` | `SQLSERVER_HOST` |
| `MULESOFT-CLIENT-ID` | `MULESOFT_CLIENT_ID` |
| `MULESOFT-CLIENT-SECRET` | `MULESOFT_CLIENT_SECRET` |

If your vault uses extra secret names later, admins can document `KEY_VAULT_SECRETS` (comma-separated) in `scripts/setup/fetch-secrets-from-keyvault.ts` or set that env var when running fetch.

### If `npm run setup:fetch-secrets` says Azure CLI was not found

Some editors start Node with a **short PATH** (e.g. integrated terminal). Fixes (pick one):

1. Run the same commands from **Windows Terminal** or **PowerShell** where `where az` succeeds.  
2. Add Azure CLI’s `wbin` folder to your **user PATH** (typically `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin`), then restart the editor.  
3. Set **`AZURE_CLI_WBIN`** to that `wbin` folder for the session before `npm run setup:fetch-secrets`.

### Run tests (framework)

Tests load env from `src/config/env/.env.qa` when **`ENV=qa`** (see `scripts/run-tests-with-env.js` / project conventions). Examples:

```powershell
npm run test:env:qa
# or targeted runs, e.g.
npm run test:login
```

Use `README.md` and `package.json` scripts for UI/API suites and tags.

### Security reminders

- Do **not** paste client secrets or API tokens into Teams, email, or the repo.  
- Do **not** commit `.env.qa`.  
- If a secret was ever exposed, ask for **rotation** in Key Vault and fetch again.

---

## Recommended approaches (from best to alternative)

### Option 1: Azure Key Vault (recommended for teams in Azure AD)

Store shared automation credentials (D365, SQL Server, MuleSoft, Jira, etc.) in **Azure Key Vault** as secrets. Grant the **automation team’s Azure AD group** the role **Key Vault Secrets User** (or **Get** on secrets) so they can read secrets.

**Benefits:**

- No one sees the secret in plain text; they only get it at runtime or via a one-time fetch script.
- Access is audited; you can rotate the secret in one place (Key Vault) and re-run the fetch.
- Same Azure AD group you already use for the team.

**Steps (high level):**

1. **Create a Key Vault** (or use an existing one) in your subscription.
2. **Store secrets** in the vault (e.g. `D365-CLIENT-SECRET`, `SQLSERVER-CLIENT-SECRET`, `MULESOFT-CLIENT-SECRET`, `JIRA-API-TOKEN`, etc.). You can use the same key names as env vars or a mapping.
3. **Grant access:** Key Vault → Access control (IAM) → Add role assignment → **Key Vault Secrets User** → assign to the **Azure AD group** that contains the automation team.
4. **Onboard each developer:**  
   - They sign in with Azure CLI: `az login` (using their own Azure AD account, which is in the group).  
   - They run the framework’s **fetch script** (see below) once to pull secrets from Key Vault and write `src/config/env/.env.qa` (or merge into it).  
   - They do **not** need to see or copy the client secret.

**Framework support:** Run the fetch script once (after `az login`) to pull secrets from Key Vault and write `src/config/env/.env.qa`:

```bash
# Install Azure SDK once (optional - only if using Key Vault)
npm install @azure/keyvault-secrets @azure/identity

# Set your vault URL (get from Azure Portal or your admin)
KEY_VAULT_URL=https://your-vault.vault.azure.net npx ts-node scripts/setup/fetch-secrets-from-keyvault.ts
```

Or add an npm script and run:

```bash
KEY_VAULT_URL=https://your-vault.vault.azure.net npm run setup:fetch-secrets
```

Secret names in Key Vault should match the list in the script (e.g. `D365-CLIENT-SECRET`, `SQLSERVER-CLIENT-SECRET`, `MULESOFT-CLIENT-SECRET`). See `scripts/setup/fetch-secrets-from-keyvault.ts` for the full mapping. After running, add any non-secret vars (base URLs, usernames) from `src/config/env/env.sample`.

#### Populating secrets (you have “Contributor” or admin access)

**Important:** **Key Vault Contributor** manages the **vault resource** (settings, networking). To **create or change secret values** (data plane), you usually need **Key Vault Secrets Officer** (or **Key Vault Administrator**) on that vault. If the portal or CLI returns **403** when setting a secret, ask your admin to add **Secrets Officer** for your account (or a break-glass group) while you bootstrap the vault.

**Secret names** must match what the fetch script expects (hyphens, case as below). Values are the same strings you would put in `.env.qa`.

| Key Vault secret name | Becomes env var (in `.env.qa`) |
|----------------------|--------------------------------|
| `D365-CLIENT-ID` | `D365_CLIENT_ID` |
| `D365-CLIENT-SECRET` | `D365_CLIENT_SECRET` |
| `D365-TENANT-ID` | `D365_TENANT_ID` |
| `D365-SCOPE` | `D365_SCOPE` |
| `SQLSERVER-CLIENT-ID` | `SQLSERVER_CLIENT_ID` |
| `SQLSERVER-CLIENT-SECRET` | `SQLSERVER_CLIENT_SECRET` |
| `SQLSERVER-TENANT-ID` | `SQLSERVER_TENANT_ID` |
| `SQLSERVER-HOST` | `SQLSERVER_HOST` |
| `MULESOFT-CLIENT-ID` | `MULESOFT_CLIENT_ID` |
| `MULESOFT-CLIENT-SECRET` | `MULESOFT_CLIENT_SECRET` |

The **team Key Vault** may only contain the rows above; the fetch script is aligned to that set. **Jira / Atlassian** tokens (if needed for local utilities) are **not** in the central vault unless your admin adds them—configure those manually from `env.sample` or extend the vault + `KEY_VAULT_SECRETS` / `DEFAULT_SECRET_MAP` in `fetch-secrets-from-keyvault.ts`.

**Azure Portal:** Key Vault → **Secrets** → **Generate/Import** → Name = row above, Value = secret → enable **Set expiration date** if your org policy requires it → Create.

**Expiration (CLI / policy):** Pass `--expires` in UTC ISO 8601. **Important:** Azure Policy *“Secrets should have the specified maximum validity period”* (and similar) limits how far in the future expiration may be — often **90 or 180 days** from when the secret is set. A date like `2027-12-31` is usually **rejected** (`ForbiddenByGovernancePolicy`). Use a date **within** your org’s max, e.g. 90 days from now:

```powershell
$exp = [datetime]::UtcNow.AddDays(90).ToString("yyyy-MM-ddTHH:mm:ssZ")
az keyvault secret set --vault-name "kv-np-acc-uks-bsg-aut" --name "D365-CLIENT-ID" --file ".\value.txt" --expires $exp
```

The upload script `upload-env-to-keyvault.ps1` uses **`--expires` at end of day `2026-12-31` UTC** by default. If **ForbiddenByGovernancePolicy** appears (max validity shorter than that), run with **`-ExpiresInDays 90`** (or whatever your admin specifies). Override the fixed date with **`-ExpiresOnUtc`** if needed.

**Azure CLI** (repeat per secret; no secret value in shell history if you use `--value` from a file):

```bash
az login
az keyvault secret set --vault-name "<your-vault-name>" --name "D365-CLIENT-SECRET" --file ./path/to-secret-value.txt --expires "2027-12-31T23:59:59Z"
# or (less ideal — value in history):
az keyvault secret set --vault-name "<your-vault-name>" --name "MULESOFT-CLIENT-ID" --value "<client-id>" --expires "2027-12-31T23:59:59Z"
```

**Bulk upload from local `.env.qa` (recommended — values stay on your machine):** from repo root after `az login`:

```powershell
.\scripts\setup\upload-env-to-keyvault.ps1 -VaultName "kv-np-acc-uks-bsg-aut" -EnvPath "src\config\env\.env.qa"
```

Shorter expiration if policy requires it (UTC relative days) or custom absolute date:

```powershell
.\scripts\setup\upload-env-to-keyvault.ps1 -VaultName "kv-np-acc-uks-bsg-aut" -ExpiresInDays 90
.\scripts\setup\upload-env-to-keyvault.ps1 -VaultName "kv-np-acc-uks-bsg-aut" -ExpiresOnUtc ([datetime]::Parse("2027-06-30T23:59:59Z"))
```

Dry-run (which keys would upload, no secrets printed):

```powershell
.\scripts\setup\upload-env-to-keyvault.ps1 -VaultName "kv-np-acc-uks-bsg-aut" -WhatIf
```

#### Troubleshooting: Portal and `az` both fail

You often see **two separate problems** at once:

**A) Networking — `ForbiddenByConnection` / “Public network access is disabled…”**

The vault is locked so **only** traffic from:

- An **allowed public IPv4 address** (firewall exception), and/or  
- A **private endpoint** reachable from a **corporate VPN**, **ExpressRoute**, or a **VM / runner inside the same VNet**,

can reach the **data plane** (secrets). Your **home or office PC** is usually blocked until an admin allows it.

**What to ask your Azure / network admin**

1. Key Vault → **Networking**: either add your **current public IP** under “Firewall” (if the vault allows selected public IPs), **or** confirm you must use **VPN** / **jump box** / **self-hosted agent** that sits in the private endpoint’s VNet.  
2. If the design is **private endpoint only**, you **cannot** use Portal or `az` from a random laptop without VPN—run upload from an approved environment instead.

**B) Authorization — “You are unauthorized to view these contents” / HTTP 403 on secret APIs**

**Key Vault Contributor** manages the **resource**; it does **not** automatically allow **get/set/list** on **secrets**. You need:

- **Key Vault Secrets Officer** (or **Administrator**) to **create/update** secrets (bootstrap).  
- **Key Vault Secrets User** for the team (and fetch script) to **read** secrets.

Assign these on **this Key Vault** resource (IAM), not only at subscription level.

**Quick checks after admin changes**

- From an **allowed network**: `az keyvault secret list --vault-name <name> -o table`  
- Portal: open **Secrets** — list should load without the yellow “public network access” banner *and* without “unauthorized” (both must be fixed).

Do **not** paste real secrets into Teams, email, or the repo. Rotate anything that was ever exposed.

#### Sharing access with the team (no secret sharing in chat)

1. Use an **Azure AD group** (e.g. `SG-Automation-QA` or your existing automation group).
2. Key Vault → **Access control (IAM)** → **Add role assignment** → assign **Key Vault Secrets User** to that **group** (scope = this Key Vault).
3. Confirm each teammate is a **member** of the group (they use their own `az login` identity).
4. Send teammates only: **vault URI** (`https://<name>.vault.azure.net`), **link to this doc**, and the command:

```bash
KEY_VAULT_URL=https://<your-vault-name>.vault.azure.net npx ts-node scripts/setup/fetch-secrets-from-keyvault.ts
```

They run `az login` first; the script writes `src/config/env/.env.qa` (gitignored). Missing secrets in the vault are **skipped** with a warning until you add them.

**Optional CI:** Create a **managed identity** or **app registration** for GitHub/self-hosted runners and grant it **Key Vault Secrets User** on the same vault; store nothing in chat—only in Key Vault + CI secret store if you mirror for Actions.

---

### Option 2: Password manager with a shared vault

Use a **team password manager** (e.g. 1Password, Bitwarden, LastPass) with a shared vault (e.g. “Automation – QA”).

- **One person** (e.g. lead or DevOps) stores the SPN client ID and client secret (and other shared credentials) in the vault, e.g. as a “Secure note” or “Item” with fields matching the env var names.
- **Team members** are granted access to that vault via the tool’s group/permissions.
- **Onboarding:** Each developer opens the vault, copies the values **once** into their local `src/config/env/.env.qa` (or exports via the tool’s CLI if available). They should not paste secrets into chat or email.

**Benefit:** No code changes; works with any password manager the org already uses. **Drawback:** Someone can still copy the secret to a file; so Key Vault is stronger if you have Azure AD.

---

### Option 3: CI-only secrets (developers use a different path)

If **only** CI (e.g. GitHub Actions) needs the SPN:

- Keep **all** shared secrets in **GitHub repository Secrets** (or your CI’s secret store).
- **Developers** run tests that don’t need Dynamics/SQL/MuleSoft locally, or they use a **different** env (e.g. `.env.dev`) with different credentials provided by another process.

This avoids sharing the production/QA SPN secret with every developer but limits what they can run locally.

---

### Option 4: Secure file share (weaker)

Put an **encrypted** `.env.qa` (e.g. password-protected zip or a file in a share that only the automation group can read) in a secure location (e.g. Azure Blob with Azure AD auth, or SharePoint with restricted access). Each developer downloads it once and places it in `src/config/env/.env.qa`.

**Drawback:** The file still contains plain-text secrets on the developer’s machine after decryption; so Key Vault or password manager is preferable.

---

## What to put in the shared store

Align with **`src/config/env/env.sample`** and your CI secrets. Typically you’ll store (for QA):

- **Dynamics / SPN:** `D365_TENANT_ID`, `D365_CLIENT_ID`, `D365_CLIENT_SECRET`, `D365_SCOPE` (and optional base URLs).
- **SQL Server / SPN:** `SQLSERVER_TENANT_ID`, `SQLSERVER_CLIENT_ID`, `SQLSERVER_CLIENT_SECRET`, `SQLSERVER_HOST` (and optional port/DB).
- **MuleSoft:** `MULESOFT_CLIENT_ID`, `MULESOFT_CLIENT_SECRET` (and optional base URL, org ID, env ID).
- **Jira / Atlassian:** `JIRA_EMAIL` or `ATLASSIAN_EMAIL`, `JIRA_API_TOKEN` or `ATLASSIAN_API_TOKEN` (and optional base URLs).
- **Salesforce:** Often per-org; if shared, `SF_JWT_CLIENT_ID`, `SF_PRIVATE_KEY` or cert path, and usernames per role.

Use the **same variable names** as in `env.sample` so the fetch script or export can write directly into `.env.qa`.

---

## Summary

| Approach | Best for | How team gets secrets |
|----------|----------|------------------------|
| **Azure Key Vault** | Teams already on Azure AD; you want one source of truth and no plain-text sharing | Run fetch script once after `az login`; script writes/merges `.env.qa` from Key Vault. |
| **Password manager** | Org already uses 1Password/Bitwarden/etc. | Open shared vault; copy into `.env.qa` once per machine (or use CLI export). |
| **CI-only** | Only automation runners need the SPN | Secrets only in GitHub/CI; developers don’t get the shared secret. |
| **Secure file share** | Quick stopgap | Download encrypted `.env` from restricted share; decrypt and save as `.env.qa`. |

**Recommendation:** Prefer **Azure Key Vault** and the automation group’s Azure AD membership so that the team gets access through the framework (e.g. fetch script) without ever sharing the client secret in plain text. Use the same SPN for everyone; access is controlled by Key Vault + Azure AD, not by distributing the secret.

---

## Related

- **Env template:** `src/config/env/env.sample` – variable names and comments.
- **SPN / Application User:** `docs/dynamics-spn-application-user-setup.md` – Dynamics SPN and Application User setup.
- **MuleSoft:** `docs/setup/MULESOFT_ACCESS_REQUIREMENTS.md` – Connected App and log access.
- **CI secrets:** `.github/workflows/*.yml` – GitHub Actions use repository Secrets; add the same variable names there for CI.
