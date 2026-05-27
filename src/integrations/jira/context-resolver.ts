/**
 * Resolves the generation context for a Jira work item so the correct feature generator
 * is used (Salesforce, Dynamics, or SQL Server ODS/TDS) without affecting other pipelines.
 *
 * Rule: When project is ENG, issue key matches ENG-\d+, and description/components
 * reference "ODS" or "TDS", set context to sqlserver_ods_tds.
 *
 * @see docs/planning/SQL-Server-ODS-TDS-Feature-Generation-Plan.md
 */

import type { JiraIssue } from './client';
import type { ResolvedGenerationContext, SqlServerOdsTdsContext } from './generation-context-types';
import { discoverMultipleDatabasesUnderODS, discoverSingleTDSDatabase } from './ods-tds-discovery';

const ENG_KEY_PATTERN = /^ENG-\d+$/;
const ODS_TDS_PATTERN = /\b(ODS|TDS)\b/i;

const DEFAULT_SQL_SERVER_OBJECTS = [
  'stored_procedures',
  'ssis_jobs',
  'tables',
  'views',
  'functions',
] as SqlServerOdsTdsContext['include_objects'];

/** Recursively pull text from Jira ADF / arbitrary JSON description nodes. */
function extractTextFromAdfNode(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return '';
  const o = node as Record<string, unknown>;
  if (typeof o.text === 'string') return o.text;
  const content = o.content;
  if (!Array.isArray(content)) return '';
  return content.map(extractTextFromAdfNode).join('');
}

/**
 * Extract plain text from Jira description (may be ADF/structured).
 */
function getDescriptionText(issue: JiraIssue): string {
  const desc = issue.fields?.description;
  if (typeof desc === 'string') return desc;
  if (desc && typeof desc === 'object' && 'content' in desc) {
    return extractTextFromAdfNode(desc);
  }
  return '';
}

/**
 * Get components as string for ODS/TDS detection (if Jira returns components).
 */
function getComponentsText(issue: JiraIssue): string {
  const comps = issue.fields?.components;
  if (!Array.isArray(comps)) return '';
  return comps
    .map((c: { name?: string }) => c?.name || '')
    .join(' ');
}

/**
 * Returns true if the issue should use the SQL Server ODS/TDS pipeline.
 */
function mentionsOdsOrTds(issue: JiraIssue): boolean {
  const text = `${getDescriptionText(issue)} ${getComponentsText(issue)}`;
  return ODS_TDS_PATTERN.test(text);
}

/**
 * Build SQL Server ODS/TDS context (used when contextType is sqlserver_ods_tds).
 */
function buildSqlServerContext(): SqlServerOdsTdsContext {
  const ODS_databases = discoverMultipleDatabasesUnderODS();
  const TDS_database = discoverSingleTDSDatabase();
  return {
    platform: 'sqlserver',
    scope: 'ODS_TDS',
    ODS_databases,
    TDS_database,
    include_objects: [...DEFAULT_SQL_SERVER_OBJECTS],
    scanning_mode: 'schema_and_object_list',
    feature_template: 'gherkin_sqlserver_template',
    preserve_others: true,
    tags: ['ENG', 'ODS', 'TDS', 'SQLServer'],
    generation_rules: {
      only_generate_for: ['ENG-*'],
      skip_if_conflicts_with: ['salesforce', 'dynamics', 'external-feature-generators'],
      name_convention: '{JIRA_KEY} - {short_summary} - {env}',
      include_metadata: ['jira_key', 'assignee', 'db_list', 'object_summary', 'discovery_timestamp'],
      safety_checks: ['no_overwrite_existing_feature_files_unless_force_flag_set'],
    },
    output: {
      feature_folder: 'src/features/engineering/ods_tds',
      feature_file_suffix: '.sqlserver.feature',
      manifest_entry: true,
    },
  };
}

/**
 * Resolve generation context for a Jira issue.
 * Call this before invoking any feature generator to route to the correct pipeline.
 */
export function resolveGenerationContext(issue: JiraIssue): ResolvedGenerationContext {
  const prefix = issue.key.split('-')[0].toUpperCase();

  // ENG + ODS/TDS → SQL Server pipeline
  if (prefix === 'ENG' && ENG_KEY_PATTERN.test(issue.key) && mentionsOdsOrTds(issue)) {
    return {
      contextType: 'sqlserver_ods_tds',
      sqlServerContext: buildSqlServerContext(),
    };
  }

  // Existing pipelines by prefix (no change)
  if (prefix === 'PP') {
    return { contextType: 'dynamics' };
  }
  if (prefix === 'SF' || prefix === 'ST') {
    return { contextType: 'salesforce' };
  }

  return { contextType: 'default' };
}
