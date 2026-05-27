/**
 * General utility functions
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomEmail(domain: string = 'test.com'): string {
  return `test-${randomString(8)}@${domain}`;
}

export function randomNumber(min: number = 1000, max: number = 9999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Parse Jira key from string (accepts both "SF-520" and "@SF-520" formats)
 * @param input - Jira key with or without @ prefix
 * @returns The Jira key (e.g., "SF-520") or null if invalid format
 */
export function parseJiraKey(input: string): string | null {
  // Remove @ prefix if present
  const cleanInput = input.startsWith('@') ? input.slice(1) : input;
  
  // Match standard Jira key format: PROJECT-NUMBER (e.g., SF-520, ST-123, ABC-1)
  const match = cleanInput.match(/^([A-Z]+)-(\d+)$/);
  return match ? cleanInput : null;
}

/**
 * Extract project prefix from Jira key (e.g., "SF-520" -> "SF", "ST-241" -> "ST")
 * or from Zephyr-style scenario ids (e.g., "PP-392-API-001" -> "PP", "SF-872-UI-002" -> "SF").
 *
 * @param jiraKey - Jira key (e.g., "SF-520", "ST-241", "@SF-520") or RBT id "PP-392-API-001"
 * @returns The project prefix (e.g., "SF", "ST", "PP") or null if invalid format
 */
export function extractProjectPrefix(jiraKey: string | null): string | null {
  if (!jiraKey) return null;

  // Remove @ prefix if present
  const cleanKey = jiraKey.startsWith('@') ? jiraKey.slice(1) : jiraKey;

  // Zephyr / Cucumber: WORK-NNN-API-### or WORK-NNN-UI-###
  const rbt = cleanKey.match(/^([A-Z]+)-\d+-(?:API|UI)-\d+$/i);
  if (rbt) return rbt[1].toUpperCase();

  // Plain Jira key: SF-520, PP-392
  const match = cleanKey.match(/^([A-Z]+)-\d+$/);
  return match ? match[1].toUpperCase() : null;
}

export function extractTags(text: string): string[] {
  const tagRegex = /@[\w-]+/g;
  return text.match(tagRegex) || [];
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function formatDateTime(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

