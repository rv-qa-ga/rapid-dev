# MuleSoft API Access Requirements – Setup for Log Verification

This document describes how to set up MuleSoft Anypoint Platform API access so that the automation framework can connect via API to verify application status and **retrieve logs**. It is intended for **Anypoint Platform admins** who create and share credentials, and for **QA/automation** who configure the environment.

---

## What the MuleSoft / Anypoint team must do (log access)

So that our automation framework can **read MuleSoft logs**, the following must be in place. Connectivity to the Connected App (OAuth2 token) is already working; log retrieval is failing until these are done.

### 1. Grant the Connected App permission to read deployment logs

The Connected App used by the framework must have **API access** that allows **reading deployment logs** via the **Application Manager API** (CloudHub 2.0).

- In **Anypoint Platform**: **Access Management** → **Connected Apps** → select the app used for automation.
- Ensure the app is granted access to the **Application Manager API** (or **CloudHub API** / **Runtime Manager API**, depending on your Anypoint product naming).
- The required permission is **read** access to **deployments** and **logs** (e.g. scopes such as `read:deployments`, `read:logs`, or equivalent in your permission model). The framework does **not** need deploy, start/stop, or write permissions—only **read logs** (and ideally list deployments so we can resolve application name → deployment ID).

If the Connected App was created without these scopes, add them and re-share the Client ID/Secret if anything changed. No change to Client ID/Secret is required if only permissions were updated.

### 2. Confirm the API base URL and log endpoint we use

Our framework calls:

| Item | Value |
|------|--------|
| **API base** | `https://<region>.anypoint.mulesoft.com/amc/application-manager/api/v2` (e.g. EU: `https://eu1.anypoint.mulesoft.com/amc/application-manager/api/v2`) |
| **Logs endpoint** | `GET /organizations/{orgId}/environments/{envId}/deployments/{deploymentId}/logs` |
| **Headers** | `Authorization: Bearer <token>`, `X-ANYPNT-ORG-ID`, `X-ANYPNT-ENV-ID` |

Please confirm that:

- This base URL and path are correct for your Anypoint/CloudHub setup (CloudHub 2.0 / Private Space).
- The Connected App’s token is allowed to call this API in the target organization and environment.

If your runtimes use **CloudHub 1.0** or a different API (e.g. different path or host), tell us the **exact base URL and path** for retrieving application/deployment logs so we can align the framework.

### 3. Provide Organization ID and Environment ID

We already use these for the log request. Please confirm they are correct for the environment where the Lloyd’s/MuleSoft applications run:

- **Organization ID** – GUID of the Anypoint organization (e.g. from Account → Organization / Settings or from the URL).
- **Environment ID** – GUID of the environment (e.g. QA, TEST, SIT) where the apps are deployed (e.g. from Runtime Manager / CloudHub → environment settings).

We configure these as `MULESOFT_ORGANIZATION_ID` and `MULESOFT_ENVIRONMENT_ID` in our `.env`. If the IDs are wrong or the app has no access to that org/env, log calls will fail.

### 4. Provide Deployment ID(s) or a way to resolve application name → deployment ID

Our framework can call **deployment logs** by **deployment ID**:

- **Preferred:** For each application we need to test (e.g. Lloyd’s Tagetik flow, ResQ flow, D365 F&O flow), provide the **deployment ID** (not just the application name). We can then store them in config and call `GET .../deployments/{deploymentId}/logs`.
- **Alternative:** If there is an API to **list deployments** in an environment (e.g. `GET .../organizations/{orgId}/environments/{envId}/deployments`) or to get a deployment by **application name**, confirm that the Connected App can call it. Our framework can then resolve application name → deployment ID and then fetch logs.

If the only way to get logs in your setup is by **application name** (e.g. a different API path like `/applications/{applicationName}/logs`), tell us the **exact base URL and path** so we can use it.

### 5. Quick verification

After the above are done, the automation team will:

1. Run `npx ts-node scripts/test-mulesoft-auth.ts` (already passes when connectivity works).
2. Call the log endpoint with the same token, org ID, env ID, and a valid deployment ID (or application name if that API is supported).

If the log request returns **200** and a JSON body with log entries, the framework can use it. If the response is **403 Forbidden** or **404 Not Found**, we will need the MuleSoft team to re-check permissions and API path (steps 1–4 above).

---

## Use Case

We need API access to:

- Verify application status (Running/Stopped)
- Retrieve application logs
- Search for errors in logs
- Trace requests by correlation ID
- Verify event capture in logs

This is used in automated test scenarios (e.g. `src/features/api/MuleSoft/MuleSoft-Log-Verification.feature`, `MuleSoft-TEST-Environment-Logs.feature`) to ensure MuleSoft applications are functioning correctly after deployments or data changes.

---

## Steps for Admin (Anypoint Platform)

**For log access:** See the section **"What the MuleSoft / Anypoint team must do (log access)"** above—it lists the permissions, API confirmation, and IDs the MuleSoft dev team must provide so the framework can read logs.

### 1. Create a Connected App

1. Log into Anypoint Platform:
   - **US region:** https://anypoint.mulesoft.com  
   - **EU region:** https://eu1.anypoint.mulesoft.com (use this if your organization is in EU; our QA/SIT config uses EU)
2. Navigate to **Access Management** → **Connected Apps**
3. Click **Create Connected App**
4. Fill in the details (name, description, etc.). Ensure the app has **read-only** access suitable for viewing applications and logs (no write permissions required).
5. Click **Create**
6. **Important:** Copy the **Client ID** and **Client Secret** immediately. The secret is only shown once.
7. Share the credentials securely with the QA/automation team (e.g. via secure channel or password manager).

### 2. Provide Organization and Environment IDs (for log APIs)

For the framework to call the **log retrieval API** (CloudHub 2.0 Application Manager API), we also need:

- **Organization ID** – The Anypoint organization (business group) ID
- **Environment ID** – The environment where the applications run (e.g. QA, TEST, SIT)

**Where to find them in Anypoint:**

- **Organization ID:** In Anypoint Platform, go to **Account** (or your org name) → **Organization** / **Settings**. The Organization ID is often shown in the URL or in the organization details (GUID format).
- **Environment ID:** Go to **Runtime Manager** (or **CloudHub**) → select the correct environment (e.g. QA, TEST). The Environment ID is typically in the environment settings or in the API path when you use the platform (GUID format).

Share these two IDs together with the Client ID and Client Secret so that the team can configure log access.

---

## Configuration (QA / Automation)

### Environment variables

Store the following in your environment-specific `.env` file (e.g. `src/config/env/.env.qa`). **Do not commit `.env` files**; they are in `.gitignore`.

| Variable | Required | Description |
|----------|----------|-------------|
| `MULESOFT_CLIENT_ID` | **Yes** | Client ID from the Connected App (step 6 above) |
| `MULESOFT_CLIENT_SECRET` | **Yes** | Client Secret from the Connected App (step 6 above) |
| `MULESOFT_BASE_URL` | Optional | Anypoint Platform base URL. Default in code: `https://anypoint.mulesoft.com`. For **EU** use: `https://eu1.anypoint.mulesoft.com` |
| `MULESOFT_API_BASE_URL` | Optional | Application Manager API base. Default: `{baseUrl}/amc/application-manager/api/v2`. Override only if your endpoint differs. |
| `MULESOFT_ORGANIZATION_ID` | **Yes for logs** | Organization ID (from step 2 above). Required for deployment/log APIs. |
| `MULESOFT_ENVIRONMENT_ID` | **Yes for logs** | Environment ID (e.g. QA, TEST). Required for deployment/log APIs. |

**Example (EU, QA):**

```bash
# MuleSoft Anypoint Platform (EU)
MULESOFT_BASE_URL=https://eu1.anypoint.mulesoft.com
MULESOFT_CLIENT_ID=your_connected_app_client_id
MULESOFT_CLIENT_SECRET=your_connected_app_client_secret
MULESOFT_ORGANIZATION_ID=your_organization_id_guid
MULESOFT_ENVIRONMENT_ID=your_environment_id_guid
```

Alternatively, `baseUrl` and `apiBaseUrl` can be set in the environment JSON config (e.g. `src/config/env/qa.json`) and only the credentials and IDs overridden via env vars.

### Verifying the connection

From the repo root, run:

```bash
npx ts-node scripts/test-mulesoft-auth.ts
```

Or with a specific env:

```bash
ENV=qa npx ts-node scripts/test-mulesoft-auth.ts
```

This script checks that `MULESOFT_CLIENT_ID` and `MULESOFT_CLIENT_SECRET` are set and that OAuth2 client-credentials authentication succeeds. If it passes, the framework can authenticate for API calls. Log retrieval will also require `MULESOFT_ORGANIZATION_ID` and `MULESOFT_ENVIRONMENT_ID` to be set.

---

## Security Notes

- Credentials are stored in **environment variables** (`.env` files), **not in code**.
- `.env` files are in **`.gitignore`** and are **not committed** to the repository.
- This follows the same security pattern used for Salesforce and Dynamics integrations in this framework.
- The Connected App should be granted only **read-only** access (applications and logs). No write or deploy permissions are required for the use case above.

---

## Related Documentation

- [MuleSoft Integration – QA Knowledge](../qa/MULESOFT_INTEGRATION_QA_KNOWLEDGE.html) – Integration testing (Salesforce ↔ Dynamics via MuleSoft), troubleshooting, and step definitions.
- **Feature files (log verification):** `src/features/api/MuleSoft/MuleSoft-Log-Verification.feature`, `MuleSoft-TEST-Environment-Logs.feature`, `MuleSoft-Authentication-Test.feature`.
- **API client:** `src/api-clients/mulesoft/MuleSoftAPIClient.ts` – methods such as `getDeploymentLogs(deploymentId, options)`.
- **Auth utility:** `src/utils/mulesoft-auth.ts` – OAuth2 client credentials flow.

---

*Last updated: 2026-03-09*
