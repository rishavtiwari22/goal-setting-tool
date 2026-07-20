import { getEmailFromJWT } from "../utils/jwt";
import { ENV } from "../utils/env";

export const getCurrentUserEmail = (): string => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    const email = getEmailFromJWT(token);
    if (email) return email;
  }
  return ENV.DUMMY_EMAIL(); // fallback if not logged in
};
