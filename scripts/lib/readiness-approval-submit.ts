/**
 * Opportunity_Readiness__c submit for approval — handles NO_APPLICABLE_PROCESS by retrying
 * without processDefinitionNameOrId when the configured name/id does not match the org.
 */

export function isNoApplicableProcessError(err: unknown): boolean {
  const m = String((err as Error)?.message || err);
  return /NO_APPLICABLE_PROCESS|No applicable approval process/i.test(m);
}

/**
 * Submit with explicit process name or Id; on NO_APPLICABLE_PROCESS, retry once with no process
 * (Salesforce selects the single matching active process, if any).
 */
export async function submitReadinessApprovalWithAutoRetry(
  contextId: string,
  processDefinitionNameOrId: string,
  submit: (
    ctxId: string,
    proc?: string
  ) => Promise<{ instanceId?: string; newWorkitemIds?: string[] }>
): Promise<{ instanceId?: string; newWorkitemIds?: string[] }> {
  try {
    return await submit(contextId, processDefinitionNameOrId);
  } catch (e) {
    if (!isNoApplicableProcessError(e)) throw e;
    if (!processDefinitionNameOrId?.trim()) throw e;
    console.warn(
      '[WARN] Submit failed (NO_APPLICABLE_PROCESS) for the configured process name/id. ' +
        'Retrying without processDefinitionNameOrId so Salesforce can auto-select if exactly one process applies.'
    );
    return await submit(contextId, undefined);
  }
}
