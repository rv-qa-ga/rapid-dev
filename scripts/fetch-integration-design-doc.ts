/**
 * Fetch Integration Design Document from Confluence
 * Page ID: 2702114824
 * URL: https://accelins.atlassian.net/wiki/spaces/SA/pages/2702114824/Integration+Design+Document
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.qa file (check multiple locations)
const envPaths = [
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(process.cwd(), '.env.qa'),
  path.resolve(process.cwd(), 'src/config/env/.env.qa'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`📋 Loaded environment from: ${path.relative(process.cwd(), envPath)}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  // Fallback to .env if .env.qa doesn't exist
  dotenv.config();
  console.log(`📋 Loaded default .env file`);
}

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';
const PAGE_ID = '2702114824';
const SPACE_KEY = 'SA';

async function fetchIntegrationDesignDoc() {
  console.log('\n📖 Fetching Integration Design Document from Confluence');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    console.error('   Set these in your .env file or environment variables');
    process.exit(1);
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  const client = axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  try {
    console.log(`📄 Fetching page ID: ${PAGE_ID}`);
    console.log(`   Space: ${SPACE_KEY}`);
    console.log(`   URL: ${CONFLUENCE_BASE_URL}/spaces/${SPACE_KEY}/pages/${PAGE_ID}\n`);

    // Fetch page content
    const response = await client.get(`/content/${PAGE_ID}`, {
      params: {
        expand: 'body.storage,version,space,metadata.labels',
      },
    });

    const page = response.data;
    
    console.log(`✅ Successfully fetched page:`);
    console.log(`   Title: ${page.title}`);
    console.log(`   Version: ${page.version.number}`);
    console.log(`   Space: ${page.space.name} (${page.space.key})`);
    console.log(`   URL: ${page._links.webui}\n`);

    // Extract content
    const htmlContent = page.body.storage.value;
    
    // Convert HTML to markdown-like text (basic conversion)
    let markdownContent = htmlContent
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<table[^>]*>/gi, '\n')
      .replace(/<\/table>/gi, '\n')
      .replace(/<tr[^>]*>/gi, '')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ')
      .replace(/<th[^>]*>(.*?)<\/th>/gi, '| **$1** ')
      .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();

    // Save to file
    const outputDir = path.join(process.cwd(), 'docs', 'confluence');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'integration-design-document.md');
    const fullContent = `# ${page.title}

**Source:** [Confluence Page](${page._links.webui})  
**Page ID:** ${PAGE_ID}  
**Space:** ${page.space.name} (${page.space.key})  
**Version:** ${page.version.number}  
**Fetched:** ${new Date().toISOString()}

---

${markdownContent}
`;

    fs.writeFileSync(outputPath, fullContent, 'utf-8');
    console.log(`📄 Content saved to: ${outputPath}`);

    // Also save raw HTML for reference
    const htmlPath = path.join(outputDir, 'integration-design-document.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log(`📄 Raw HTML saved to: ${htmlPath}\n`);

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Title: ${page.title}`);
    console.log(`Content length: ${markdownContent.length} characters`);
    console.log(`Lines: ${markdownContent.split('\n').length}`);
    console.log(`\n✅ Document fetched successfully!\n`);

    return {
      title: page.title,
      content: markdownContent,
      html: htmlContent,
      url: page._links.webui,
    };

  } catch (error: any) {
    if (error.response) {
      console.error(`❌ Error: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      if (error.response.status === 401) {
        console.error('\n   Authentication failed. Please check:');
        console.error('   - ATLASSIAN_EMAIL is set correctly');
        console.error('   - ATLASSIAN_API_TOKEN is valid');
      } else if (error.response.status === 404) {
        console.error(`\n   Page not found. Please verify page ID: ${PAGE_ID}`);
      }
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Main execution
fetchIntegrationDesignDoc().catch(console.error);

