/**
 * Sorting, deduplication, and shared helpers for QA Deferred items.
 */

import type { DeferredItem, SortField } from './model';

/**
 * Sort items by a given field. Defaults to date_raised descending.
 */
export function sortItems(
  items: DeferredItem[],
  sortBy: SortField = 'date_raised',
  ascending = false,
): DeferredItem[] {
  const sorted = [...items].sort((a, b) => {
    let cmp: number;
    switch (sortBy) {
      case 'date_raised':
        cmp = a.dateRaised.localeCompare(b.dateRaised);
        break;
      case 'area':
        cmp = a.area.localeCompare(b.area);
        break;
      case 'decision':
        cmp = a.decision.localeCompare(b.decision);
        break;
      case 'jira_key':
        cmp = compareJiraKeys(a.jiraKey, b.jiraKey);
        break;
      default:
        cmp = 0;
    }
    return cmp;
  });

  return ascending ? sorted : sorted.reverse();
}

/**
 * Natural sort for Jira keys: alphabetical on project, numeric on number.
 * e.g. SF-5 < SF-12 < SF-100 < ZZ-1
 */
function compareJiraKeys(a: string, b: string): number {
  const partsA = a.match(/^([A-Z]+)-(\d+)$/);
  const partsB = b.match(/^([A-Z]+)-(\d+)$/);

  if (!partsA || !partsB) return a.localeCompare(b);

  const projectCmp = partsA[1].localeCompare(partsB[1]);
  if (projectCmp !== 0) return projectCmp;

  return parseInt(partsA[2], 10) - parseInt(partsB[2], 10);
}

/**
 * Deduplicate items by jira_key, keeping the last occurrence (newest input wins).
 */
export function dedupeByJiraKey(items: DeferredItem[]): DeferredItem[] {
  const seen = new Map<string, DeferredItem>();
  for (const item of items) {
    seen.set(item.jiraKey, item);
  }
  return Array.from(seen.values());
}

/**
 * Merge new items into existing items, deduplicating by jira_key.
 * New items overwrite existing ones with the same key.
 */
export function mergeItems(
  existing: DeferredItem[],
  incoming: DeferredItem[],
  dedupe: boolean,
): DeferredItem[] {
  const combined = [...existing, ...incoming];
  return dedupe ? dedupeByJiraKey(combined) : combined;
}
