# Postman — SF736 PTY / Party sync bug repro

Import into Postman:

| File | Purpose |
|------|---------|
| [SF736-PTY-Party-Sync-Bug.postman_collection.json](./SF736-PTY-Party-Sync-Bug.postman_collection.json) | Requests |
| [SF736-qamerge-qatest2.postman_environment.json](./SF736-qamerge-qatest2.postman_environment.json) | Variables template |

## Quick start

1. **Import** collection + environment in Postman.
2. **Fill environment** from `src/config/env/.env.qamerge`:
   - `d365_tenant_id`, `d365_client_id`, `d365_client_secret`
   - `sf_instance_url`, `sf_jwt_username` (optional if using token script)
3. **Salesforce token:**
   ```bash
   ENV=qamerge npx ts-node scripts/postman-sf-jwt-token.ts
   ```
   Copy `access_token` → `sf_access_token`, `instance_url` → `sf_instance_url`.
4. Run folder **0 — Auth** → **1 — Reproduce** (Collection Runner, in order).

## What proves the bug

| Step | Pass = sync OK | Fail = bug |
|------|----------------|------------|
| **6** Party by `accelins_partyid` (GUID) | Row found, GUID = `Dataverse_ID__c` | No row |
| **6** PTY assertion | `accelins_partymasterid` = `PTY_Code__c` | **Different PTY values** |
| **7** Party by `accelins_partymasterid` = SF PTY | Row found, same GUID | **0 rows** → BDS_1001 path |

## MuleSoft logs (optional)

Folder **2 — MuleSoft logs** needs `mulesoft_client_id`, `mulesoft_client_secret`, `mulesoft_org_id`, `mulesoft_env_id`, `mulesoft_deployment_id` from Anypoint. Search for `BDS_1001` or your correlation ID.

## SQL (SSMS)

```sql
SELECT accelins_partymasterid, accelins_partyid, accelins_name
FROM [dbo].[accelins_party]
WHERE accelins_partyid = '<sf_dataverse_id>'
   OR accelins_partymasterid = '<sf_pty_code>'
```

## Note on Active status

Step **3** may return 400 on qamerge if a signed contract is required. Activate via Salesforce UI, then continue from step **4**.
