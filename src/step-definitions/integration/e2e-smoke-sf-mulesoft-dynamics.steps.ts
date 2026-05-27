/**
 * Cross-system E2E smoke: Salesforce EventLogFile + orchestration glue.
 * MuleSoft steps live in api/mulesoft/mulesoft.steps.ts; Dynamics in api/dynamics/dynamics.steps.ts.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { MuleSoftAPIClient } from '../../api-clients/mulesoft/MuleSoftAPIClient';
import {
  SalesforceStreamingClient,
  getPlatformEventRecordId,
  salesforceIdsMatch,
  PlatformEvent,
} from '../../utils/salesforce-streaming-client';
import { logger } from '../../utils/logger';

/** CometD channel; override if the org uses a different Account platform event API name. */
function e2eAccountPlatformEventChannel(): string {
  const c = process.env.E2E_ACCOUNT_PLATFORM_EVENT_CHANNEL?.trim();
  return c && c.length > 0 ? c : '/event/Account__e';
}

const UUID_INLINE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi;

/** Pull correlation-style UUIDs from common Mule / logger fields and message text. */
function extractCorrelationIdsFromLogRow(row: Record<string, unknown>): string[] {
  const found = new Set<string>();
  const keyNames = [
    'correlationId',
    'correlation_id',
    'CorrelationId',
    'muleCorrelationId',
    'MULE_CORRELATION_ID',
    'eventId',
    'EventUuid',
  ];
  for (const k of keyNames) {
    const v = row[k];
    if (typeof v === 'string') {
      const exact = v.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i
      );
      if (exact?.[0]) found.add(exact[0]);
    }
  }
  const blob = [row.message, row.msg, row.logger, row.thread]
    .filter((x) => typeof x === 'string')
    .join('\n');
  const labeled = blob.match(
    /(?:correlation|trace|event)\s*[_\s-]*(?:id|uuid)?\s*[:=]\s*['"]?([0-9a-fA-F-]{36})/gi
  );
  if (labeled) {
    for (const m of labeled) {
      const inner = m.match(UUID_INLINE);
      if (inner?.[0]) found.add(inner[0]);
    }
  }
  const allInBlob = blob.match(UUID_INLINE);
  if (allInBlob) {
    for (const u of allInBlob) {
      if (u) found.add(u);
    }
  }
  return [...found].slice(0, 12);
}

interface E2eCrossSystemTrace {
  salesforce: {
    accountId?: string;
    accountName?: string;
    platformEvents: Array<{
      identifier?: string;
      eventUuid: string;
      replayId: string;
      eventApiName: string;
    }>;
    /** Use in MuleSoft log search — `Account__e` create for this Account when available */
    primaryEventUuid?: string;
  };
  muleSoft: {
    apps: Array<{
      label: string;
      applicationName: string;
      logLineCount: number;
      linesMatchingEventUuidSearch: number;
      correlationIdsSample: string[];
      note?: string;
    }>;
    warnings: string[];
  };
  dynamics?: {
    userId?: string;
    organizationId?: string;
    requestId?: string;
    correlationRequestId?: string;
  };
}

Given('I subscribe to Account Platform Events using the active Salesforce API session', async function (this: AutomationWorld) {
  const apiClient = (this.testContext.apiClient ?? this.testContext.salesforceClient) as SalesforceAPIClient | undefined;
  if (!apiClient) {
    throw new Error('Salesforce API client not initialized. Run a Salesforce token step first.');
  }
  const accessToken = apiClient.getAccessToken();
  if (!accessToken) {
    throw new Error('No Salesforce access token on API client. Authenticate before subscribing.');
  }
  const instanceUrl = apiClient.getInstanceUrl();
  const channel = e2eAccountPlatformEventChannel();

  const streamingClient = new SalesforceStreamingClient(apiClient, accessToken, instanceUrl);
  await streamingClient.connect();
  await streamingClient.subscribe(channel);
  streamingClient.clearEvents();

  this.testContext.streamingClient = streamingClient;
  this.testContext.platformEventType = 'Account';
  logger.info(`✅ Subscribed to ${channel} (active Salesforce API session, CometD)`);
});

When('I log a summary of platform events from the Salesforce streaming subscription', async function (this: AutomationWorld) {
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient | undefined;
  if (!streamingClient) {
    logger.warn('No streaming client in context; skipping platform event log summary.');
    return;
  }
  const events = streamingClient.getEvents();
  const accountId = this.testContext.accountId as string | undefined;
  const accountName = this.testContext.accountName as string | undefined;

  const trace: E2eCrossSystemTrace = (this.testContext.e2eCrossSystemTrace = this.testContext.e2eCrossSystemTrace || {
    salesforce: { platformEvents: [] },
    muleSoft: { apps: [], warnings: [] },
  });

  trace.salesforce.accountId = accountId;
  trace.salesforce.accountName = accountName;
  trace.salesforce.platformEvents = events.map((e: PlatformEvent) => ({
    identifier: e.payload?.Identifier__c,
    eventUuid: e.event?.EventUuid || '',
    replayId: String(e.event?.replayId ?? ''),
    eventApiName: e.event?.EventApiName || '',
  }));

  const createForAccount = events.find(
    (e) =>
      accountId &&
      salesforceIdsMatch(getPlatformEventRecordId(e.payload), accountId) &&
      String(e.payload?.Identifier__c || '').toLowerCase() === 'create'
  );
  trace.salesforce.primaryEventUuid = createForAccount?.event?.EventUuid || events[0]?.event?.EventUuid;

  logger.info(`━━ Salesforce streaming subscription: ${events.length} platform event(s) received ━━`);
  logger.info(
    `━━ Trace (Salesforce): Account Id=${accountId ?? 'n/a'}, Name=${accountName ?? 'n/a'} ━━`
  );
  logger.info(
    `   Primary EventUuid for downstream log correlation (prefer \`create\` for this Account): ${trace.salesforce.primaryEventUuid ?? 'n/a'}`
  );

  const max = 25;
  for (let i = 0; i < Math.min(max, events.length); i++) {
    const e = events[i];
    const rid = getPlatformEventRecordId(e.payload);
    const idf = e.payload?.Identifier__c;
    const uuid = e.event?.EventUuid;
    const rep = e.event?.replayId;
    logger.info(
      `   [${i + 1}] EventUuid=${uuid} | ReplayId=${rep} | RecordId=${rid} | Identifier__c=${idf} | ApiName=${e.event?.EventApiName}`
    );
    const line = JSON.stringify(e);
    if (line.length > 1600) {
      logger.info(`        payload: ${line.slice(0, 1600)}…`);
    } else {
      logger.info(`        raw: ${line}`);
    }
  }
  if (events.length > max) {
    logger.info(`   … ${events.length - max} more event(s) not printed`);
  }
});

/**
 * Uses a dedicated MuleSoftAPIClient so testContext.apiClient stays the Salesforce client
 * until Dynamics auth runs.
 */
When(
  'I fetch and log MuleSoft log summaries for applications {string} and {string}',
  async function (this: AutomationWorld, applicationNameA: string, applicationNameB: string) {
    const mule = new MuleSoftAPIClient(this.apiContext);
    await mule.authenticate();

    const trace: E2eCrossSystemTrace = (this.testContext.e2eCrossSystemTrace = this.testContext.e2eCrossSystemTrace || {
      salesforce: { platformEvents: [] },
      muleSoft: { apps: [], warnings: [] },
    });
    trace.muleSoft.apps = [];
    trace.muleSoft.warnings = trace.muleSoft.warnings || [];

    const searchRaw = this.testContext.accountName;
    const searchText =
      typeof searchRaw === 'string' && searchRaw.trim().length > 0 ? searchRaw.trim() : undefined;
    const eventUuid = trace.salesforce?.primaryEventUuid?.trim();

    const logOne = async (label: string, appName: string) => {
      logger.info(`━━ MuleSoft logs (${label}): ${appName} ━━`);
      try {
        let logs = await mule.getApplicationLogs(appName, {
          limit: 80,
          ...(searchText ? { searchText: searchText } : {}),
        });
        let rows = logs.data || [];
        if (searchText && rows.length === 0) {
          logger.info(
            `No lines matched account name search "${searchText}"; showing recent unfiltered sample.`
          );
          logs = await mule.getApplicationLogs(appName, { limit: 40 });
          rows = logs.data || [];
        }

        let linesMatchingEventUuid = 0;
        if (eventUuid) {
          try {
            const byUuid = await mule.searchLogs(appName, eventUuid, { limit: 40 });
            linesMatchingEventUuid = byUuid.length;
            if (byUuid.length > 0) {
              logger.info(
                `   ${byUuid.length} MuleSoft log line(s) contain primary EventUuid "${eventUuid}" (search in ${appName})`
              );
              for (let i = 0; i < Math.min(8, byUuid.length); i++) {
                const r = byUuid[i] as Record<string, unknown>;
                const corrs = extractCorrelationIdsFromLogRow(r);
                logger.info(
                  `     [uuid-hit ${i + 1}] ${String(r.message ?? r.msg ?? '').slice(0, 520)}${corrs.length ? ` | correlationSample=${corrs.slice(0, 3).join('; ')}` : ''}`
                );
              }
            } else {
              logger.info(
                `   No MuleSoft log lines matched primary EventUuid "${eventUuid}" in ${appName} (integrations may use a different key or batch window).`
              );
            }
          } catch (uuidSearchErr: any) {
            logger.debug(`EventUuid log search skipped: ${uuidSearchErr.message}`);
          }
        }

        logger.info(
          `Returned ${rows.length} row(s) in this page (total field: ${logs.total ?? 'n/a'})`
        );
        const allCorr = new Set<string>();
        const printCap = 30;
        for (let i = 0; i < Math.min(printCap, rows.length); i++) {
          const r = rows[i] as Record<string, unknown>;
          const level = String(r.level ?? r.logLevel ?? '?');
          const ts = String(r.timestamp ?? r.time ?? '');
          const msg = String(r.message ?? r.msg ?? '').slice(0, 600);
          const corrs = extractCorrelationIdsFromLogRow(r);
          corrs.forEach((c) => allCorr.add(c));
          const corrHint = corrs.length ? ` | correlationExtract=${corrs.slice(0, 2).join('; ')}` : '';
          logger.info(`  [${level}] ${ts} ${msg}${corrHint}`);
        }
        if (rows.length > printCap) {
          logger.info(`  … ${rows.length - printCap} more row(s) omitted`);
        }

        trace.muleSoft.apps.push({
          label,
          applicationName: appName,
          logLineCount: rows.length,
          linesMatchingEventUuidSearch: linesMatchingEventUuid,
          correlationIdsSample: [...allCorr].slice(0, 8),
        });
      } catch (e: any) {
        const msg = `MuleSoft log fetch for "${appName}" failed: ${e.message}`;
        logger.warn(msg);
        trace.muleSoft.warnings.push(msg);
        trace.muleSoft.apps.push({
          label,
          applicationName: appName,
          logLineCount: 0,
          linesMatchingEventUuidSearch: 0,
          correlationIdsSample: [],
          note: e.message,
        });
        try {
          const apps = await mule.listApplications();
          const needle = appName.trim().toLowerCase();
          const hit = apps.find(
            (a: { name?: string; domain?: string }) =>
              String(a?.name || '')
                .toLowerCase()
                .includes(needle) ||
              String(a?.domain || '')
                .toLowerCase()
                .includes(needle)
          );
          if (hit) {
            logger.info(
              `MuleSoft deployment list snapshot for "${appName}" (Anypoint still returned 409 on detail/specs — often missing Runtime Manager / target visibility for this OAuth client): ${JSON.stringify(hit).slice(0, 1500)}`
            );
          } else {
            logger.info(
              `MuleSoft listApplications: no entry matched "${appName}" among ${apps.length} deployment(s).`
            );
          }
        } catch (listErr: any) {
          logger.debug(`Could not list deployments after log failure: ${listErr.message}`);
        }
      }
    };

    await logOne('PAPI', applicationNameA.trim());
    await logOne('SAPI', applicationNameB.trim());
  }
);

When('I log the cross-system trace summary for documentation', async function (this: AutomationWorld) {
  const trace = this.testContext.e2eCrossSystemTrace as E2eCrossSystemTrace | undefined;
  const diag = this.testContext.dynamicsWhoAmIDiagnostics as
    | { body?: { UserId?: string; OrganizationId?: string }; requestId?: string; correlationRequestId?: string }
    | undefined;

  if (trace && diag?.body) {
    trace.dynamics = {
      userId: diag.body.UserId,
      organizationId: diag.body.OrganizationId,
      requestId: diag.requestId,
      correlationRequestId: diag.correlationRequestId,
    };
  }

  const lines: string[] = [
    '## Cross-system trace (Salesforce → MuleSoft → Dynamics)',
    '',
    '### 1) Salesforce `Account__e` (source of EventUuid)',
    `- **Account Id**: ${trace?.salesforce?.accountId ?? 'n/a'}`,
    `- **Account Name**: ${trace?.salesforce?.accountName ?? 'n/a'}`,
    `- **Primary EventUuid** (use in Mule log / support searches): ${trace?.salesforce?.primaryEventUuid ?? 'n/a'}`,
  ];
  if (trace?.salesforce?.platformEvents?.length) {
    lines.push('- **All EventUuid / ReplayId / Identifier** (this run):');
    for (const pe of trace.salesforce.platformEvents) {
      lines.push(
        `  - EventUuid=\`${pe.eventUuid}\` | ReplayId=${pe.replayId} | Identifier=${pe.identifier ?? 'n/a'} | Api=${pe.eventApiName}`
      );
    }
  }
  lines.push('');
  lines.push('### 2) MuleSoft (PAPI + SAPI)');
  if (trace?.salesforce?.primaryEventUuid) {
    lines.push(
      `- _When log APIs succeed, search these apps for the **Primary EventUuid** (and any \`correlationId\` / Mule correlation fields in log lines)._`
    );
  }
  if (!trace?.muleSoft?.apps?.length) {
    lines.push('- _(No MuleSoft trace captured — run log fetch step first.)_');
  } else {
    for (const a of trace.muleSoft.apps) {
      lines.push(`- **${a.label}** \`${a.applicationName}\``);
      lines.push(`  - log lines (page): ${a.logLineCount}`);
      lines.push(`  - lines matching EventUuid search: ${a.linesMatchingEventUuidSearch}`);
      lines.push(
        `  - correlation / UUID samples extracted from log text: ${a.correlationIdsSample.length ? a.correlationIdsSample.map((x) => `\`${x}\``).join(', ') : '_(none in sampled rows)_'}`
      );
      if (a.note) lines.push(`  - _Note: ${a.note}_`);
    }
  }
  if (trace?.muleSoft?.warnings?.length) {
    lines.push('- **Warnings**');
    for (const w of trace.muleSoft.warnings) {
      lines.push(`  - ${w}`);
    }
  }
  lines.push('');
  lines.push('### 3) Dynamics (Dataverse WhoAmI — request correlation)');
  lines.push(`- **UserId**: \`${diag?.body?.UserId ?? trace?.dynamics?.userId ?? 'n/a'}\``);
  lines.push(`- **OrganizationId**: \`${diag?.body?.OrganizationId ?? trace?.dynamics?.organizationId ?? 'n/a'}\``);
  lines.push(`- **x-ms-request-id** (single request): \`${diag?.requestId ?? trace?.dynamics?.requestId ?? 'n/a'}\``);
  lines.push(
    `- **x-ms-correlation-request-id** (may span internal hops): \`${diag?.correlationRequestId ?? trace?.dynamics?.correlationRequestId ?? 'n/a'}\``
  );
  lines.push('');
  lines.push(
    '_Flow: Salesforce publishes `Account__e` with **EventUuid** → integrations (Mule) should log that id or a derived **correlationId** → Dataverse returns **x-ms-*** headers on WhoAmI for the app token call._'
  );

  const markdown = lines.join('\n');
  logger.info(`━━ Cross-system trace summary (also attached to Cucumber report) ━━\n${markdown}`);

  try {
    await this.attach(markdown, 'text/markdown');
  } catch {
    try {
      await this.attach(markdown, 'text/plain');
    } catch {
      logger.debug('Cucumber attach not available for trace summary');
    }
  }

  try {
    await this.attach(JSON.stringify(trace ?? { note: 'empty trace' }, null, 2), 'application/json');
  } catch {
    /* optional */
  }
});

When('I query Salesforce EventLogFile metadata from the last day', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!apiClient) {
    throw new Error('Salesforce API client not initialized. Run a Salesforce "Given I have a valid ... token" step first.');
  }

  const soql =
    'SELECT Id, EventType, LogDate FROM EventLogFile WHERE LogDate = LAST_N_DAYS:1 ORDER BY LogDate DESC LIMIT 25';

  try {
    const result = await apiClient.query(soql);
    const records = (result.records as unknown[]) || [];
    this.testContext.salesforceEventLogFileQuery = {
      totalSize: typeof result.totalSize === 'number' ? result.totalSize : records.length,
      records,
    };
    logger.info(
      `EventLogFile query: ${records.length} row(s) in page, totalSize=${this.testContext.salesforceEventLogFileQuery.totalSize}`
    );
  } catch (e: any) {
    throw new Error(
      `EventLogFile SOQL failed (org needs Event Monitoring / "View Event Log Files" for the JWT user): ${e.message}`
    );
  }
});

Then('the Salesforce EventLogFile query should return at least {int} rows', async function (
  this: AutomationWorld,
  min: number
) {
  const q = this.testContext.salesforceEventLogFileQuery as { records?: unknown[] } | undefined;
  if (!q?.records) {
    throw new Error('No EventLogFile query in context. Run "When I query Salesforce EventLogFile metadata from the last day" first.');
  }
  if (q.records.length < min) {
    throw new Error(`Expected at least ${min} EventLogFile row(s), got ${q.records.length}`);
  }
  logger.info(`✅ EventLogFile query returned at least ${min} row(s)`);
});
