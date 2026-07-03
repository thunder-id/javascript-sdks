import {User} from '../models/user';

/**
 * Generates a flattened user profile by returning the user profile as-is.
 *
 * @param meResponse - The response object containing user data
 * @param _processedSchemas - Deprecated/unused schemas parameter
 * @returns The user profile object
 */
const generateFlattenedUserProfile = (meResponse: any, _processedSchemas?: any[]): User => {
  return {...meResponse};
};

export default generateFlattenedUserProfile;
