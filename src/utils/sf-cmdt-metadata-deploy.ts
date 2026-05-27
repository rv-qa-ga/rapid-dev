/**
 * SF-1222 — Deploy / read Dataverse_Mapping__mdt records via Metadata API (SOAP).
 * Validates AC6 (SOQL read-after-deploy) and AC7 (standard metadata audit fields).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { APIRequestContext } from '@playwright/test';
import { logger } from './logger';

export const SF1222_DV_MAPPING_463 = 'DVMapping_463';
export const SF1222_DV463_BASELINE_VALUE = 'CCY-000170';
export const SF1222_DV463_TEST_VALUE = 'CCY-TEST-000170';

export type Sf1222Dv463Baseline = {
  object__c: string;
  field__c: string;
  value__c: string;
  dataverseField__c: string;
  dataverseValue__c: string;
};

export const SF1222_DV463_BASELINE: Sf1222Dv463Baseline = {
  object__c: 'account',
  field__c: 'functional_currency__c',
  value__c: 'PLN',
  dataverseField__c: 'accelins_party.accelins_functional_currency',
  dataverseValue__c: SF1222_DV463_BASELINE_VALUE,
};

export type CmdtMetadataAudit = {
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  createdBy?: string;
  createdDate?: string;
};

function apiVersionTag(): string {
  const raw = process.env.SF_API_VERSION?.trim() || '60.0';
  return raw.startsWith('v') ? raw : `v${raw}`;
}

function soapSessionHeader(sessionId: string): string {
  return `<met:SessionHeader><met:sessionId>${escapeXml(sessionId)}</met:sessionId></met:SessionHeader>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDv463CmdtXml(dataverseValue: string): string {
  const b = SF1222_DV463_BASELINE;
  return `<?xml version="1.0" encoding="UTF-8"?>
<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <label>Zloty</label>
  <protected>false</protected>
  <values>
    <field>Object__c</field>
    <value xsi:type="xsd:string">${escapeXml(b.object__c)}</value>
  </values>
  <values>
    <field>Field__c</field>
    <value xsi:type="xsd:string">${escapeXml(b.field__c)}</value>
  </values>
  <values>
    <field>Value__c</field>
    <value xsi:type="xsd:string">${escapeXml(b.value__c)}</value>
  </values>
  <values>
    <field>Dataverse_Field__c</field>
    <value xsi:type="xsd:string">${escapeXml(b.dataverseField__c)}</value>
  </values>
  <values>
    <field>Dataverse_Value__c</field>
    <value xsi:type="xsd:string">${escapeXml(dataverseValue)}</value>
  </values>
</CustomMetadata>`;
}

function zipDeployPackage(root: string): string {
  const zipPath = path.join(os.tmpdir(), `sf1222-cmdt-${Date.now()}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (!fs.existsSync(path.join(root, 'package.xml'))) {
    throw new Error(`SF1222: package.xml missing under ${root}`);
  }
  const ps1 = path.join(os.tmpdir(), `sf1222-zip-${Date.now()}.ps1`);
  const metaFile = path.join(root, 'customMetadata', `Dataverse_Mapping.${SF1222_DV_MAPPING_463}.md-meta.xml`);
  fs.writeFileSync(
    ps1,
    [
      'Add-Type -AssemblyName System.IO.Compression',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem',
      `$zip = '${zipPath.replace(/'/g, "''")}'`,
      `$root = '${root.replace(/'/g, "''")}'`,
      '$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)',
      '[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root "package.xml"), "package.xml") | Out-Null',
      `[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, "${metaFile.replace(/\\/g, '\\\\')}", "customMetadata/Dataverse_Mapping.${SF1222_DV_MAPPING_463}.md-meta.xml") | Out-Null`,
      '$archive.Dispose()',
      '[System.IO.Compression.ZipFile]::OpenRead($zip).Entries | ForEach-Object { $_.FullName }',
    ].join('\n'),
    'utf8'
  );
  const listing = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, {
    encoding: 'utf8',
  });
  const stat = fs.statSync(zipPath);
  if (stat.size < 100) {
    throw new Error(`SF1222: Zip too small (${stat.size} bytes). Entries: ${listing}`);
  }
  if (listing.includes('\\')) {
    throw new Error(`SF1222: Zip must use forward slashes; got: ${listing}`);
  }
  logger.info(`SF1222: Deploy zip (${stat.size} bytes): ${listing.trim().replace(/\r?\n/g, ', ')}`);
  try {
    fs.unlinkSync(ps1);
  } catch {
    /* ignore */
  }
  return zipPath;
}

async function metadataSoap(
  request: APIRequestContext,
  instanceUrl: string,
  sessionId: string,
  soapAction: string,
  bodyInner: string
): Promise<string> {
  const ver = apiVersionTag();
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>${soapSessionHeader(sessionId)}</soapenv:Header>
  <soapenv:Body>${bodyInner}</soapenv:Body>
</soapenv:Envelope>`;

  const url = `${instanceUrl.replace(/\/$/, '')}/services/Soap/m/${ver.replace(/^v/, '')}`;
  const res = await request.post(url, {
    headers: {
      Authorization: `Bearer ${sessionId}`,
      'Content-Type': 'text/xml; charset=UTF-8',
      SOAPAction: soapAction,
    },
    data: envelope,
  });
  const text = await res.text();
  if (!res.ok()) {
    throw new Error(`Metadata SOAP ${soapAction} failed (${res.status()}): ${text.slice(0, 800)}`);
  }
  if (text.includes('<success>false</success>') && !text.includes('<success>true</success>')) {
    const fault = text.match(/<faultstring>([^<]*)<\/faultstring>/i)?.[1];
    throw new Error(`Metadata SOAP ${soapAction} fault: ${fault ?? text.slice(0, 500)}`);
  }
  return text;
}

function parseDeployId(soapResponse: string): string {
  const m =
    soapResponse.match(/<id>([^<]+)<\/id>/i) ||
    soapResponse.match(/<met:id>([^<]+)<\/met:id>/i);
  if (!m?.[1]) {
    throw new Error(`Metadata deploy: no async id in response: ${soapResponse.slice(0, 400)}`);
  }
  return m[1];
}

function parseDeployDone(soapResponse: string): { done: boolean; success: boolean; message: string } {
  const done = /<done>(true|false)<\/done>/i.exec(soapResponse)?.[1] === 'true';
  const success = /<success>(true|false)<\/success>/i.exec(soapResponse)?.[1] === 'true';
  const message =
    soapResponse.match(/<problem>([^<]*)<\/problem>/i)?.[1] ||
    soapResponse.match(/<faultstring>([^<]*)<\/faultstring>/i)?.[1] ||
    '';
  return { done, success, message };
}

function parseFileProperties(soapResponse: string): CmdtMetadataAudit {
  const pick = (tag: string) => {
    const m = soapResponse.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
    return m?.[1]?.trim();
  };
  return {
    createdBy: pick('createdBy'),
    createdDate: pick('createdDate'),
    lastModifiedBy: pick('lastModifiedBy'),
    lastModifiedDate: pick('lastModifiedDate'),
  };
}

export async function deployDvMapping463DataverseValue(
  request: APIRequestContext,
  instanceUrl: string,
  sessionId: string,
  dataverseValue: string
): Promise<void> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sf1222-cmdt-'));
  const pkgRoot = path.join(tmp, 'deploy');
  const metaDir = path.join(pkgRoot, 'customMetadata');
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgRoot, 'package.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types><members>Dataverse_Mapping.${SF1222_DV_MAPPING_463}</members><name>CustomMetadata</name></types>
  <version>${apiVersionTag().replace(/^v/, '')}</version>
</Package>`
  );
  fs.writeFileSync(
    path.join(metaDir, `Dataverse_Mapping.${SF1222_DV_MAPPING_463}.md-meta.xml`),
    buildDv463CmdtXml(dataverseValue)
  );
  const zipPath = zipDeployPackage(pkgRoot);
  const zipB64 = fs.readFileSync(zipPath).toString('base64');

  const deployResp = await metadataSoap(
    request,
    instanceUrl,
    sessionId,
    'deploy',
    `<met:deploy>
      <met:ZipFile>${zipB64}</met:ZipFile>
      <met:DeployOptions>
        <met:rollbackOnError>true</met:rollbackOnError>
        <met:singlePackage>true</met:singlePackage>
        <met:testLevel>NoTestRun</met:testLevel>
      </met:DeployOptions>
    </met:deploy>`
  );
  const deployId = parseDeployId(deployResp);
  logger.info(`SF1222: Metadata deploy started id=${deployId} (Dataverse_Value__c=${dataverseValue})`);

  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResp = await metadataSoap(
      request,
      instanceUrl,
      sessionId,
      'checkDeployStatus',
      `<met:checkDeployStatus><met:asyncProcessId>${escapeXml(deployId)}</met:asyncProcessId><met:includeDetails>true</met:includeDetails></met:checkDeployStatus>`
    );
    const st = parseDeployDone(statusResp);
    if (st.done) {
      if (!st.success) {
        throw new Error(`SF1222: Metadata deploy failed: ${st.message || statusResp.slice(0, 600)}`);
      }
      logger.info(`SF1222: Metadata deploy succeeded for ${SF1222_DV_MAPPING_463}`);
      break;
    }
    if (i === 44) {
      throw new Error('SF1222: Metadata deploy timed out waiting for completion');
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  try {
    fs.unlinkSync(zipPath);
  } catch {
    /* ignore */
  }
}

export async function readDvMapping463MetadataAudit(
  request: APIRequestContext,
  instanceUrl: string,
  sessionId: string
): Promise<CmdtMetadataAudit> {
  const resp = await metadataSoap(
    request,
    instanceUrl,
    sessionId,
    'readMetadata',
    `<met:readMetadata>
      <met:type>CustomMetadata</met:type>
      <met:fullNames>Dataverse_Mapping.${SF1222_DV_MAPPING_463}</met:fullNames>
    </met:readMetadata>`
  );
  const audit = parseFileProperties(resp);
  const dvValue =
    resp.match(/<field>Dataverse_Value__c<\/field>\s*<value[^>]*>([^<]*)<\/value>/i)?.[1]?.trim() ??
    '';
  return { ...audit, dataverseValueFromMetadata: dvValue } as CmdtMetadataAudit & {
    dataverseValueFromMetadata?: string;
  };
}

/** AC7 proxy: SetupAuditTrail entry after deploy (standard platform audit; not runtime SOQL). */
export async function assertSetupAuditTrailAfterCmdtDeploy(
  queryFn: (soql: string) => Promise<{ records?: Record<string, unknown>[] }>,
  deployStartedAtIso: string
): Promise<void> {
  const soql = `SELECT Id, Action, Section, CreatedDate, CreatedById FROM SetupAuditTrail WHERE CreatedDate >= ${deployStartedAtIso} ORDER BY CreatedDate DESC LIMIT 50`;
  const result = await queryFn(soql);
  const rows = result.records ?? [];
  const hit = rows.find((r) => {
    const section = String(r.Section ?? '').toLowerCase();
    const action = String(r.Action ?? '').toLowerCase();
    return (
      section.includes('custom metadata') ||
      section.includes('dataverse') ||
      action.includes('custommetadata') ||
      action.includes('cmr') ||
      action.includes('changedcustommetadata')
    );
  });
  if (!hit) {
    const sample = rows.slice(0, 5).map((r) => ({
      Action: r.Action,
      Section: r.Section,
      CreatedDate: r.CreatedDate,
    }));
    throw new Error(
      `SF1222: No SetupAuditTrail row found after CMDT deploy (since ${deployStartedAtIso}). ` +
        `Recent rows: ${JSON.stringify(sample)}. ` +
        `Manual AC7: Setup → Custom Metadata → ${SF1222_DV_MAPPING_463} shows Last Modified By/Date.`
    );
  }
  logger.info(
    `SF1222: SetupAuditTrail CMDT change: Action=${String(hit.Action)} Section=${String(hit.Section)} CreatedDate=${String(hit.CreatedDate)}`
  );
}
