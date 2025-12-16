export interface User {
  user_id: string;
  email: string;
  name?: string;
}

export interface UserCheckResponse {
  exists: boolean;
  user?: User;
}
