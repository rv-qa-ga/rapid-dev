import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export interface GitHubUser {
  login: string;
  id: number;
  name?: string;
  email?: string;
  avatar_url: string;
  type: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    type: string;
  };
  private: boolean;
  html_url: string;
  description?: string;
  default_branch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
    maintain?: boolean;
    triage?: boolean;
  };
}

export interface GitHubRepositoryPermissions {
  admin: boolean;
  push: boolean;
  pull: boolean;
  maintain?: boolean;
  triage?: boolean;
}

export interface GitHubCollaborator {
  login: string;
  id: number;
  permissions: GitHubRepositoryPermissions;
  role_name: string;
}

export class GitHubClient {
  private client: AxiosInstance;
  private baseURL: string;
  private token: string;

  constructor() {
    const githubConfig = config.getGitHubConfig();
    this.baseURL = process.env.GITHUB_BASE_URL || githubConfig.baseUrl || 'https://api.github.com';

    // Normalize base URL
    const normalizedBaseUrl = this.baseURL.replace(/\/+$/, '');

    this.token = process.env.GITHUB_TOKEN || githubConfig.token || '';

    if (!this.token) {
      const envName = config.getEnvironment();
      throw new Error(
        `GITHUB_TOKEN must be set in src/config/env/.env.${envName} (or exported as an environment variable).`
      );
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.GITHUB_REJECT_UNAUTHORIZED !== 'false',
    });

    this.client = axios.create({
      baseURL: normalizedBaseUrl,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'E2EAutomation-Framework',
      },
      httpsAgent,
    });
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    logger.info('Fetching authenticated GitHub user');
    
    try {
      const { data } = await this.client.get<GitHubUser>('/user');
      logger.info(`Authenticated as: ${data.login}`);
      return data;
    } catch (error: any) {
      if (error.response) {
        logger.error(`GitHub API Error: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 401) {
          logger.error('Authentication failed. Check GITHUB_TOKEN');
        } else if (error.response.status === 403) {
          logger.error('Access denied. Token may be invalid or expired');
        }
      }
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    logger.info(`Fetching GitHub repository: ${owner}/${repo}`);
    
    try {
      const { data } = await this.client.get<GitHubRepository>(`/repos/${owner}/${repo}`);
      logger.info(`Successfully fetched repository: ${data.full_name}`);
      return data;
    } catch (error: any) {
      if (error.response) {
        logger.error(`GitHub API Error: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 404) {
          logger.error(`Repository ${owner}/${repo} not found. Verify:`);
          logger.error(`  1. Repository exists at: https://github.com/${owner}/${repo}`);
          logger.error(`  2. Your token has access to this repository`);
          logger.error(`  3. Repository name and owner are correct`);
        } else if (error.response.status === 401) {
          logger.error('Authentication failed. Check GITHUB_TOKEN');
        } else if (error.response.status === 403) {
          logger.error('Access denied. Your token may not have permission to this repository');
          logger.error('If using an organization, ensure token is SSO authorized');
        }
      }
      throw error;
    }
  }

  /**
   * Check repository access and permissions
   */
  async checkRepositoryAccess(owner: string, repo: string): Promise<GitHubRepositoryPermissions | null> {
    logger.info(`Checking access to repository: ${owner}/${repo}`);
    
    try {
      const repository = await this.getRepository(owner, repo);
      return repository.permissions || null;
    } catch (error: any) {
      logger.warn(`Failed to check repository access: ${error.message}`);
      return null;
    }
  }

  /**
   * Get repository collaborators
   */
  async getCollaborators(owner: string, repo: string): Promise<GitHubCollaborator[]> {
    logger.info(`Fetching collaborators for repository: ${owner}/${repo}`);
    
    try {
      const { data } = await this.client.get<GitHubCollaborator[]>(`/repos/${owner}/${repo}/collaborators`);
      logger.info(`Found ${data.length} collaborators`);
      return data;
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 403) {
          logger.error('Access denied. You may need admin permissions to view collaborators');
        }
      }
      logger.warn(`Failed to fetch collaborators: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a specific collaborator's permissions
   */
  async getCollaboratorPermissions(owner: string, repo: string, username: string): Promise<GitHubCollaborator | null> {
    logger.info(`Fetching permissions for collaborator: ${username} in ${owner}/${repo}`);
    
    try {
      const { data } = await this.client.get<GitHubCollaborator>(`/repos/${owner}/${repo}/collaborators/${username}`);
      return data;
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 404) {
          logger.debug(`User ${username} is not a collaborator on ${owner}/${repo}`);
        } else if (error.response.status === 403) {
          logger.error('Access denied. You may need admin permissions to view collaborator details');
        }
      }
      return null;
    }
  }

  /**
   * Test token validity
   */
  async testToken(): Promise<{ valid: boolean; user?: GitHubUser; error?: string }> {
    logger.info('Testing GitHub token validity');
    
    try {
      const user = await this.getAuthenticatedUser();
      return { valid: true, user };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Test repository access
   */
  async testRepositoryAccess(owner: string, repo: string): Promise<{ 
    accessible: boolean; 
    permissions?: GitHubRepositoryPermissions; 
    error?: string 
  }> {
    logger.info(`Testing access to repository: ${owner}/${repo}`);
    
    try {
      const repository = await this.getRepository(owner, repo);
      return { 
        accessible: true, 
        permissions: repository.permissions 
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      return { accessible: false, error: errorMessage };
    }
  }
}

export const githubClient = new GitHubClient();

