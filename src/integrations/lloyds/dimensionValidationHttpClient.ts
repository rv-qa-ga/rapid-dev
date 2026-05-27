/**
 * HTTP client for Lloyd's `func-dimension-validation` (PP-429 / Stage 2.2).
 *
 * Configure `LLOYDS_DIMENSION_VALIDATION_BASE_URL` to the full trigger URL (including any
 * `?code=` query string if you use that model). Optional `LLOYDS_DIMENSION_VALIDATION_FUNCTION_KEY`
 * sends `x-functions-key` when the function is key-protected.
 */

export type DimensionValidationPostResult = {
  status: number;
  bodyText: string;
  json: Record<string, unknown> | null;
};

function normaliseBaseUrl(raw: string): string {
  const t = raw.trim();
  if (!t) throw new Error('Empty dimension validation base URL');
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
}

export function getLloydsDimensionValidationBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const u = env.LLOYDS_DIMENSION_VALIDATION_BASE_URL?.trim();
  return u ? normaliseBaseUrl(u) : null;
}

export function isLloydsDimensionValidationHttpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getLloydsDimensionValidationBaseUrl(env));
}

/**
 * POST JSON to the configured dimension validation endpoint.
 * @param omitAuth when true, do not send `x-functions-key` (for negative security tests).
 */
export async function postDimensionValidationJson(
  body: Record<string, unknown>,
  options?: { omitAuth?: boolean; env?: NodeJS.ProcessEnv },
): Promise<DimensionValidationPostResult> {
  const env = options?.env ?? process.env;
  const url = getLloydsDimensionValidationBaseUrl(env);
  if (!url) {
    throw new Error('LLOYDS_DIMENSION_VALIDATION_BASE_URL is not set');
  }
  const key = env.LLOYDS_DIMENSION_VALIDATION_FUNCTION_KEY?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (key && !options?.omitAuth) {
    headers['x-functions-key'] = key;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const bodyText = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      json = parsed as Record<string, unknown>;
    }
  } catch {
    /* leave json null */
  }
  return { status: res.status, bodyText, json };
}
