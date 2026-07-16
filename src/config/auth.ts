import { ENV } from '../utils/env';

/**
 * Returns the currently authenticated user's email.
 * Currently uses a hardcoded dummy email until real authentication is implemented.
 */
export const getCurrentUserEmail = (): string => {
  // TODO: Swap this out for the real logged-in user's email when auth is ready.
  return ENV.DUMMY_EMAIL();
};
