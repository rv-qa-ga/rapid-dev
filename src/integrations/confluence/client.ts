/**
 * Confluence Cloud API Client
 * 
 * Uploads test evidence (screenshots, HTML reports) to Confluence
 * and returns links to include in Zephyr test executions.
 * 
 * Structure:
 *   TM Space > Test Evidence (parent folder) > {Cycle Name} > {Test Case Pages}
 * 
 * Configuration (in .env):
 *   CONFLUENCE_BASE_URL=https://accelins.atlassian.net/wiki
 *   CONFLUENCE_SPACE_KEY=TM
 *   CONFLUENCE_PARENT_FOLDER_ID=2720628759  (Test Evidence folder)
 *   ATLASSIAN_EMAIL=your-email@company.com
 *   ATLASSIAN_API_TOKEN=your-api-token
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

export interface ConfluenceConfig {
  baseUrl: string;
  spaceKey: string;
  email: string;
  apiToken: string;
  parentFolderId?: string;  // The Test Evidence folder ID
}

export interface EvidencePage {
  id: string;
  title: string;
  url: string;
  attachments: string[];
}

export class ConfluenceClient {
  private client: AxiosInstance;
  private config: ConfluenceConfig;
  private cycleFolderCache: Map<string, string> = new Map(); // Cache cycle folder IDs

  constructor(config?: Partial<ConfluenceConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki',
      spaceKey: config?.spaceKey || process.env.CONFLUENCE_SPACE_KEY || 'TM',
      email: config?.email || process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '',
      apiToken: config?.apiToken || process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '',
      parentFolderId: config?.parentFolderId || process.env.CONFLUENCE_PARENT_FOLDER_ID || '2720628759',
    };

    if (!this.config.email || !this.config.apiToken) {
      logger.warn('Confluence integration not configured. Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN');
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/rest/api`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Check if Confluence is configured
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.email && this.config.apiToken);
  }

  /**
   * Get a page by ID (for use by scripts that need to read/update arbitrary pages).
   * Uses framework env: CONFLUENCE_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN.
   */
  async getPage(
    pageId: string,
    options?: { status?: 'current' | 'draft'; expand?: string }
  ): Promise<{ id: string; title: string; version: { number: number }; body?: { storage?: { value: string } }; _links: { webui: string } } | null> {
    if (!this.isConfigured()) return null;
    try {
      const expand = options?.expand ?? 'version,body.storage';
      const params: Record<string, string> = { expand };
      if (options?.status === 'draft') params.status = 'draft';
      const response = await this.client.get(`/content/${pageId}`, { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * List child pages of a parent (for finding or iterating sub-pages).
   */
  async getChildPages(
    parentId: string,
    options?: { limit?: number; expand?: string }
  ): Promise<Array<{ id: string; title: string; version?: { number: number }; _links: { webui: string } }>> {
    if (!this.isConfigured()) return [];
    const limit = options?.limit ?? 50;
    const expand = options?.expand ?? 'version';
    const response = await this.client.get(`/content/${parentId}/child/page`, {
      params: { limit, expand },
    });
    return response.data.results ?? [];
  }

  /**
   * Create a page under an ancestor with the given HTML body (Confluence storage format).
   * Used by docs/script uploads (e.g. Lloyd's Test Strategy sub-page).
   */
  async createPageWithBody(
    ancestorId: string,
    title: string,
    bodyStorage: string
  ): Promise<{ id: string; title: string; version: { number: number }; _links: { webui: string } }> {
    if (!this.isConfigured()) {
      throw new Error('Confluence not configured. Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN');
    }
    const response = await this.client.post('/content', {
      type: 'page',
      title,
      space: { key: this.config.spaceKey },
      ancestors: [{ id: ancestorId }],
      body: {
        storage: { value: bodyStorage, representation: 'storage' },
      },
    });
    return response.data;
  }

  /**
   * Update an existing page's body (storage format) and optionally title/version message.
   * When the page is a draft, pass options.status === 'draft' so the PUT targets the draft.
   * @param versionNumber Next version number (Confluence Cloud: current page version + 1).
   *
   * Confluence Cloud requires **title** on page PUT; if `options.title` is omitted, the current
   * title is loaded via GET so callers do not need to pass it.
   */
  async updatePageContent(
    pageId: string,
    bodyStorage: string,
    versionNumber: number,
    options?: { title?: string; message?: string; status?: 'current' | 'draft' }
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Confluence not configured. Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN');
    }
    let title = options?.title;
    if (title === undefined) {
      const current = await this.getPage(pageId, { expand: 'version', status: options?.status });
      title = current?.title;
      if (!title) {
        throw new Error(`Cannot update page ${pageId}: could not load current title (page missing or no access).`);
      }
    }
    const payload: Record<string, unknown> = {
      id: pageId,
      type: 'page',
      title,
      space: { key: this.config.spaceKey },
      body: { storage: { value: bodyStorage, representation: 'storage' } },
      version: { number: versionNumber, message: options?.message ?? 'Updated by automation' },
    };
    const url = options?.status === 'draft' ? `/content/${pageId}?status=draft` : `/content/${pageId}`;
    await this.client.put(url, payload);
  }

  /**
   * Find a child page by title under a parent (public for use by scripts).
   * Handles pagination to search through all child pages.
   */
  async findChildPageByTitle(parentId: string, title: string): Promise<any | null> {
    try {
      let start = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
      const response = await this.client.get(`/content/${parentId}/child/page`, {
        params: {
          expand: '_links',
            start: start,
            limit: limit,
        },
      });

      const results = response.data.results || [];
        const found = results.find((p: any) => p.title === title);
        
        if (found) {
          return found;
        }

        hasMore = response.data.size === limit && results.length === limit;
        start += limit;

        if (start > 1000) {
          logger.debug(`Reached safety limit while searching for child page: ${title}`);
          break;
        }
      }

      return null;
    } catch (error: any) {
      logger.debug(`Error searching for child page: ${error.message}`);
      return null;
    }
  }

  /**
   * Same as findChildPageByTitle but matches trim + case-insensitive (avoids duplicate creates when casing differs).
   */
  async findChildPageByTitleCaseInsensitive(parentId: string, title: string): Promise<any | null> {
    const want = title.trim().toLowerCase();
    try {
      let start = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/content/${parentId}/child/page`, {
          params: {
            expand: '_links',
            start,
            limit,
          },
        });

        const results = response.data.results || [];
        const found = results.find((p: any) => (p.title || '').trim().toLowerCase() === want);

        if (found) {
          return found;
        }

        hasMore = response.data.size === limit && results.length === limit;
        start += limit;

        if (start > 1000) {
          logger.debug(`Reached safety limit while searching for child page (case-insensitive): ${title}`);
          break;
        }
      }

      return null;
    } catch (error: any) {
      logger.debug(`Error searching for child page: ${error.message}`);
      return null;
    }
  }

  /** Base URL for building view links (e.g. for script output). */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get or create a folder for the test cycle
   * Structure: Test Evidence (parent) > {Cycle Name} (folder)
   */
  async getOrCreateCycleFolder(cycleName: string): Promise<string | null> {
    // Check cache first
    if (this.cycleFolderCache.has(cycleName)) {
      return this.cycleFolderCache.get(cycleName)!;
    }

    try {
      // Search for existing folder with cycle name
      const existingFolder = await this.findPageByTitle(cycleName);
      
      if (existingFolder) {
        logger.debug(`Found existing cycle folder: ${cycleName}`);
        this.cycleFolderCache.set(cycleName, existingFolder.id);
        return existingFolder.id;
      }

      // Create new folder (page) under the parent folder
      logger.info(`Creating Confluence folder for cycle: ${cycleName}`);
      
      const folderContent = `
        <h1>${cycleName}</h1>
        <p>Test execution evidence for <strong>${cycleName}</strong></p>
        <p>This folder contains screenshots and reports from automated test executions.</p>
        <hr/>
        <ac:structured-macro ac:name="children" ac:schema-version="2">
          <ac:parameter ac:name="all">true</ac:parameter>
          <ac:parameter ac:name="sort">modified</ac:parameter>
        </ac:structured-macro>
      `;

      const payload: any = {
        type: 'page',
        title: cycleName,
        space: { key: this.config.spaceKey },
        body: {
          storage: {
            value: folderContent,
            representation: 'storage',
          },
        },
      };

      // Add parent folder as ancestor
      if (this.config.parentFolderId) {
        payload.ancestors = [{ id: this.config.parentFolderId }];
      }

      const response = await this.client.post('/content', payload);
      const folderId = response.data.id;
      
      logger.info(`✅ Created cycle folder: ${cycleName} (ID: ${folderId})`);
      this.cycleFolderCache.set(cycleName, folderId);
      
      return folderId;
    } catch (error: any) {
      logger.error(`Failed to create cycle folder: ${error.message}`);
      if (error.response) {
        logger.debug(`Response: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Create or find an evidence page for a test case
   * Structure: Test Evidence > {Cycle Name} > {Test Case ID} - {Scenario Name}
   */
  async getOrCreateEvidencePage(
    testCycleName: string,
    testCaseId: string,
    scenarioName: string
  ): Promise<EvidencePage | null> {
    if (!this.isConfigured()) {
      logger.debug('Confluence not configured, skipping evidence upload');
      return null;
    }

    // First, ensure the cycle folder exists
    const cycleFolderId = await this.getOrCreateCycleFolder(testCycleName);
    if (!cycleFolderId) {
      logger.error('Could not create cycle folder in Confluence');
      return null;
    }

    const pageTitle = `${testCaseId} - ${this.sanitizeTitle(scenarioName)}`;
    
    try {
      // Search for existing page under the cycle folder
      const existingPage = await this.findChildPageByTitle(cycleFolderId, pageTitle);
      
      if (existingPage) {
        logger.debug(`Found existing evidence page: ${pageTitle}`);
        return {
          id: existingPage.id,
          title: pageTitle,
          url: `${this.config.baseUrl}${existingPage._links.webui}`,
          attachments: [],
        };
      }

      // Create new page under the cycle folder
      logger.info(`Creating evidence page: ${pageTitle}`);
      const newPage = await this.createPageUnderParent(cycleFolderId, pageTitle, testCaseId, scenarioName);
      
      return {
        id: newPage.id,
        title: pageTitle,
        url: `${this.config.baseUrl}${newPage._links.webui}`,
        attachments: [],
      };
    } catch (error: any) {
      logger.error(`Failed to create evidence page: ${error.message}`);
      if (error.response) {
        logger.debug(`Response: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Create a page under a specific parent page
   */
  private async createPageUnderParent(
    parentId: string,
    title: string,
    testCaseId: string,
    scenarioName: string,
    gherkinSteps?: string[],
    status?: string
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const statusColor = status === 'PASS' ? '#00875a' : status === 'FAIL' ? '#de350b' : '#0052cc';
    const statusLabel = status || 'EXECUTED';
    
    // Build Gherkin steps section
    let stepsHtml = '';
    if (gherkinSteps && gherkinSteps.length > 0) {
      stepsHtml = `
        <h2>Test Steps</h2>
        <ac:structured-macro ac:name="code" ac:schema-version="1">
          <ac:parameter ac:name="language">gherkin</ac:parameter>
          <ac:parameter ac:name="title">Scenario: ${this.escapeHtml(scenarioName)}</ac:parameter>
          <ac:plain-text-body><![CDATA[${gherkinSteps.join('\n')}]]></ac:plain-text-body>
        </ac:structured-macro>
      `;
    }
    
    const pageContent = `
      <ac:structured-macro ac:name="panel" ac:schema-version="1">
        <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
        <ac:parameter ac:name="titleBGColor">${statusColor}</ac:parameter>
        <ac:parameter ac:name="titleColor">#ffffff</ac:parameter>
        <ac:parameter ac:name="title">${statusLabel} - ${testCaseId}</ac:parameter>
        <ac:rich-text-body>
          <table>
            <tr><td><strong>Test Case ID</strong></td><td><code>${testCaseId}</code></td></tr>
            <tr><td><strong>Scenario</strong></td><td>${this.escapeHtml(scenarioName)}</td></tr>
            <tr><td><strong>Executed</strong></td><td>${timestamp}</td></tr>
            <tr><td><strong>Status</strong></td><td><span style="color:${statusColor};font-weight:bold;">${statusLabel}</span></td></tr>
          </table>
        </ac:rich-text-body>
      </ac:structured-macro>
      ${stepsHtml}
      <h2>Screenshots</h2>
      <p><em>Screenshots will be displayed inline below after upload.</em></p>
      <div id="screenshots-section">
        <!-- Screenshots will be embedded here via page update -->
      </div>
      <hr/>
      <p><small>Generated by E2E Automation Framework at ${timestamp}</small></p>
    `;

    const payload = {
      type: 'page',
      title: title,
      space: { key: this.config.spaceKey },
      ancestors: [{ id: parentId }],
      body: {
        storage: {
          value: pageContent,
          representation: 'storage',
        },
      },
    };

    const response = await this.client.post('/content', payload);
    return response.data;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Find a page by title in the configured space
   */
  private async findPageByTitle(title: string): Promise<any | null> {
    try {
      const response = await this.client.get('/content', {
        params: {
          spaceKey: this.config.spaceKey,
          title: title,
          expand: '_links',
        },
      });

      const results = response.data.results || [];
      return results.length > 0 ? results[0] : null;
    } catch (error: any) {
      logger.debug(`Error searching for page: ${error.message}`);
      return null;
    }
  }

  /**
   * Upload an attachment to a Confluence page
   * If an attachment with the same name exists, it will be updated/replaced
   */
  async uploadAttachment(pageId: string, filePath: string): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    if (!fs.existsSync(filePath)) {
      logger.warn(`Attachment file not found: ${filePath}`);
      return null;
    }

    try {
      const fileName = path.basename(filePath);
      const fileContent = fs.readFileSync(filePath);
      const boundary = `----FormBoundary${Date.now()}`;

      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.html': 'text/html',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.svg': 'image/svg+xml',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Build multipart form data
      const bodyParts: Buffer[] = [];
      bodyParts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
      ));
      bodyParts.push(fileContent);
      bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      
      const body = Buffer.concat(bodyParts);

      // Try to upload the attachment
      let response;
      try {
        response = await this.client.post(
        `/content/${pageId}/child/attachment`,
        body,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'X-Atlassian-Token': 'nocheck',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );
      } catch (uploadError: any) {
        // If attachment already exists, try to update it
        if (uploadError.response?.data?.message?.includes('same file name') ||
            uploadError.response?.data?.message?.includes('already exists')) {
          logger.debug(`Attachment "${fileName}" already exists, attempting to update...`);
          
          // Get existing attachments
          const attachmentsResponse = await this.client.get(`/content/${pageId}/child/attachment`, {
            params: {
              filename: fileName,
            },
          });
          
          const existingAttachment = attachmentsResponse.data.results?.[0];
          if (existingAttachment) {
            // Update the existing attachment
            response = await this.client.post(
              `/content/${pageId}/child/attachment/${existingAttachment.id}/data`,
              body,
              {
                headers: {
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                  'X-Atlassian-Token': 'nocheck',
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
              }
            );
            logger.info(`✅ Updated existing attachment in Confluence: ${fileName}`);
          } else {
            // If we can't find it, try with a timestamped filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const nameWithoutExt = path.basename(filePath, ext);
            const timestampedFileName = `${nameWithoutExt}-${timestamp}${ext}`;
            
            bodyParts[0] = Buffer.from(
              `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="file"; filename="${timestampedFileName}"\r\n` +
              `Content-Type: ${contentType}\r\n\r\n`
            );
            const newBody = Buffer.concat([bodyParts[0], bodyParts[1], bodyParts[2]]);
            
            response = await this.client.post(
              `/content/${pageId}/child/attachment`,
              newBody,
              {
                headers: {
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                  'X-Atlassian-Token': 'nocheck',
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
              }
            );
            logger.info(`✅ Uploaded with timestamped name to Confluence: ${timestampedFileName}`);
          }
        } else {
          throw uploadError;
        }
      }

      const attachment = response.data.results?.[0] || response.data;
      if (attachment) {
        const attachmentUrl = attachment._links?.download 
          ? `${this.config.baseUrl}${attachment._links.download}`
          : `${this.config.baseUrl}/download/attachments/${pageId}/${attachment.title || fileName}`;
        logger.info(`✅ Uploaded to Confluence: ${fileName}`);
        return attachmentUrl;
      }

      return null;
    } catch (error: any) {
      logger.warn(`Failed to upload attachment to Confluence: ${error.message}`);
      if (error.response) {
        logger.debug(`Response: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Upload multiple evidence files and return the page URL
   * Screenshots will be embedded inline in the page for easy viewing
   */
  async uploadEvidence(
    testCycleName: string,
    testCaseId: string,
    scenarioName: string,
    files: string[],
    options?: {
      gherkinSteps?: string[];
      status?: string;
      embedScreenshots?: boolean;
    }
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      logger.debug('Confluence not configured');
      return null;
    }

    const gherkinSteps = options?.gherkinSteps || [];
    const status = options?.status || 'EXECUTED';
    const embedScreenshots = options?.embedScreenshots !== false; // Default true

    // Create or find the evidence page (with steps and status)
    const page = await this.getOrCreateEvidencePageWithSteps(
      testCycleName,
      testCaseId,
      scenarioName,
      gherkinSteps,
      status
    );
    
    if (!page) {
      return null;
    }

    // Upload all files as attachments
    const uploadedScreenshots: string[] = [];
    let anyFileUploaded = false;
    for (const file of files) {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        const attached = await this.uploadAttachment(page.id, file);
        if (attached) anyFileUploaded = true;

        // Track screenshots for inline embedding
        const ext = path.extname(file).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
          uploadedScreenshots.push(fileName);
        }
      }
    }

    // Update page: embed screenshots inline and add Attachments section so HTML reports are visible
    // When no screenshots but we have HTML report, page body must be updated to show attachments
    if (anyFileUploaded) {
      await this.updatePageWithInlineScreenshots(
        page.id,
        uploadedScreenshots,
        gherkinSteps,
        scenarioName,
        testCaseId,
        status
      );
    }

    return page.url;
  }

  /**
   * Create or find an evidence page with Gherkin steps and status
   */
  private async getOrCreateEvidencePageWithSteps(
    testCycleName: string,
    testCaseId: string,
    scenarioName: string,
    gherkinSteps: string[],
    status: string
  ): Promise<EvidencePage | null> {
    if (!this.isConfigured()) {
      logger.debug('Confluence not configured, skipping evidence upload');
      return null;
    }

    // First, ensure the cycle folder exists
    const cycleFolderId = await this.getOrCreateCycleFolder(testCycleName);
    if (!cycleFolderId) {
      logger.error('Could not create cycle folder in Confluence');
      return null;
    }

    const pageTitle = `${testCaseId} - ${this.sanitizeTitle(scenarioName)}`;
    
    try {
      // Search for existing page under the cycle folder
      const existingPage = await this.findChildPageByTitle(cycleFolderId, pageTitle);
      
      if (existingPage) {
        logger.debug(`Found existing evidence page: ${pageTitle}`);
        return {
          id: existingPage.id,
          title: pageTitle,
          url: `${this.config.baseUrl}${existingPage._links.webui}`,
          attachments: [],
        };
      }

      // Create new page under the cycle folder (with steps and status)
      logger.info(`Creating evidence page: ${pageTitle}`);
      const newPage = await this.createPageUnderParent(
        cycleFolderId,
        pageTitle,
        testCaseId,
        scenarioName,
        gherkinSteps,
        status
      );
      
      return {
        id: newPage.id,
        title: pageTitle,
        url: `${this.config.baseUrl}${newPage._links.webui}`,
        attachments: [],
      };
    } catch (error: any) {
      // Handle "page already exists" error - try to find it again
      if (error.response?.data?.message?.includes('already exists') || 
          error.message?.includes('already exists')) {
        logger.warn(`Page "${pageTitle}" already exists, attempting to find it...`);
        
        // Try to find the page using a broader search
        try {
          // First try finding as child of cycle folder again (maybe it was just created)
          const existingPage = await this.findChildPageByTitle(cycleFolderId, pageTitle);
          if (existingPage) {
            logger.info(`Found existing page after creation error: ${pageTitle}`);
            return {
              id: existingPage.id,
              title: pageTitle,
              url: `${this.config.baseUrl}${existingPage._links.webui}`,
              attachments: [],
            };
          }
          
          // Try finding by title in the entire space (fallback)
          const spacePage = await this.findPageByTitle(pageTitle);
          if (spacePage) {
            logger.info(`Found existing page in space: ${pageTitle}`);
            return {
              id: spacePage.id,
              title: pageTitle,
              url: `${this.config.baseUrl}${spacePage._links.webui}`,
              attachments: [],
            };
          }
        } catch (findError: any) {
          logger.warn(`Could not find existing page: ${findError.message}`);
        }
      }
      
      logger.error(`Failed to create evidence page: ${error.message}`);
      if (error.response) {
        logger.debug(`Response: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Update page content to embed screenshots inline (viewable without downloading)
   */
  private async updatePageWithInlineScreenshots(
    pageId: string,
    screenshotFileNames: string[],
    gherkinSteps: string[],
    scenarioName: string,
    testCaseId: string,
    status: string
  ): Promise<void> {
    try {
      // Get current page version
      const { data: currentPage } = await this.client.get(`/content/${pageId}?expand=version,body.storage`);
      const currentVersion = currentPage.version.number;
      
      const timestamp = new Date().toISOString();
      const statusColor = status === 'PASS' ? '#00875a' : status === 'FAIL' ? '#de350b' : '#0052cc';
      const statusLabel = status || 'EXECUTED';

      // Build Gherkin steps section
      let stepsHtml = '';
      if (gherkinSteps && gherkinSteps.length > 0) {
        stepsHtml = `
          <h2>Test Steps</h2>
          <ac:structured-macro ac:name="code" ac:schema-version="1">
            <ac:parameter ac:name="language">gherkin</ac:parameter>
            <ac:parameter ac:name="title">Scenario: ${this.escapeHtml(scenarioName)}</ac:parameter>
            <ac:plain-text-body><![CDATA[${gherkinSteps.join('\n')}]]></ac:plain-text-body>
          </ac:structured-macro>
        `;
      }

      // Build inline screenshots section - each screenshot embedded with ac:image
      let screenshotsHtml = '';
      if (screenshotFileNames.length > 0) {
        screenshotsHtml = screenshotFileNames.map((fileName, index) => `
          <h3>Screenshot ${index + 1}: ${fileName}</h3>
          <ac:image ac:alt="${fileName}" ac:width="900">
            <ri:attachment ri:filename="${fileName}" />
          </ac:image>
          <br/>
        `).join('\n');
      } else {
        screenshotsHtml = '<p><em>No screenshots captured for this execution.</em></p>';
      }

      // Build complete page content with inline screenshots
      const newContent = `
        <ac:structured-macro ac:name="panel" ac:schema-version="1">
          <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
          <ac:parameter ac:name="titleBGColor">${statusColor}</ac:parameter>
          <ac:parameter ac:name="titleColor">#ffffff</ac:parameter>
          <ac:parameter ac:name="title">${statusLabel} - ${testCaseId}</ac:parameter>
          <ac:rich-text-body>
            <table>
              <tr><td><strong>Test Case ID</strong></td><td><code>${testCaseId}</code></td></tr>
              <tr><td><strong>Scenario</strong></td><td>${this.escapeHtml(scenarioName)}</td></tr>
              <tr><td><strong>Executed</strong></td><td>${timestamp}</td></tr>
              <tr><td><strong>Status</strong></td><td><span style="color:${statusColor};font-weight:bold;">${statusLabel}</span></td></tr>
              <tr><td><strong>Screenshots</strong></td><td>${screenshotFileNames.length} captured</td></tr>
            </table>
          </ac:rich-text-body>
        </ac:structured-macro>
        ${stepsHtml}
        <h2>Evidence Screenshots</h2>
        ${screenshotsHtml}
        <hr/>
        <ac:structured-macro ac:name="expand" ac:schema-version="1">
          <ac:parameter ac:name="title">All Attachments</ac:parameter>
          <ac:rich-text-body>
            <ac:structured-macro ac:name="attachments" ac:schema-version="1">
              <ac:parameter ac:name="upload">false</ac:parameter>
            </ac:structured-macro>
          </ac:rich-text-body>
        </ac:structured-macro>
        <p><small>Generated by E2E Automation Framework at ${timestamp}</small></p>
      `;

      // Update the page
      await this.client.put(`/content/${pageId}`, {
        id: pageId,
        type: 'page',
        title: currentPage.title,
        space: { key: this.config.spaceKey },
        body: {
          storage: {
            value: newContent,
            representation: 'storage',
          },
        },
        version: {
          number: currentVersion + 1,
          message: 'Updated with inline screenshots',
        },
      });

      logger.info(`✅ Updated page with ${screenshotFileNames.length} inline screenshot(s)`);
    } catch (error: any) {
      logger.warn(`Failed to update page with inline screenshots: ${error.message}`);
      // Page still exists with attachments, just won't have inline display
    }
  }

  /**
   * Sanitize page title to remove special characters
   */
  private sanitizeTitle(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}

export const confluenceClient = new ConfluenceClient();

