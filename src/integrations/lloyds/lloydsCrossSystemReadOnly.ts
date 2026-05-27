import type { XmlFileRecord } from './xmlFileRecordClient';
import type { CompareReport, MappingPair } from '../../utils/fowd-agency-xml-compare/types';
import {
  compareFowdAgencyPolicyToXml,
  parseLedgerJournalEntitiesFromXmlContent,
} from '../../utils/fowd-agency-xml-compare';

/**
 * Resolve the blob object name under `mulesoft-xml` from the Dataverse XML File row.
 */
export function resolveXmlBlobNameForDownload(rec: Pick<XmlFileRecord, 'name' | 'blobId'>): string {
  const n = (rec.name ?? '').trim();
  if (n.toLowerCase().endsWith('.xml')) return n;
  const b = (rec.blobId ?? '').trim();
  try {
    const u = new URL(b);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last?.toLowerCase().endsWith('.xml')) {
      return decodeURIComponent(last.replace(/\+/g, ' '));
    }
  } catch {
    /* blob_id may not be a full URL */
  }
  throw new Error(
    'Cannot resolve XML blob file name from Dataverse (expected accelins_name ending in .xml or blob URL path ending in .xml).',
  );
}

/** First non-empty DESCRIPTION on FOWD detail rows — matches `parseLedgerJournalEntitiesFromXmlContent` filter. */
export function descriptionFromFowdRows(rows: Record<string, unknown>[]): string {
  for (const row of rows) {
    const v = row.DESCRIPTION ?? row.description;
    const s = v === null || v === undefined ? '' : String(v).trim();
    if (s) return s;
  }
  throw new Error('No DESCRIPTION on FOWD detail rows — cannot align XML journal lines.');
}

export function compareFowdRowsToXmlText(
  snowflakeRows: Record<string, unknown>[],
  xmlText: string,
  mapping: MappingPair[],
  description: string,
): CompareReport {
  const parsed = parseLedgerJournalEntitiesFromXmlContent(xmlText, description, mapping, undefined);
  return compareFowdAgencyPolicyToXml(snowflakeRows, parsed.byLine, mapping, description, {
    xmlElementsRead: parsed.elementsRead,
    xmlElementsMatchingDescription: parsed.matchingDescription,
    xmlDistinctDescriptionsInFile: parsed.distinctDescriptionsInFile,
    xmlDistinctDocumentsInFile: parsed.distinctDocumentsInFile,
    ignoreSnowflakeAccelMetadataColumns: true,
  });
}
