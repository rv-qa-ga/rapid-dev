/**
 * Generation context types for feature file generation.
 * Used to route Jira work items to the correct pipeline (Salesforce, Dynamics, SQL Server ODS/TDS)
 * without affecting existing generators.
 *
 * @see docs/planning/SQL-Server-ODS-TDS-Feature-Generation-Plan.md
 */

export type GenerationContextType =
  | 'salesforce'        // SF, ST – existing FeatureGenerator
  | 'dynamics'          // PP – existing FeatureGenerator
  | 'sqlserver_ods_tds' // ENG + ODS/TDS – SQL Server pipeline
  | 'default';         // ENG without ODS/TDS or unknown

export type SqlServerObjectType =
  | 'stored_procedures'
  | 'ssis_jobs'
  | 'tables'
  | 'views'
  | 'functions';

export interface SqlServerOdsTdsContext {
  platform: 'sqlserver';
  scope: 'ODS_TDS';
  ODS_databases: string[];
  TDS_database: string;
  include_objects: SqlServerObjectType[];
  scanning_mode: 'schema_and_object_list';
  feature_template: 'gherkin_sqlserver_template';
  preserve_others: true;
  tags: string[];
  generation_rules: {
    only_generate_for: string[];
    skip_if_conflicts_with: string[];
    name_convention: string;
    include_metadata: string[];
    safety_checks: ('no_overwrite_existing_feature_files_unless_force_flag_set')[];
  };
  output: {
    feature_folder: string;
    feature_file_suffix: string;
    manifest_entry: boolean;
  };
}

export interface ResolvedGenerationContext {
  contextType: GenerationContextType;
  sqlServerContext?: SqlServerOdsTdsContext;
}
