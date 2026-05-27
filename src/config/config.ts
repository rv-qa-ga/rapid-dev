import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Load .env with override while keeping shell/CI vars that must win over .env.{env}
 * (e.g. HEADLESS=false from the terminal is otherwise overwritten by HEADLESS=true in .env.qa).
 */
/** Shell / `cross-env` wins over `.env.{env}` so one-off Zephyr uploads (e.g. `ZEPHYR_PROJECT_KEY=PP`) are not overwritten. */
const DOTENV_PRESERVE_KEYS = [
  'HEADLESS',
  'PWDEBUG',
  'ASSISTED_MODE',
  'ZEPHYR_PROJECT_KEY',
  'ZEPHYR_REJECT_UNAUTHORIZED',
] as const;

export function loadEnvFileWithShellPreserved(envFilePath: string): void {
  const preserved: Partial<Record<(typeof DOTENV_PRESERVE_KEYS)[number], string>> = {};
  for (const k of DOTENV_PRESERVE_KEYS) {
    const v = process.env[k];
    if (v !== undefined && v !== '') preserved[k] = v;
  }
  dotenv.config({ path: envFilePath, override: true });
  for (const k of DOTENV_PRESERVE_KEYS) {
    if (preserved[k] !== undefined) process.env[k] = preserved[k]!;
  }
}

// Determine environment first - prioritize ENV from process.env
let env = process.env.ENV;

// If ENV not set, try to get from command line or default to qa
if (!env) {
  // Check if ENV was passed as argument
  const args = process.argv.slice(2);
  const envIndex = args.indexOf('--env');
  if (envIndex !== -1 && args[envIndex + 1]) {
    env = args[envIndex + 1];
  } else {
    env = 'qa'; // Default
  }
}

// Normalize environment name
env = env.toLowerCase().trim();

// Determine possible environment-specific .env file locations (priority order)
const envConfigPath = path.resolve(__dirname, 'env', `.env.${env}`);
const configEnvPath = path.resolve(__dirname, `.env.${env}`);
const rootEnvPath = path.resolve(process.cwd(), `.env.${env}`);
const baseEnvPath = path.resolve(process.cwd(), '.env');

const envPathMap: Array<{ path: string; label: string }> = [
  { path: envConfigPath, label: `src/config/env/.env.${env}` },
  { path: configEnvPath, label: `src/config/.env.${env}` },
  { path: rootEnvPath, label: `.env.${env}` },
];

// Load the first environment-specific file that exists
let envLoaded = false;
for (const envPath of envPathMap) {
  if (fs.existsSync(envPath.path)) {
    loadEnvFileWithShellPreserved(envPath.path);
    console.log(`✅ Loaded environment-specific config from ${envPath.label}`);
    envLoaded = true;
    break;
  }
}

// If no environment-specific file found, fall back to base .env (if present)
if (!envLoaded) {
  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath });
    console.log('⚠️  Environment-specific file not found. Loaded base .env instead.');
  } else {
    console.log(`⚠️  Environment file .env.${env} not found and no base .env detected. Proceeding with JSON config only.`);
  }
}

export interface SalesforceConfig {
  baseUrl: string;
  apiVersion: string;
  loginUrl?: string; // Optional, will default to baseUrl if not provided
}

export interface DynamicsConfig {
  baseUrl: string;
  webApiBaseUrl?: string; // Full Web API URL (e.g., https://accelinsqatest.crm11.dynamics.com/api/data/v9.2/)
  apiVersion: string;
  tenantId?: string; // Can be overridden by env var
  clientId?: string; // Can be overridden by env var
  clientSecret?: string; // Can be overridden by env var
  scope?: string; // Can be overridden by env var
}

export interface JiraConfig {
  baseUrl: string;
  projectKey: string;
}

export interface ZephyrConfig {
  baseUrl: string;
  projectKey: string;
}

export interface AzureDevOpsConfig {
  baseUrl?: string; // Optional, defaults to https://dev.azure.com/{organization}
  organization: string;
  project: string;
  apiVersion?: string; // Optional, defaults to 7.1
}

export interface GitHubConfig {
  baseUrl?: string; // Optional, defaults to https://api.github.com
  token?: string; // Can be overridden by env var
}

export interface SqlServerConfig {
  host: string;
  port?: number; // Optional, defaults to 1433
  defaultDatabase?: string; // Default database to connect to
  // Azure AD (Microsoft Entra) authentication
  tenantId?: string; // Can be overridden by env var
  clientId?: string; // Can be overridden by env var
  clientSecret?: string; // Can be overridden by env var
  // Legacy SQL Server authentication (deprecated - use Azure AD instead)
  user?: string; // Can be overridden by env var (deprecated)
  password?: string; // Can be overridden by env var (deprecated)
  options?: {
    encrypt?: boolean; // Use encryption (default: true)
    trustServerCertificate?: boolean; // Trust server certificate (default: false)
    enableArithAbort?: boolean; // Enable arithmetic abort (default: true)
  };
}

export interface MuleSoftConfig {
  baseUrl?: string; // Optional, defaults to https://anypoint.mulesoft.com
  apiBaseUrl?: string; // Optional, defaults to {baseUrl}/cloudhub/api/v2
  organizationId?: string; // Can be overridden by env var
  environmentId?: string; // Can be overridden by env var
  clientId?: string; // Can be overridden by env var
  clientSecret?: string; // Can be overridden by env var
}

/** Microsoft Fabric – resolved from env only (optional integration). See docs/setup/FABRIC_CONNECTIVITY_SETUP.md */
export interface FabricConfig {
  workspaceId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  apiBaseUrl?: string;
  /** Warehouse/Lakehouse SQL endpoint hostname (documentation / future SqlServer overrides) */
  sqlEndpointHost?: string;
  sqlDatabase?: string;
}

export interface TimeoutsConfig {
  navigation: number;
  element: number;
  api: number;
}

export interface EnvironmentConfig {
  name: string;
  description: string;
  salesforce: SalesforceConfig;
  dynamics?: DynamicsConfig; // Optional - only included if Dynamics is configured
  sqlserver?: SqlServerConfig; // Optional - only included if SQL Server is configured
  mulesoft?: MuleSoftConfig; // Optional - only included if MuleSoft is configured
  jira: JiraConfig;
  zephyr: ZephyrConfig;
  azureDevOps?: AzureDevOpsConfig; // Optional - only included if Azure DevOps is configured
  github?: GitHubConfig; // Optional - only included if GitHub is configured
  timeouts: TimeoutsConfig;
}

class ConfigManager {
  private config: EnvironmentConfig;
  private env: string;

  constructor() {
    // Use the env that was determined during dotenv loading
    // Ensure env is always a string (default to 'qa' if undefined)
    this.env = env || 'qa';
    this.config = this.loadConfig(this.env);
  }

  private loadConfig(env: string): EnvironmentConfig {
    const configPath = path.join(__dirname, 'env', `${env}.json`);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found for environment: ${env} at ${configPath}`);
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    const config: EnvironmentConfig = JSON.parse(configData);

    // Ensure loginUrl defaults to baseUrl if not provided
    if (!config.salesforce.loginUrl) {
      config.salesforce.loginUrl = config.salesforce.baseUrl;
    }

    // Override with environment variables if present
    if (process.env.SF_BASE_URL) {
      config.salesforce.baseUrl = process.env.SF_BASE_URL;
      // Update loginUrl if baseUrl changes and loginUrl wasn't explicitly set
      if (!process.env.SF_LOGIN_URL) {
        config.salesforce.loginUrl = process.env.SF_BASE_URL;
      }
    }
    if (process.env.SF_LOGIN_URL) {
      config.salesforce.loginUrl = process.env.SF_LOGIN_URL;
    }
    
    // Dynamics environment variable overrides
    if (config.dynamics) {
      if (process.env.D365_BASE_URL) {
        config.dynamics.baseUrl = process.env.D365_BASE_URL;
        // Update webApiBaseUrl if baseUrl changes
        if (!process.env.D365_WEB_API_BASE_URL) {
          config.dynamics.webApiBaseUrl = `${process.env.D365_BASE_URL}/api/data/v9.2/`;
        }
      }
      if (process.env.D365_WEB_API_BASE_URL) {
        config.dynamics.webApiBaseUrl = process.env.D365_WEB_API_BASE_URL;
      }
      if (process.env.D365_TENANT_ID) {
        config.dynamics.tenantId = process.env.D365_TENANT_ID;
      }
      if (process.env.D365_CLIENT_ID) {
        config.dynamics.clientId = process.env.D365_CLIENT_ID;
      }
      if (process.env.D365_CLIENT_SECRET) {
        config.dynamics.clientSecret = process.env.D365_CLIENT_SECRET;
      }
      if (process.env.D365_SCOPE) {
        config.dynamics.scope = process.env.D365_SCOPE;
      }
    }
    
    // SQL Server environment variable overrides
    if (config.sqlserver) {
      // Lloyd's Mule **`dbo.PROCESS_TRACKER`** lives on **Azure SQL** (`AZURE_SQL_DB_DEV_*`). When those are set,
      // they **win over** `SQLSERVER_HOST` / `SQLSERVER_DEFAULT_DB` so QA can keep a legacy UKS host for other tools
      // without breaking PROCESS_TRACKER (see `docs/lloyds/SKILL.md` §4.5).
      if (process.env.AZURE_SQL_DB_DEV_SERVER?.trim()) {
        config.sqlserver.host = process.env.AZURE_SQL_DB_DEV_SERVER.trim();
      } else if (process.env.SQLSERVER_HOST?.trim()) {
        config.sqlserver.host = process.env.SQLSERVER_HOST.trim();
      }
      if (process.env.SQLSERVER_PORT) {
        config.sqlserver.port = parseInt(process.env.SQLSERVER_PORT, 10);
      }
      // Azure AD authentication (preferred)
      if (process.env.SQLSERVER_TENANT_ID) {
        config.sqlserver.tenantId = process.env.SQLSERVER_TENANT_ID;
      }
      if (process.env.SQLSERVER_CLIENT_ID) {
        config.sqlserver.clientId = process.env.SQLSERVER_CLIENT_ID;
      }
      if (process.env.SQLSERVER_CLIENT_SECRET) {
        config.sqlserver.clientSecret = process.env.SQLSERVER_CLIENT_SECRET;
      }
      // Legacy SQL Server authentication (deprecated)
      if (process.env.SQLSERVER_USER) {
        config.sqlserver.user = process.env.SQLSERVER_USER;
      }
      if (process.env.SQLSERVER_PASSWORD) {
        config.sqlserver.password = process.env.SQLSERVER_PASSWORD;
      }
      if (process.env.AZURE_SQL_DB_DEV_DATABASE?.trim()) {
        config.sqlserver.defaultDatabase = process.env.AZURE_SQL_DB_DEV_DATABASE.trim();
      } else if (process.env.SQLSERVER_DEFAULT_DB?.trim()) {
        config.sqlserver.defaultDatabase = process.env.SQLSERVER_DEFAULT_DB.trim();
      }
    }
    
    // MuleSoft environment variable overrides
    if (config.mulesoft) {
      if (process.env.MULESOFT_BASE_URL) {
        config.mulesoft.baseUrl = process.env.MULESOFT_BASE_URL;
      }
      if (process.env.MULESOFT_API_BASE_URL) {
        config.mulesoft.apiBaseUrl = process.env.MULESOFT_API_BASE_URL;
      }
      if (process.env.MULESOFT_ORGANIZATION_ID) {
        config.mulesoft.organizationId = process.env.MULESOFT_ORGANIZATION_ID;
      } else if (process.env.MULESOFT_ORG_ID?.trim()) {
        config.mulesoft.organizationId = process.env.MULESOFT_ORG_ID.trim();
      }
      if (process.env.MULESOFT_ENVIRONMENT_ID) {
        config.mulesoft.environmentId = process.env.MULESOFT_ENVIRONMENT_ID;
      } else if (process.env.MULESOFT_ENV_ID?.trim()) {
        config.mulesoft.environmentId = process.env.MULESOFT_ENV_ID.trim();
      }
      if (process.env.MULESOFT_CLIENT_ID) {
        config.mulesoft.clientId = process.env.MULESOFT_CLIENT_ID;
      }
      if (process.env.MULESOFT_CLIENT_SECRET) {
        config.mulesoft.clientSecret = process.env.MULESOFT_CLIENT_SECRET;
      }
    }
    
    if (process.env.JIRA_BASE_URL) {
      config.jira.baseUrl = process.env.JIRA_BASE_URL;
    }
    if (process.env.ZEPHYR_BASE_URL) {
      config.zephyr.baseUrl = process.env.ZEPHYR_BASE_URL;
    }

    // GitHub environment variable overrides
    if (config.github) {
      if (process.env.GITHUB_BASE_URL) {
        config.github.baseUrl = process.env.GITHUB_BASE_URL;
      }
      if (process.env.GITHUB_TOKEN) {
        config.github.token = process.env.GITHUB_TOKEN;
      }
    }

    return config;
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  getEnvironment(): string {
    return this.env;
  }

  getSalesforceConfig(): SalesforceConfig {
    return this.config.salesforce;
  }

  getDynamicsConfig(): DynamicsConfig {
    if (!this.config.dynamics) {
      throw new Error('Dynamics configuration not found. Please add dynamics config to environment JSON file.');
    }
    return this.config.dynamics;
  }

  getSqlServerConfig(): SqlServerConfig {
    if (!this.config.sqlserver) {
      throw new Error('SQL Server configuration not found. Please add sqlserver config to environment JSON file.');
    }
    return this.config.sqlserver;
  }

  getMuleSoftConfig(): MuleSoftConfig {
    if (!this.config.mulesoft) {
      throw new Error('MuleSoft configuration not found. Please add mulesoft config to environment JSON file.');
    }
    return this.config.mulesoft;
  }

  getJiraConfig(): JiraConfig {
    return this.config.jira;
  }

  getZephyrConfig(): ZephyrConfig {
    return this.config.zephyr;
  }

  getAzureDevOpsConfig(): AzureDevOpsConfig {
    if (!this.config.azureDevOps) {
      // Return default config if not set
      return {
        organization: process.env.AZURE_DEVOPS_ORGANIZATION || '',
        project: process.env.AZURE_DEVOPS_PROJECT || '',
        baseUrl: process.env.AZURE_DEVOPS_BASE_URL,
        apiVersion: process.env.AZURE_DEVOPS_API_VERSION || '7.1',
      };
    }
    return this.config.azureDevOps;
  }

  getGitHubConfig(): GitHubConfig {
    if (!this.config.github) {
      // Return default config if not set
      return {
        baseUrl: process.env.GITHUB_BASE_URL || 'https://api.github.com',
        token: process.env.GITHUB_TOKEN || '',
      };
    }
    return this.config.github;
  }

  /**
   * Fabric REST + optional SQL endpoint hints (all from environment variables).
   * Tenant falls back to Dynamics tenant from JSON/env if FABRIC_TENANT_ID is unset.
   */
  getFabricConfig(): FabricConfig {
    const d365Tenant =
      process.env.D365_TENANT_ID || this.config.dynamics?.tenantId;
    return {
      workspaceId: process.env.FABRIC_WORKSPACE_ID?.trim(),
      tenantId: (process.env.FABRIC_TENANT_ID || d365Tenant || '').trim() || undefined,
      clientId: process.env.FABRIC_CLIENT_ID?.trim(),
      clientSecret: process.env.FABRIC_CLIENT_SECRET?.trim(),
      apiBaseUrl: process.env.FABRIC_API_BASE_URL?.trim(),
      sqlEndpointHost: process.env.FABRIC_SQL_ENDPOINT_HOST?.trim(),
      sqlDatabase: process.env.FABRIC_SQL_DATABASE?.trim(),
    };
  }

  getTimeouts(): TimeoutsConfig {
    return this.config.timeouts;
  }
}

export const config = new ConfigManager();

