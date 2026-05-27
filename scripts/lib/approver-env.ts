/**
 * Read comma-separated approver usernames from env: {PREFIX}_APPROVER_USERNAMES_{REGION}.
 * Canonical prefix for Opportunity Readiness questionnaire: OPPORTUNITY (e.g. OPPORTUNITY_APPROVER_USERNAMES_EU).
 * Legacy: CONTRACTING_APPROVER_USERNAMES_* (still supported).
 */

export function getApproverUsernames(envPrefix: string, region: string): string[] {
  const key = `${envPrefix}_APPROVER_USERNAMES_${region.toUpperCase()}`;
  const raw = process.env[key]?.trim();
  if (!raw) return [];
  return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
}

/** Opportunity Readiness questionnaire approvers: OPPORTUNITY_* then legacy CONTRACTING_*. */
export function getOpportunityReadinessApproverUsernames(region: string): string[] {
  const primary = getApproverUsernames('OPPORTUNITY', region);
  if (primary.length) return primary;
  return getApproverUsernames('CONTRACTING', region);
}

/** ManCo utility: MANCO_* overrides, then Opportunity Readiness chain. */
export function getMancoReadinessApprovers(region: string): string[] {
  const manco = getApproverUsernames('MANCO', region);
  if (manco.length) return manco;
  return getOpportunityReadinessApproverUsernames(region);
}

/** POG committee approvers (MANCO_POG_* only — set in .env.qa per org). */
export function getMancoPogApprovers(region: string): string[] {
  return getApproverUsernames('MANCO_POG', region);
}

/** Salesforce approval process for Opportunity Readiness submit (canonical then legacy). */
export function getOpportunityReadinessApprovalProcessName(): string | undefined {
  const v =
    process.env.OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME?.trim() ||
    process.env.CONTRACTING_APPROVAL_PROCESS_NAME?.trim();
  return v || undefined;
}

/**
 * Value for Process Approvals API `processDefinitionNameOrId`: prefer 15/18-char ProcessDefinition Id
 * (reliable when label/name in Setup differs). Then process name from env.
 */
export function getOpportunityReadinessApprovalProcessDefinitionNameOrId(): string | undefined {
  const id = process.env.OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID?.trim();
  if (id) return id;
  return getOpportunityReadinessApprovalProcessName();
}

/** ManCo: MANCO_* process Id overrides, then OPPORTUNITY_* Id, then name chain (includes default label). */
export function getMancoReadinessApprovalProcessDefinitionNameOrId(defaultName = 'Opportunity Readiness Approval'): string {
  const id =
    process.env.MANCO_READINESS_APPROVAL_PROCESS_ID?.trim() ||
    process.env.OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID?.trim();
  if (id) return id;
  return getMancoReadinessApprovalProcessName(defaultName);
}

/** ManCo script: optional MANCO_* override before canonical / legacy process names. */
export function getMancoReadinessApprovalProcessName(defaultName = 'Opportunity Readiness Approval'): string {
  return (
    process.env.MANCO_READINESS_APPROVAL_PROCESS_NAME?.trim() ||
    process.env.OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME?.trim() ||
    process.env.CONTRACTING_APPROVAL_PROCESS_NAME?.trim() ||
    defaultName
  );
}

/**
 * Opportunity Readiness automation: **US** — org completes after one approval; scripts use only the
 * first pending work item and the **first** username in `OPPORTUNITY_APPROVER_USERNAMES_US`.
 * **UK, EU, CA** — every listed approver must act; scripts walk **all** pending work items in order,
 * pairing index *i* with `approverUsernames[i]` (fallback: first username). See
 * `docs/OPPORTUNITY_READINESS_APPROVERS_BY_REGION.md`.
 */
export function applyOpportunityReadinessApprovalSlice(
  memberOperatingRegion: string,
  workitemIds: string[],
  approverUsernames: string[]
): { workitemIds: string[]; approverUsernames: string[] } {
  const r = memberOperatingRegion.trim().toUpperCase();
  if (r === 'US') {
    return {
      workitemIds: workitemIds.slice(0, 1),
      approverUsernames: approverUsernames.slice(0, 1),
    };
  }
  return { workitemIds, approverUsernames };
}
