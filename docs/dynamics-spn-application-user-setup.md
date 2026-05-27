# Dynamics 365 SPN / Application User Setup

Use this to fix the **"You don't have permissions to these records or something may be wrong with the site map"** error (0x80050016) when running Dynamics UI tests with the service principal (SPN).

The SPN authenticates successfully; Dynamics rejects access because there is no **Application User** in D365 linked to that app with a security role. You need to do **both**:

1. **Azure Portal** – ensure the app registration has the right API permissions (if not already done).
2. **Power Platform / Dynamics 365** – create the Application User and assign a security role (required for UI / site map access).

---

## Part 1: Azure Portal (App Registration)

1. Go to **Azure Portal** → **Microsoft Entra ID** (Azure Active Directory) → **App registrations**.
2. Find your app (the one whose **Application (client) ID** is your `D365_CLIENT_ID`).
3. Open it and go to **API permissions**.
4. Ensure you have a permission for **Dynamics CRM** or **Dataverse**:
   - Click **Add a permission**.
   - Choose **APIs my organization uses**.
   - Search for **Dynamics CRM** or **Dataverse** (or the name of your D365 environment).
   - Select **Delegated** (or **Application** if you only use client credentials):
     - For client credentials (SPN), **Application** permission is typical, e.g. **user_impersonation** or **Access Dynamics 365 as organization user** (exact name depends on tenant).
   - Click **Add permissions**, then **Grant admin consent** if required.
5. Under **Certificates & secrets**, ensure you have a **Client secret** (this is your `D365_CLIENT_SECRET`). Create a new one if needed and update `.env.qa`.
6. Under **Overview**, note:
   - **Application (client) ID** → `D365_CLIENT_ID`
   - **Directory (tenant) ID** → `D365_TENANT_ID`

No further Azure steps are required for the permissions error; the rest is in Power Platform / D365.

---

## Part 2: Power Platform / Dynamics 365 (Application User – required for UI)

The Application User links your Azure AD app to a “user” inside Dynamics 365 and gives it a security role (and thus access to the app and site map). This is done in **Power Platform Admin Center** or inside **Dynamics 365**.

### Option A: Power Platform Admin Center

1. Go to [Power Platform Admin Center](https://admin.powerplatform.microsoft.com).
2. Select your **Environment** (e.g. the one containing your D365 / RDM app).
3. Open **Settings** (top right) for that environment.
4. Under **Users + permissions**, choose **Application users** (or **Users** and then look for “Application user” type).
5. Click **+ New app user**.
6. In the panel:
   - **App**: choose **+ Create new app user** (or select an existing app registration connection if you have one).
   - **Application ID**: paste your Azure AD app’s **Application (client) ID** (`D365_CLIENT_ID`).
   - **Business unit**: select the right business unit (often the root).
   - **Security role(s)**: select a role that has access to the **Reference Data Management** app and the entities you need (e.g. Party). For testing, **System Administrator** or a custom role that includes the RDM app and site map is typical.
7. Click **Create** / **Save**.

### Option B: Dynamics 365 (Settings in the app)

1. Open your **Dynamics 365** environment (e.g. `https://accelinsqatest2.crm11.dynamics.com`).
2. Click the **gear icon** (Settings) → **Advanced settings**.
3. Go to **Settings** → **Security** → **Users**.
4. Change the view to **Application Users** (or create a user of type **Application User**).
5. Click **+ New**.
6. Fill in:
   - **Application ID**: your Azure AD app’s **Application (client) ID** (`D365_CLIENT_ID`).
   - **Full Name**: e.g. `Automation SPN` or `E2E Test App`.
   - **Primary Email**: any valid format (e.g. `automation@yourcompany.com`).
   - **Business Unit**: select the correct one.
   - **Security Role**: assign a role that can access the **Reference Data Management** app and the **Party** entity / site map (e.g. **System Administrator** or a custom role).
7. Save.

### After creating the Application User

- Wait a few minutes for replication.
- Re-run the Dynamics UI test; the same SPN token should now be accepted and the permissions/site map error should go away.

---

## Summary

| Where              | What to do |
|--------------------|------------|
| **Azure Portal**   | Confirm App registration has **API permissions** for Dynamics CRM/Dataverse and **Client secret**; note Client ID and Tenant ID. |
| **Power Platform / D365** | Create an **Application User** with your app’s **Application (client) ID** and assign a **Security role** that can access the Reference Data Management app and site map. |

The 0x80050016 error is resolved by creating and configuring the **Application User** in Power Platform / D365 (Part 2); Azure Portal (Part 1) is to ensure the app itself is set up correctly.
