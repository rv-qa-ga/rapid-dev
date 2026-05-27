import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { name: string };
    status: { name: string };
    labels?: string[];
    [key: string]: any;
  };
}

export interface JiraComment {
  body: string;
  author: { displayName: string };
  created: string;
}

export class JiraClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    const jiraConfig = config.getJiraConfig();
    this.baseURL = process.env.JIRA_BASE_URL || jiraConfig.baseUrl;

    if (!this.baseURL) {
      throw new Error('JIRA_BASE_URL must be set in environment or config');
    }

    const email = process.env.JIRA_EMAIL || process.env.ATLASSIAN_EMAIL;
    const apiToken =
      process.env.JIRA_API_TOKEN ||
      process.env.ATLASSIAN_API_TOKEN ||
      process.env.JIRA_AUTOMATION_TOKEN ||
      process.env.JiraAutomationToken;

    if (!email || !apiToken) {
      const envName = config.getEnvironment();
      throw new Error(
        `JIRA_EMAIL (or ATLASSIAN_EMAIL) and a Jira API token must be set in src/config/env/.env.${envName}: ` +
          `JIRA_API_TOKEN, ATLASSIAN_API_TOKEN, JIRA_AUTOMATION_TOKEN, or JiraAutomationToken.`
      );
    }

    // Normalize base URL
    const normalizedBaseUrl = this.baseURL.replace(/\/+$/, '');

    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.JIRA_REJECT_UNAUTHORIZED !== 'false',
    });

    this.client = axios.create({
      baseURL: `${normalizedBaseUrl}/rest/api/3/`,
      headers: {
        Accept: 'application/json',
      },
      auth: {
        username: email,
        password: apiToken,
      },
      httpsAgent,
    });
  }

  /**
   * Get Jira issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    logger.info(`Fetching Jira issue: ${issueKey}`);
    const apiUrl = `${this.baseURL}/rest/api/3/issue/${issueKey}`;
    logger.debug(`API URL: ${apiUrl}`);

    try {
      const { data } = await this.client.get<JiraIssue>(
        `issue/${encodeURIComponent(issueKey)}`,
        {
          params: {
            fields: 'summary,description,issuetype,status,labels,priority',
          },
        }
      );

      logger.info(`Successfully fetched issue: ${issueKey}`);
      return data;
    } catch (error: any) {
      if (error.response) {
        logger.error(`Jira API Error: ${error.response.status} - ${error.response.statusText}`);
        logger.error(`URL attempted: ${apiUrl}`);
        if (error.response.status === 404) {
          logger.error(`Issue ${issueKey} not found. Verify:`);
          logger.error(`  1. Issue exists at: ${this.baseURL}/browse/${issueKey}`);
          logger.error(`  2. Your API token has access to this project`);
          logger.error(`  3. JIRA_BASE_URL is correct: ${this.baseURL}`);
        } else if (error.response.status === 401) {
          logger.error(`Authentication failed. Check JIRA_EMAIL and JIRA_API_TOKEN`);
        } else if (error.response.status === 403) {
          logger.error(`Access denied. Your API token may not have permission to this project`);
        }
      }
      throw error;
    }
  }

  /**
   * Get comments for a Jira issue
   */
  async getComments(issueKey: string): Promise<JiraComment[]> {
    logger.info(`Fetching comments for issue: ${issueKey}`);

    try {
      const { data } = await this.client.get<{ comments: JiraComment[] }>(
        `issue/${encodeURIComponent(issueKey)}/comment`
      );

      return data.comments || [];
    } catch (error: any) {
      logger.warn(`Failed to fetch comments for ${issueKey}: ${error.message}`);
      return [];
    }
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(jql: string, startAt: number = 0, maxResults: number = 1000): Promise<{ issues: JiraIssue[]; total?: number; startAt?: number; maxResults?: number }> {
    logger.info(`Searching Jira issues with JQL: ${jql} (startAt: ${startAt}, maxResults: ${maxResults})`);

    try {
      // Use /rest/api/3/search/jql endpoint (required migration from /search)
      // The endpoint accepts: { jql: string, fields?: string[], startAt?: number, maxResults?: number }
      const { data } = await this.client.post<{ issues: JiraIssue[]; total?: number; startAt?: number; maxResults?: number }>('search/jql', {
        jql,
        fields: ['summary', 'description', 'issuetype', 'status', 'labels', 'updated', 'resolutiondate', 'issuelinks'],
        ...(startAt > 0 && { startAt }),
        ...(maxResults !== 1000 && { maxResults }),
      });

      logger.info(`Found ${data.issues.length} issues${data.total ? ` (total: ${data.total})` : ''}`);
      return data;
    } catch (error: any) {
      logger.error(`JQL search failed: ${error.message}`);
      if (error.response?.data) {
        logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get Jira issue with full details including parent, links, and all fields
   * Used for fetching complete context for parent/epic work items
   */
  async getIssueWithFullDetails(issueKey: string): Promise<JiraIssue> {
    logger.info(`Fetching full details for Jira issue: ${issueKey}`);
    const apiUrl = `${this.baseURL}/rest/api/3/issue/${issueKey}`;
    logger.debug(`API URL: ${apiUrl}`);

    try {
      const { data } = await this.client.get<JiraIssue>(
        `issue/${encodeURIComponent(issueKey)}`,
        {
          params: {
            // Fetch all important fields for comprehensive context
            fields: 'summary,description,issuetype,status,labels,priority,parent,issuelinks,subtasks,customfield_*,comment',
            expand: 'renderedFields,names',
          },
        }
      );

      logger.info(`Successfully fetched full details for issue: ${issueKey}`);
      return data;
    } catch (error: any) {
      if (error.response) {
        logger.error(`Jira API Error: ${error.response.status} - ${error.response.statusText}`);
        logger.error(`URL attempted: ${apiUrl}`);
        if (error.response.status === 404) {
          logger.error(`Issue ${issueKey} not found`);
        } else if (error.response.status === 401) {
          logger.error(`Authentication failed. Check JIRA_EMAIL and JIRA_API_TOKEN`);
        } else if (error.response.status === 403) {
          logger.error(`Access denied. Your API token may not have permission to this project`);
        }
      }
      throw error;
    }
  }

  /**
   * Get Jira issue ID (internal ID) from issue key
   * Zephyr Scale API requires the internal ID, not the issue key
   */
  async getIssueId(issueKey: string): Promise<string> {
    logger.debug(`Getting internal ID for Jira issue: ${issueKey}`);
    const issue = await this.getIssueWithFullDetails(issueKey);
    // Jira API returns 'id' field in the response
    return (issue as any).id || issue.key;
  }

  /**
   * Get the epic/parent issue for a given issue key
   * Returns the parent issue with full details if it exists
   */
  async getParentIssue(issueKey: string): Promise<JiraIssue | null> {
    logger.info(`Looking for parent issue of: ${issueKey}`);

    try {
      // First fetch the issue to get its parent reference
      const issue = await this.getIssueWithFullDetails(issueKey);
      
      // Check for direct parent (Story -> Epic relationship or Subtask -> Story)
      const parentKey = issue.fields.parent?.key;
      
      if (parentKey) {
        logger.info(`Found parent issue: ${parentKey}`);
        return this.getIssueWithFullDetails(parentKey);
      }
      
      // Check for epic link in custom fields (some Jira configurations use customfield_* for epic)
      const epicLinkField = Object.keys(issue.fields).find(key => 
        key.startsWith('customfield_') && 
        typeof issue.fields[key] === 'string' && 
        issue.fields[key]?.match(/^[A-Z]+-\d+$/)
      );
      
      if (epicLinkField && issue.fields[epicLinkField]) {
        const epicKey = issue.fields[epicLinkField];
        logger.info(`Found epic link: ${epicKey}`);
        return this.getIssueWithFullDetails(epicKey);
      }
      
      logger.info(`No parent issue found for ${issueKey}`);
      return null;
    } catch (error: any) {
      logger.warn(`Failed to fetch parent issue for ${issueKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Link a Zephyr test case to a Jira work item using remote issue links
   * This creates a link in Jira that points to the Zephyr test case
   */
  async linkZephyrTestCaseToJiraIssue(
    jiraIssueKey: string,
    zephyrTestCaseKey: string,
    zephyrTestCaseName: string,
    zephyrBaseUrl: string
  ): Promise<void> {
    logger.info(`Linking Zephyr test case ${zephyrTestCaseKey} to Jira issue ${jiraIssueKey}`);

    try {
      // Get Zephyr test case URL
      const zephyrUrl = `${zephyrBaseUrl.replace(/\/+$/, '')}/testcase/${zephyrTestCaseKey}`;
      
      // Create remote issue link
      // This creates a link in Jira that shows the Zephyr test case
      const payload = {
        globalId: `zephyr-testcase-${zephyrTestCaseKey}`,
        application: {
          type: 'com.zephyrscale',
          name: 'Zephyr Scale',
        },
        relationship: 'tests',
        object: {
          url: zephyrUrl,
          title: `Zephyr Test Case: ${zephyrTestCaseName}`,
          icon: {
            url16x16: 'https://www.smartbear.com/favicon.ico',
            title: 'Zephyr Scale',
          },
          status: {
            resolved: false,
            icon: {
              url16x16: 'https://www.smartbear.com/favicon.ico',
              title: 'Test Case',
            },
          },
        },
      };

      await this.client.post(`issue/${encodeURIComponent(jiraIssueKey)}/remotelink`, payload);
      logger.info(`✅ Successfully linked Zephyr test case ${zephyrTestCaseKey} to Jira issue ${jiraIssueKey}`);
    } catch (error: any) {
      if (error.response) {
        // If link already exists (409 Conflict), that's okay
        if (error.response.status === 409) {
          logger.debug(`Link already exists between ${jiraIssueKey} and ${zephyrTestCaseKey}`);
          return;
        }
        logger.error(`Failed to link test case: ${error.response.status} - ${error.response.statusText}`);
        logger.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        logger.error(`Failed to link test case: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get existing remote issue links for a Jira issue
   */
  async getRemoteIssueLinks(issueKey: string): Promise<any[]> {
    try {
      const { data } = await this.client.get(`issue/${encodeURIComponent(issueKey)}/remotelink`);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      logger.debug(`Failed to get remote issue links: ${error.message}`);
      return [];
    }
  }
}

export const jiraClient = new JiraClient();
