/**
 * User Role Configuration Utility
 * 
 * Maps user role names to environment variable patterns for flexible multi-user support.
 * Supports roles like: MRD, Standard User, Non-Admin User, etc.
 * 
 * Environment Variable Pattern:
 * - SF_{ROLE}_JWT_USERNAME (preferred for JWT authentication)
 * - SF_{ROLE}_USERNAME + SF_{ROLE}_PASSWORD + SF_{ROLE}_SECURITY_TOKEN (fallback)
 * 
 * Role names are normalized (uppercase, spaces/hyphens removed) for environment variable lookup.
 * Example: "MRD" -> "SF_MRD_JWT_USERNAME", "Standard User" -> "SF_STANDARDUSER_JWT_USERNAME"
 */

import { logger } from './logger';
import { config } from '../config/config';

export interface UserRoleCredentials {
  /** JWT username (preferred method) */
  jwtUsername?: string;
  /** Username for password authentication (fallback) */
  username?: string;
  /** Password for password authentication */
  password?: string;
  /** Security token for password authentication */
  securityToken?: string;
}

/**
 * Normalize role name for environment variable lookup
 * Examples:
 * - "MRD" -> "MRD"
 * - "Standard User" -> "STANDARDUSER"
 * - "Non-Admin User" -> "NONADMINUSER"
 * - "read-only user" -> "READONLYUSER"
 */
function normalizeRoleName(role: string): string {
  return role
    .toUpperCase()
    .replace(/[\s\-_]+/g, '') // Remove spaces, hyphens, underscores
    .trim();
}

/**
 * Get credentials for a specific user role
 * @param role - User role name (e.g., "MRD", "Standard User", "Non-Admin User")
 * @returns UserRoleCredentials object with available credentials
 */
export function getUserRoleCredentials(role: string): UserRoleCredentials {
  const normalizedRole = resolveRoleName(role);
  const envName = config.getEnvironment();
  const envFileHint = `src/config/env/.env.${envName}`;

  // Try JWT username first (preferred method)
  const jwtUsernameKey = `SF_${normalizedRole}_JWT_USERNAME`;
  const jwtUsername = process.env[jwtUsernameKey];

  // Try password-based credentials (fallback)
  const usernameKey = `SF_${normalizedRole}_USERNAME`;
  const passwordKey = `SF_${normalizedRole}_PASSWORD`;
  const securityTokenKey = `SF_${normalizedRole}_SECURITY_TOKEN`;

  const username = process.env[usernameKey];
  const password = process.env[passwordKey];
  const securityToken = process.env[securityTokenKey];

  const credentials: UserRoleCredentials = {
    jwtUsername: jwtUsername,
    username: username,
    password: password,
    securityToken: securityToken,
  };

  // Log what was found
  if (jwtUsername) {
    logger.debug(`Found JWT credentials for role "${role}" (${jwtUsernameKey})`);
  } else if (username) {
    logger.debug(`Found password credentials for role "${role}" (${usernameKey})`);
  } else {
    logger.warn(
      `No credentials found for role "${role}". ` +
      `Expected environment variable: ${jwtUsernameKey} or ${usernameKey} in ${envFileHint}`
    );
  }

  return credentials;
}

/**
 * Check if credentials are available for a role
 * @param role - User role name
 * @returns true if at least one authentication method is available
 */
export function hasRoleCredentials(role: string): boolean {
  const credentials = getUserRoleCredentials(role);
  return !!(credentials.jwtUsername || credentials.username);
}

/**
 * Get all configured roles from environment variables
 * Scans for SF_*_JWT_USERNAME or SF_*_USERNAME patterns
 * @returns Array of role names found in environment
 */
export function getConfiguredRoles(): string[] {
  const roles: string[] = [];
  const envVars = Object.keys(process.env);

  // Pattern: SF_{ROLE}_JWT_USERNAME or SF_{ROLE}_USERNAME
  const rolePattern = /^SF_(.+?)_(JWT_USERNAME|USERNAME)$/;

  for (const envVar of envVars) {
    const match = envVar.match(rolePattern);
    if (match) {
      const roleName = match[1];
      // Convert back to readable format (e.g., "STANDARDUSER" -> "Standard User")
      // For now, just add the normalized name - can be enhanced later
      if (!roles.includes(roleName)) {
        roles.push(roleName);
      }
    }
  }

  return roles;
}

/**
 * Special role mappings for backward compatibility
 * Maps common role names to their environment variable patterns
 */
const ROLE_ALIASES: Record<string, string> = {
  'admin': 'ADMIN',
  'administrator': 'ADMIN',
  'standard': 'STANDARDUSER',
  'standard user': 'STANDARDUSER',
  'read-only': 'READONLYUSER',
  'readonly': 'READONLYUSER',
  'read-only user': 'READONLYUSER',
  'non-admin': 'NONADMINUSER',
  'non-admin user': 'NONADMINUSER',
  'nonadmin': 'NONADMINUSER',
  'mrd': 'MRD',
  'member relationship director': 'MRD',
  'data governance': 'DATAGOVERNANCEUSER',
  'data governance user': 'DATAGOVERNANCEUSER',
  'data steward': 'DATAGOVERNANCEUSER',
};

/**
 * Resolve role name using aliases and normalization
 * @param role - User role name (can be alias or exact name)
 * @returns Normalized role name for environment variable lookup
 */
export function resolveRoleName(role: string): string {
  const lowerRole = role.toLowerCase().trim();
  
  // Check aliases first
  if (ROLE_ALIASES[lowerRole]) {
    return ROLE_ALIASES[lowerRole];
  }
  
  // Otherwise normalize the provided role name
  return normalizeRoleName(role);
}

