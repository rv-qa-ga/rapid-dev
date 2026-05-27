import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export interface AzureDevOpsWorkItem {
  id: number;
  rev: number;
  fields: {
    'System.Id': number;
    'System.WorkItemType': string;
    'System.Title': string;
    'System.State': string;
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string;
    };
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.Description'?: string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    [key: string]: any;
  };
  url: string;
}

export interface AzureDevOpsWorkItemQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  columns: Array<{
    referenceName: string;
    name: string;
    url: string;
  }>;
  sortColumns: Array<{
    field: {
      referenceName: string;
      name: string;
      url: string;
    };
    descending: boolean;
  }>;
  workItems: Array<{
    id: number;
    url: string;
  }>;
}

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  visibility: string;
}

export class AzureDevOpsClient {
  private client: AxiosInstance;
  private baseURL: string;
  private organization: string;
  private project: string;
  private apiVersion: string;

  constructor() {
    const azureDevOpsConfig = config.getAzureDevOpsConfig();
    this.organization = process.env.AZURE_DEVOPS_ORGANIZATION || azureDevOpsConfig.organization;
    this.project = process.env.AZURE_DEVOPS_PROJECT || azureDevOpsConfig.project;
    this.baseURL = process.env.AZURE_DEVOPS_BASE_URL || azureDevOpsConfig.baseUrl || `https://dev.azure.com/${this.organization}`;
    this.apiVersion = process.env.AZURE_DEVOPS_API_VERSION || azureDevOpsConfig.apiVersion || '7.1';

    if (!this.organization) {
      throw new Error('AZURE_DEVOPS_ORGANIZATION must be set in environment or config');
    }

    if (!this.project) {
      throw new Error('AZURE_DEVOPS_PROJECT must be set in environment or config');
    }

    const personalAccessToken = process.env.AZURE_DEVOPS_PAT;

    if (!personalAccessToken) {
      const envName = config.getEnvironment();
      throw new Error(
        `AZURE_DEVOPS_PAT must be set in src/config/env/.env.${envName} (or exported as an environment variable).`
      );
    }

    // Normalize base URL
    const normalizedBaseUrl = this.baseURL.replace(/\/+$/, '');

    // Check both AZURE_DEVOPS_REJECT_UNAUTHORIZED and NODE_TLS_REJECT_UNAUTHORIZED
    const disableSSLVerification = 
      process.env.AZURE_DEVOPS_REJECT_UNAUTHORIZED === 'false' ||
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !disableSSLVerification,
    });

    // Azure DevOps uses Basic Auth with PAT as password
    const auth = Buffer.from(`:${personalAccessToken}`).toString('base64');

    this.client = axios.create({
      baseURL: `${normalizedBaseUrl}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      httpsAgent,
    });
  }

  /**
   * URL encode organization and project names to handle spaces and special characters
   * Note: We don't pre-encode here - axios will handle URL encoding automatically
   * when we pass the path segments. However, for spaces in project names, Azure DevOps
   * expects them to be encoded, so we'll let axios handle it naturally.
   */
  private encodeUrlSegment(segment: string): string {
    // Don't pre-encode - axios will handle it when building the URL
    // Just return the segment as-is
    return segment;
  }

  /**
   * Get work item by ID
   */
  async getWorkItem(workItemId: number, expandRelations: boolean = false): Promise<AzureDevOpsWorkItem> {
    logger.info(`Fetching Azure DevOps work item: ${workItemId}`);

    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      const params: any = {
        'api-version': this.apiVersion,
      };
      
      if (expandRelations) {
        params.$expand = 'relations';
      }
      
      const { data } = await this.client.get<AzureDevOpsWorkItem>(
        `/${org}/${project}/_apis/wit/workitems/${workItemId}`,
        { params }
      );

      logger.info(`Successfully fetched work item: ${workItemId}`);
      return data;
    } catch (error: any) {
      if (error.response) {
        logger.error(`Azure DevOps API Error: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 404) {
          logger.error(`Work item ${workItemId} not found`);
        } else if (error.response.status === 401) {
          logger.error(`Authentication failed. Check AZURE_DEVOPS_PAT`);
        } else if (error.response.status === 403) {
          logger.error(`Access denied. Your PAT may not have permission to this project`);
        }
      }
      throw error;
    }
  }

  /**
   * Get pull request links from a work item
   */
  async getPullRequestLinks(workItemId: number): Promise<string[]> {
    logger.info(`Fetching PR links for work item: ${workItemId}`);
    
    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      // Get work item with relations expanded
      const { data: workItem } = await this.client.get<AzureDevOpsWorkItem>(
        `/${org}/${project}/_apis/wit/workitems/${workItemId}`,
        {
          params: {
            'api-version': this.apiVersion,
            $expand: 'relations',
          },
        }
      );
      
      const prLinks: string[] = [];
      const prIds: number[] = [];
      
      // Check relations for PR links
      if ((workItem as any).relations) {
        logger.debug(`Work item ${workItemId} has ${(workItem as any).relations.length} relations`);
        (workItem as any).relations.forEach((relation: any) => {
          logger.debug(`Relation: ${relation.rel}, URL: ${relation.url}, Attributes: ${JSON.stringify(relation.attributes)}`);
          
          // ArtifactLink relations for PRs
          if (relation.rel === 'ArtifactLink' && relation.url) {
            // Extract PR ID from artifact link URL
            // Format: vstfs:///Git/PullRequestId/{projectId}/{repositoryId}/{pullRequestId}
            // Note: URLs may be URL-encoded (%2F instead of /)
            
            // Try URL-decoded pattern first
            let decodedUrl = relation.url;
            try {
              decodedUrl = decodeURIComponent(relation.url);
            } catch (e) {
              // If decoding fails, use original URL
            }
            
            // Pattern 1: Standard format (decoded)
            // Pattern 2: URL-encoded format (%2F instead of /)
            // Pattern 3: Mixed encoding
            const prIdMatch = decodedUrl.match(/\/PullRequestId\/[^/%]+\/[^/%]+\/(\d+)/i) ||
                            relation.url.match(/PullRequestId[^/%]*[/%]2[Ff][^/%]*[/%]2[Ff](\d+)/i) ||
                            relation.url.match(/PullRequestId[^/%]*%2[Ff][^/%]*%2[Ff](\d+)/i) ||
                            relation.url.match(/PullRequestId[^/%]*\/[^/%]*\/(\d+)/i);
            
            if (prIdMatch) {
              const prId = parseInt(prIdMatch[1], 10);
              logger.info(`Found PR ID ${prId} from ArtifactLink: ${relation.url}`);
              if (!prIds.includes(prId)) {
                prIds.push(prId);
                // Construct PR URL
                const prUrl = `https://dev.azure.com/${this.organization}/${this.project}/_git/${this.project}/pullrequest/${prId}`;
                prLinks.push(prUrl);
              }
            }
            
            // Also check for direct PR URL patterns
            const directPrMatch = relation.url.match(/\/pullrequest\/(\d+)/i);
            if (directPrMatch) {
              const prId = parseInt(directPrMatch[1], 10);
              logger.info(`Found PR ID ${prId} from direct URL: ${relation.url}`);
              if (!prIds.includes(prId)) {
                prIds.push(prId);
                if (!prLinks.includes(relation.url)) {
                  prLinks.push(relation.url);
                }
              }
            }
            
            // Check attributes for PR information
            if (relation.attributes && relation.attributes.name) {
              const nameMatch = relation.attributes.name.match(/PR\s*#?(\d+)|pull\s*request\s*#?(\d+)/i);
              if (nameMatch) {
                const prId = parseInt(nameMatch[1] || nameMatch[2] || '0', 10);
                if (prId > 0 && !prIds.includes(prId)) {
                  logger.info(`Found PR ID ${prId} from relation name: ${relation.attributes.name}`);
                  prIds.push(prId);
                  const prUrl = `https://dev.azure.com/${this.organization}/${this.project}/_git/${this.project}/pullrequest/${prId}`;
                  prLinks.push(prUrl);
                }
              }
            }
          }
        });
      } else {
        logger.debug(`Work item ${workItemId} has no relations property`);
      }
      
      // Also check description for PR links
      const description = workItem.fields['System.Description'] || '';
      const prUrlPattern = /(?:https?:\/\/[^\s]+\/pullrequest\/(\d+)|PR\s*#?(\d+)|pull\s*request\s*#?(\d+))/gi;
      const matches = description.matchAll(prUrlPattern);
      for (const match of matches) {
        const prId = parseInt(match[1] || match[2] || match[3] || '0', 10);
        if (prId > 0 && !prIds.includes(prId)) {
          prIds.push(prId);
          const prUrl = `https://dev.azure.com/${this.organization}/${this.project}/_git/${this.project}/pullrequest/${prId}`;
          prLinks.push(prUrl);
        }
      }
      
      // Also check for PR mentions in title or other fields
      const title = workItem.fields['System.Title'] || '';
      const titlePrMatch = title.match(/PR\s*#?(\d+)|pull\s*request\s*#?(\d+)/i);
      if (titlePrMatch) {
        const prId = parseInt(titlePrMatch[1] || titlePrMatch[2] || '0', 10);
        if (prId > 0 && !prIds.includes(prId)) {
          prIds.push(prId);
          const prUrl = `https://dev.azure.com/${this.organization}/${this.project}/_git/${this.project}/pullrequest/${prId}`;
          prLinks.push(prUrl);
        }
      }
      
      logger.info(`Found ${prLinks.length} PR links for work item ${workItemId}: ${prIds.join(', ')}`);
      return prLinks;
    } catch (error: any) {
      logger.error(`Error fetching PR links: ${error.message}`);
      if (error.response?.data) {
        logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      return [];
    }
  }

  /**
   * Get pull request details by PR ID
   */
  async getPullRequest(prId: number, repositoryId?: string): Promise<any> {
    logger.info(`Fetching pull request: ${prId}`);
    
    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      // If repository ID not provided, try to find it
      if (!repositoryId) {
        const repos = await this.getRepositories();
        if (repos.length > 0) {
          repositoryId = repos[0].id;
        } else {
          throw new Error('No repositories found. Please specify repositoryId.');
        }
      }
      
      const { data } = await this.client.get(
        `/${org}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${prId}`,
        {
          params: {
            'api-version': '7.1',
          },
        }
      );
      
      logger.info(`Successfully fetched PR ${prId}`);
      return data;
    } catch (error: any) {
      logger.error(`Error fetching PR ${prId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pull request commits and file changes
   * Uses PR iterations API which provides direct access to file changes
   */
  async getPullRequestChanges(prId: number, repositoryId?: string): Promise<any[]> {
    logger.info(`Fetching PR changes for PR: ${prId}`);
    
    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      if (!repositoryId) {
        const repos = await this.getRepositories();
        if (repos.length > 0) {
          repositoryId = repos.find(r => r.name.toLowerCase() === project.toLowerCase())?.id || repos[0].id;
        } else {
          throw new Error('No repositories found.');
        }
      }
      
      const changes: any[] = [];
      
      try {
        // Method 1: Use PR iterations API - this is the most reliable way to get file changes
        logger.info(`Fetching PR iterations for PR ${prId}...`);
        const { data: iterationsData } = await this.client.get(
          `/${org}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${prId}/iterations`,
          {
            params: {
              'api-version': '7.1',
            },
          }
        );
        
        // Get the latest iteration (most recent changes)
        if (iterationsData.value && iterationsData.value.length > 0) {
          const latestIteration = iterationsData.value[iterationsData.value.length - 1];
          const iterationId = latestIteration.id;
          
          logger.info(`Fetching file changes from iteration ${iterationId}...`);
          
          // Get file changes from the latest iteration
          const { data: changesData } = await this.client.get(
            `/${org}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${prId}/iterations/${iterationId}/changes`,
            {
              params: {
                'api-version': '7.1',
                $top: 1000, // Get up to 1000 changes
              },
            }
          );
          
          if (changesData.changeEntries && changesData.changeEntries.length > 0) {
            logger.info(`Found ${changesData.changeEntries.length} file changes from PR iterations API`);
            changes.push(...changesData.changeEntries);
          }
        }
      } catch (iterationsError: any) {
        logger.warn(`Could not fetch changes via PR iterations API: ${iterationsError.message}`);
        if (iterationsError.response?.data) {
          logger.debug('Iterations API error details:', JSON.stringify(iterationsError.response.data, null, 2));
        }
      }
      
      // Method 2: Fallback - Get changes via commits API
      if (changes.length === 0) {
        try {
          logger.info(`Trying commits API as fallback...`);
          const { data: commitsData } = await this.client.get(
            `/${org}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${prId}/commits`,
            {
              params: {
                'api-version': '7.1',
              },
            }
          );
          
          if (commitsData.value && commitsData.value.length > 0) {
            logger.info(`Found ${commitsData.value.length} commit(s) in PR`);
            
            // Get file changes from each commit
            for (const commit of commitsData.value) {
              try {
                const { data: commitChangesData } = await this.client.get(
                  `/${org}/${project}/_apis/git/repositories/${repositoryId}/commits/${commit.commitId}/changes`,
                  {
                    params: {
                      'api-version': '7.1',
                    },
                  }
                );
                
                if (commitChangesData.changeEntries) {
                  // Merge changes, avoiding duplicates
                  const existingPaths = new Set(changes.map(c => c.item?.path || c.path));
                  commitChangesData.changeEntries.forEach((entry: any) => {
                    const path = entry.item?.path || entry.path;
                    if (path && !existingPaths.has(path)) {
                      changes.push(entry);
                      existingPaths.add(path);
                    }
                  });
                }
              } catch (commitError: any) {
                logger.warn(`Could not fetch changes for commit ${commit.commitId}: ${commitError.message}`);
              }
            }
          }
        } catch (commitsError: any) {
          logger.warn(`Could not fetch changes via commits API: ${commitsError.message}`);
        }
      }
      
      // Method 3: Fallback - Use diff API with source/target refs
      if (changes.length === 0) {
        try {
          logger.info(`Trying diff API as fallback...`);
          const pr = await this.getPullRequest(prId, repositoryId);
          
          const sourceCommit = pr.lastMergeSourceCommit?.commitId || pr.sourceRefName?.replace('refs/heads/', '');
          const targetCommit = pr.lastMergeTargetCommit?.commitId || pr.targetRefName?.replace('refs/heads/', '');
          
          if (sourceCommit && targetCommit) {
            logger.info(`Using diff between ${targetCommit} and ${sourceCommit}`);
            
            const { data: diffData } = await this.client.get(
              `/${org}/${project}/_apis/git/repositories/${repositoryId}/diffs/commits`,
              {
                params: {
                  baseVersion: targetCommit,
                  targetVersion: sourceCommit,
                  'api-version': '7.1',
                  $top: 1000,
                },
              }
            );
            
            if (diffData.changeEntries) {
              logger.info(`Found ${diffData.changeEntries.length} file changes from diff API`);
              changes.push(...diffData.changeEntries);
            }
          }
        } catch (diffError: any) {
          logger.warn(`Could not fetch changes via diff API: ${diffError.message}`);
        }
      }
      
      logger.info(`✅ Total file changes found: ${changes.length}`);
      
      // Log file paths for debugging
      if (changes.length > 0) {
        const sqlFiles = changes.filter(c => {
          const path = c.item?.path || c.path || '';
          return path.toLowerCase().endsWith('.sql');
        });
        logger.info(`   SQL files: ${sqlFiles.length}`);
        sqlFiles.slice(0, 5).forEach((f: any) => {
          logger.info(`   - ${f.item?.path || f.path}`);
        });
        if (sqlFiles.length > 5) {
          logger.info(`   ... and ${sqlFiles.length - 5} more`);
        }
      }
      
      return changes;
    } catch (error: any) {
      logger.error(`Error fetching PR changes: ${error.message}`);
      if (error.response?.data) {
        logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      return [];
    }
  }

  /**
   * Get repositories in the project
   */
  async getRepositories(): Promise<any[]> {
    logger.info('Fetching repositories');
    
    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      const { data } = await this.client.get(
        `/${org}/${project}/_apis/git/repositories`,
        {
          params: {
            'api-version': '7.1',
          },
        }
      );
      
      logger.info(`Found ${data.value?.length || 0} repositories`);
      return data.value || [];
    } catch (error: any) {
      logger.error(`Error fetching repositories: ${error.message}`);
      return [];
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(repositoryId: string, filePath: string, commitId?: string): Promise<string | null> {
    logger.info(`Fetching file content: ${filePath} from repository ${repositoryId}`);
    
    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      const params: any = {
        'api-version': '7.1',
      };
      
      if (commitId) {
        params.versionDescriptor = JSON.stringify({ version: commitId, versionType: 'commit' });
      }
      
      const { data } = await this.client.get(
        `/${org}/${project}/_apis/git/repositories/${repositoryId}/items`,
        {
          params: {
            ...params,
            path: filePath,
            includeContent: true,
          },
        }
      );
      
      if (data.content) {
        // Content is base64 encoded
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return null;
    } catch (error: any) {
      logger.warn(`Could not fetch file content for ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Query work items using WIQL (Work Item Query Language)
   */
  async queryWorkItems(wiql: string): Promise<AzureDevOpsWorkItem[]> {
    logger.info(`Querying Azure DevOps work items with WIQL: ${wiql}`);

    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      // First, execute the WIQL query to get work item IDs
      const queryResponse = await this.client.post<AzureDevOpsWorkItemQueryResult>(
        `/${org}/${project}/_apis/wit/wiql`,
        {
          query: wiql,
        },
        {
          params: {
            'api-version': this.apiVersion,
          },
        }
      );

      const workItemIds = queryResponse.data.workItems.map(wi => wi.id);

      if (workItemIds.length === 0) {
        logger.info('No work items found matching the query');
        return [];
      }

      logger.info(`Found ${workItemIds.length} work items, fetching details...`);

      // Fetch full work item details
      const { data } = await this.client.get<{ value: AzureDevOpsWorkItem[] }>(
        `/${org}/${project}/_apis/wit/workitems`,
        {
          params: {
            ids: workItemIds.join(','),
            'api-version': this.apiVersion,
            $expand: 'all',
          },
        }
      );

      logger.info(`Successfully fetched ${data.value.length} work items`);
      return data.value;
    } catch (error: any) {
      logger.error(`WIQL query failed: ${error.message}`);
      if (error.response?.data) {
        logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get all projects in the organization
   */
  async getProjects(): Promise<AzureDevOpsProject[]> {
    logger.info('Fetching Azure DevOps projects');

    try {
      // For projects API, we only need the organization, not the project
      const org = this.encodeUrlSegment(this.organization);
      const { data } = await this.client.get<{ value: AzureDevOpsProject[] }>(
        `/${org}/_apis/projects`,
        {
          params: {
            'api-version': this.apiVersion,
            stateFilter: 'WellFormed',
          },
        }
      );

      logger.info(`Successfully fetched ${data.value.length} projects`);
      return data.value;
    } catch (error: any) {
      logger.error(`Failed to fetch projects: ${error.message}`);
      if (error.response?.data) {
        logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Search work items by title or description
   */
  async searchWorkItems(searchText: string, workItemTypes?: string[]): Promise<AzureDevOpsWorkItem[]> {
    logger.info(`Searching Azure DevOps work items: "${searchText}"`);

    let wiql = `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State] FROM WorkItems WHERE [System.Title] CONTAINS '${searchText.replace(/'/g, "''")}' OR [System.Description] CONTAINS '${searchText.replace(/'/g, "''")}'`;

    if (workItemTypes && workItemTypes.length > 0) {
      const types = workItemTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
      wiql += ` AND [System.WorkItemType] IN (${types})`;
    }

    wiql += ' ORDER BY [System.ChangedDate] DESC';

    return this.queryWorkItems(wiql);
  }

  /**
   * Get work items by state (e.g., "Ready for QA", "In QA")
   */
  async getWorkItemsByState(states: string[], workItemTypes?: string[]): Promise<AzureDevOpsWorkItem[]> {
    logger.info(`Fetching Azure DevOps work items with states: ${states.join(', ')}`);

    let wiql = `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State] FROM WorkItems WHERE [System.State] IN (${states.map(s => `'${s.replace(/'/g, "''")}'`).join(', ')})`;

    if (workItemTypes && workItemTypes.length > 0) {
      const types = workItemTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
      wiql += ` AND [System.WorkItemType] IN (${types})`;
    }

    wiql += ' ORDER BY [System.Id] ASC';

    return this.queryWorkItems(wiql);
  }

  /**
   * Execute a saved query by query ID
   */
  async executeSavedQuery(queryId: string): Promise<AzureDevOpsWorkItem[]> {
    logger.info(`Executing saved query: ${queryId}`);

    try {
      const org = this.encodeUrlSegment(this.organization);
      const project = this.encodeUrlSegment(this.project);
      
      // First, get the query definition to extract the WIQL
      const queryResponse = await this.client.get<{ wiql: string }>(
        `/${org}/${project}/_apis/wit/queries/${queryId}`,
        {
          params: {
            'api-version': this.apiVersion,
            $expand: 'wiql',
          },
        }
      );

      const wiql = queryResponse.data.wiql;
      logger.info(`Retrieved WIQL from saved query: ${wiql}`);

      // Execute the WIQL query
      return this.queryWorkItems(wiql);
    } catch (error: any) {
      logger.error(`Failed to execute saved query: ${error.message}`);
      if (error.response?.data) {
        logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}

