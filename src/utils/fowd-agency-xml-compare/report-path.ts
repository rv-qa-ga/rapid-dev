/**
 * Build unique, timestamped report file paths so each run keeps history and never
 * overwrites a previous report by accident.
 */

import * as fs from 'fs';
import * as path from 'path';

/** UTC timestamp safe for filenames on all platforms (no `:`). */
export function formatTimestampForFilename(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(
    d.getUTCMinutes(),
  )}${p(d.getUTCSeconds())}-${p(d.getUTCMilliseconds(), 3)}`;
}

export type ResolveTimestampedPathOptions = {
  /** Defaults to `new Date()`. */
  now?: Date;
};

/**
 * Given a desired path like `C:/out/compare-report.xml`, returns a path in the same
 * directory with the basename `{name}-{utcStamp}{ext}`, or `{name}-{utcStamp}-{n}{ext}`
 * if that file already exists (collision / same-ms retry).
 */
export function resolveUniqueTimestampedReportPath(
  requestedPath: string,
  options?: ResolveTimestampedPathOptions,
): string {
  const now = options?.now ?? new Date();
  const stamp = formatTimestampForFilename(now);
  const { dir, name, ext } = path.parse(requestedPath);
  const baseDir = dir || '.';

  const resolved = (suffix: string): string => {
    const mid = suffix === '' ? `${name}-${stamp}` : `${name}-${stamp}-${suffix}`;
    return path.resolve(path.join(baseDir, `${mid}${ext}`));
  };

  let candidate = resolved('');
  let n = 2;
  while (fs.existsSync(candidate)) {
    candidate = resolved(String(n));
    n += 1;
  }
  return candidate;
}
