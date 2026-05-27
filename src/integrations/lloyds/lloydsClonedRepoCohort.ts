/**
 * Lloyd's Agency QA — programme repository cohort (**seventeen** ids, **2026-05-06** reload).
 *
 * Source: Power Apps **"Lloyds 17 repos\*"** saved view (Repository ID column). ADP / Snowflake /
 * **`mulesoft-xml`** and Dynamics **`accelins_repositoryfile`** matrices use the **same** list:
 * {@link LLOYDS_PROGRAMME_REPOSITORY_IDS}.
 *
 * Exports:
 * - **`LLOYDS_PROGRAMME_REPOSITORY_IDS`** — canonical frozen array (order: default smoke repo first).
 * - **`LLOYDS_AGENCY_COHORT_12`** — historical name; **identical** to the programme list (length **17**).
 * - **`LLOYDS_CLONED_REPOSITORY_IDS`** — same reference; Cucumber examples + sanity **`runnable`** filtering.
 *
 * Programme copy: `docs/lloyds/LLOYDS_QA_PROGRESS.md` §4.0.1, `docs/lloyds/SKILL.md`.
 *
 * **ENG-299** (posted journals) may still affect posting / Tagetik read-only assertions; happy-path automation
 * otherwise assumes masters and blob XML exist for each id.
 */

/** Canonical programme references (Snowflake ↔ D365 F&O / Mule field behaviour). */
export const LLOYDS_ISDE_ADP_D365_REVISED =
  'https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3081535490/ADP-+D365+F+O+revised';

export const LLOYDS_ISDE_FIELD_MAPPINGS =
  'https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings';

/** Seventeen repository ids — **"Lloyds 17 repos\*"** view, **2026-05-06**. First id = default smoke target. */
export const LLOYDS_PROGRAMME_REPOSITORY_IDS: readonly string[] = Object.freeze([
  'US-60464',
  'US-59665',
  'US-57534',
  'US-57241',
  'US-60465',
  'US-60597',
  'US-61055',
  'US-61070',
  'US-61775',
  'US-61822',
  'US-57230',
  'US-58257',
  'US-61780',
  'US-61781',
  'US-61790',
  'US-61848',
  'US-61899',
]);

/** @deprecated Historical export name — same as {@link LLOYDS_PROGRAMME_REPOSITORY_IDS} (17 ids). */
export const LLOYDS_AGENCY_COHORT_12 = LLOYDS_PROGRAMME_REPOSITORY_IDS;

/** Dynamics-cloned cohort for full Lloyd's Cucumber matrix / sanity planner — same programme list. */
export const LLOYDS_CLONED_REPOSITORY_IDS = LLOYDS_PROGRAMME_REPOSITORY_IDS;

/** Default repository for Lloyd's integration tests and CLIs when `LLOYDS_TEST_REPO_ID` is unset. */
export const LLOYDS_DEFAULT_TEST_REPO_ID = 'US-60464' as const;

const cohortSet = new Set(LLOYDS_CLONED_REPOSITORY_IDS);

/**
 * Resolves which cloned-cohort repository id to drive tests/scripts against.
 *
 * Env (first wins): `LLOYDS_TEST_REPO_ID`, then `LLOYDS_E2E_REPO_ID`, else {@link LLOYDS_DEFAULT_TEST_REPO_ID}.
 * Value must be one of {@link LLOYDS_CLONED_REPOSITORY_IDS}.
 */
export function resolveLloydsTestRepoId(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.LLOYDS_TEST_REPO_ID ?? env.LLOYDS_E2E_REPO_ID ?? '').trim();
  const id = (raw || LLOYDS_DEFAULT_TEST_REPO_ID).toUpperCase();
  if (!cohortSet.has(id)) {
    throw new Error(
      `Invalid Lloyd's test repository id "${id}". Must be one of: ${LLOYDS_CLONED_REPOSITORY_IDS.join(', ')}. ` +
        'Set LLOYDS_TEST_REPO_ID to a programme cohort repo or leave unset for default US-60464.',
    );
  }
  return id;
}
