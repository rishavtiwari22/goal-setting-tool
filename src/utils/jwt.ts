interface JWTPayload {
  email?: string;
  [key: string]: any;
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.error('Invalid JWT format: must have 3 parts');
      return null;
    }

    const payload = parts[1];
    
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export function getEmailFromJWT(token: string): string | null {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return null;
  }

  if (!payload.email) {
    console.error('JWT payload does not contain an email field');
    return null;
  }

  return payload.email;
}

export function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  return parts.length === 3;
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return true;
  }
  
  if (!payload.exp) {
    return false;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

export function isTokenValid(token: string | null): boolean {
  if (!token) {
    return false;
  }
  
  if (!isValidJWTFormat(token)) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    return false;
  }
  
  return true;
}