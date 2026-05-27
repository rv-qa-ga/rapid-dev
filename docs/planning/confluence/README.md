# Confluence content for BSGQA Next-Version Planning Hub and TM Space Home

This folder contains Confluence wiki markup for:

* **[TM Space Home](https://accelins.atlassian.net/wiki/spaces/TM/overview)** — The space overview page (central repository description and links). Content: `TM_Space_Overview_Home.txt`. Update with: `npm run docs:update:tm-home`
* **[BSGQA Next-Version Planning Hub – Overview](https://accelins.atlassian.net/wiki/spaces/TM/pages/2979201092/BSGQA+Next-Version+Planning+Hub+Overview)** — Hub and three sub-pages. Update with: `npm run docs:update:bsgqa-hub`

## Automated update (recommended)

From the repo root, with Confluence credentials in `src/config/env/.env.qa` (or `.env.qa`):

```bash
# Update TM space overview / home page (description + links to main pages)
npm run docs:update:tm-home

# Update BSGQA Planning Hub and its three sub-pages
npm run docs:update:bsgqa-hub

# Create "Automation Framework Presentation" sub-page under Complete Workflow Guide and add link to TM Automation Testing page
npm run docs:create:automation-presentation-subpage
```

Requires `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN` (or `JIRA_EMAIL` / `JIRA_API_TOKEN`). For the TM home page, the script uses Confluence API v2 to get the space's `homepageId`; override with `CONFLUENCE_TM_HOME_PAGE_ID` if needed.

**Note:** The live Confluence page could not be read (login required). Use the content below to update the hub and create the sub-pages.

## Files

| File | Use for |
|------|--------|
| `TM_Space_Overview_Home.txt` | **TM space home/overview** – Central repository description and links to main pages. Run `npm run docs:update:tm-home` to push. |
| `BSGQA_Planning_Hub_Overview.txt` | **Hub page** – Paste into the existing Confluence page to replace or update the body. |
| `BSGQA_Subpage_Month_End_Process.txt` | **Sub-page 1** – Create a child page titled *Month-End Process* and paste this content. |
| `BSGQA_Subpage_End_To_End_Process.txt` | **Sub-page 2** – Create a child page titled *End-to-End Process* and paste this content. |
| `BSGQA_Subpage_Automation_Testing.txt` | **Sub-page 3** – Create a child page titled *Automation Testing* and paste this content. |

## Steps to update Confluence

1. **Open the hub page**  
   [BSGQA Next-Version Planning Hub – Overview](https://accelins.atlassian.net/wiki/spaces/TM/pages/2979201092/BSGQA+Next-Version+Planning+Hub+Overview)

2. **Edit the hub page**  
   - Click *Edit*.
   - Replace or merge the body with the content from `BSGQA_Planning_Hub_Overview.txt`.
   - If Confluence uses the new editor, you may need to paste and then fix links. The `[Page Title]` style creates links to pages with that title once they exist.

3. **Create the three sub-pages**  
   - From the hub page, use *Create* → *Child page* (or *Add page* under it).
   - Create three pages with these exact titles:
     - **Month-End Process**
     - **End-to-End Process**
     - **Automation Testing**
   - In each new page, paste the content from the corresponding `.txt` file.

4. **Link the sub-pages from the hub**  
   - In the hub page, add links to the three child pages (e.g. `[Month-End Process]`, `[End-to-End Process]`, `[Automation Testing]`) in the “Three Focus Areas” section so the table or list links to each sub-page.

5. **End-to-End Process images**  
   - The E2E sub-page references two images. Upload them to Confluence (e.g. attach to the page or insert via Insert → Image):
     - `docs/planning/assets/e2e-flow-overview.png`
     - `docs/planning/assets/e2e-qa-scope.png`
   - Replace the “Attach or insert the image” placeholders with the inserted images.

## Markup

Content uses Confluence wiki markup (e.g. `h1.`, `h2.`, `*bold*`, `{{monospace}}`, `||table||`). If your space uses the new Confluence editor, paste in *Insert* → *Markup* → *Confluence Wiki* or paste plain and adjust formatting as needed.

---
*Generated from docs/planning/ (QA_Q1_MULTI_QUARTER_PLAN.md, AUTOMATION_RUNBOOK_QA_ADOPTION.md, assets). Last updated: February 2025.*
