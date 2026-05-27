import { logger } from './logger';
import { config } from '../config/config';

export interface SalesforceUserProfileInfo {
  userId: string;
  profileId: string;
  profileName: string;
}

export class SalesforceUserService {
  static async fetchUserProfile(
    accessToken: string,
    instanceUrl: string,
    username: string
  ): Promise<SalesforceUserProfileInfo | null> {
    const apiVersion = config.getSalesforceConfig().apiVersion || 'v60.0';
    const sanitizedUsername = username.replace(/'/g, "\\'");
    const query = `SELECT Id, ProfileId, Profile.Name FROM User WHERE Username = '${sanitizedUsername}' LIMIT 1`;
    const url = `${instanceUrl}/services/data/${apiVersion}/query/?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`Failed to fetch Salesforce user profile: ${errorText}`);
        return null;
      }

      const data: any = await response.json();
      const record = data.records?.[0];
      if (!record) {
        logger.warn(`No Salesforce user found for username ${username}`);
        return null;
      }

      return {
        userId: record.Id,
        profileId: record.ProfileId,
        profileName: record.Profile?.Name || 'Unknown',
      };
    } catch (error: any) {
      logger.warn(`Error retrieving Salesforce user profile: ${error.message}`);
      return null;
    }
  }
}

