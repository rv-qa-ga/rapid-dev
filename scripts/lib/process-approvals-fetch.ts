/**
 * Salesforce Process Approvals REST API (shared by contracting + ManCo scripts).
 * Uses v58.0 to match Lead convert and existing contracting tooling.
 */

export const PROCESS_APPROVALS_API_VERSION = 'v58.0';

export async function approveWorkitem(
  instanceUrl: string,
  accessToken: string,
  workitemId: string,
  comments?: string
): Promise<void> {
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${PROCESS_APPROVALS_API_VERSION}/process/approvals`;
  const body = {
    requests: [
      {
        actionType: 'Approve',
        workitemId,
        ...(comments ? { comments } : {}),
      },
    ],
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Approve API failed: ${response.status} - ${text}`);
  }
}

export async function submitForApprovalAsUser(
  instanceUrl: string,
  accessToken: string,
  contextId: string,
  processDefinitionNameOrId?: string
): Promise<{ instanceId?: string; newWorkitemIds?: string[] }> {
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${PROCESS_APPROVALS_API_VERSION}/process/approvals`;
  const req: Record<string, unknown> = { actionType: 'Submit', contextId };
  if (processDefinitionNameOrId != null && String(processDefinitionNameOrId).trim() !== '') {
    req.processDefinitionNameOrId = processDefinitionNameOrId;
  }
  const body = { requests: [req] };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Submit for approval failed: ${response.status} - ${text}`);
  }
  const result = await response.json();
  const first = result.results?.[0];
  return {
    instanceId: first?.instanceId,
    newWorkitemIds: first?.newWorkitemIds,
  };
}
