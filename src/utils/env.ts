function getEnvVar(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please set it in your environment variables (e.g., Amplify console or .env file).`
    );
  }
  return value;
}

export function validateEnvironment(): void {
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_API_TOKEN',
  ];

  const missing: string[] = [];
  for (const varName of requiredVars) {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  const chatUrl = import.meta.env['VITE_DEEPSEEK_API_URL'] || import.meta.env['VITE_LAMBDA_API_URL'];
  if (!chatUrl || chatUrl.trim() === '') {
    missing.push('VITE_DEEPSEEK_API_URL or VITE_LAMBDA_API_URL');
  }

  if (missing.length > 0) {
    const errorMessage =
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\n` +
      `Please set these variables in your environment (e.g., Amplify console or .env file).`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export const ENV = {
  API_BASE_URL: () => getEnvVar('VITE_API_BASE_URL'),
  API_TOKEN: () => getEnvVar('VITE_API_TOKEN'),
  CHAT_API_URL: () => {
    const url = import.meta.env['VITE_DEEPSEEK_API_URL'];
    if (url && url.trim() !== '') return url.trim();
    return getEnvVar('VITE_LAMBDA_API_URL');
  },
  LAMBDA_API_URL: () => ENV.CHAT_API_URL(),
  HUGGINGFACE_API_URL: () => {
    const url = import.meta.env['VITE_HUGGINGFACE_API_URL'];
    return url && url.trim() !== '' ? url : '';
  },
  HUGGINGFACE_API_KEY: () => {
    const key = import.meta.env['VITE_HUGGINGFACE_API_KEY'];
    return key && key.trim() !== '' ? key : '';
  },
  HUGGINGFACE_MODEL: () => {
    const model = import.meta.env['VITE_HUGGINGFACE_MODEL'];
    return model && model.trim() !== '' ? model : '';
  },
  GA4_MEASUREMENT_ID: () => {
    const id = import.meta.env['VITE_GA4_MEASUREMENT_ID'];
    return id && id.trim() !== '' ? id : '';
  },
  FIREBASE_API_KEY: () => {
    const key = import.meta.env['VITE_FIREBASE_API_KEY'];
    return key && key.trim() !== '' ? key : '';
  },
  FIREBASE_AUTH_DOMAIN: () => {
    const domain = import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'];
    return domain && domain.trim() !== '' ? domain : '';
  },
  FIREBASE_PROJECT_ID: () => {
    const id = import.meta.env['VITE_FIREBASE_PROJECT_ID'];
    return id && id.trim() !== '' ? id : '';
  },
  FIREBASE_STORAGE_BUCKET: () => {
    const bucket = import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'];
    return bucket && bucket.trim() !== '' ? bucket : '';
  },
  FIREBASE_MESSAGING_SENDER_ID: () => {
    const id = import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'];
    return id && id.trim() !== '' ? id : '';
  },
  FIREBASE_APP_ID: () => {
    const id = import.meta.env['VITE_FIREBASE_APP_ID'];
    return id && id.trim() !== '' ? id : '';
  },
  ADMIN_API_BASE_URL: () => {
    const url = import.meta.env['VITE_ADMIN_API_BASE_URL'];
    return url && url.trim() !== '' ? url : '';
  },
  GOOGLE_SHEETS_WEBHOOK_URL: () => {
    const url = import.meta.env['VITE_GOOGLE_SHEETS_WEBHOOK_URL'];
    return url && url.trim() !== '' ? url : '';
  },
  DAILY_RECORDS_API_URL: () => {
    const url = import.meta.env['VITE_DAILY_RECORDS_API_URL'];
    return url && url.trim() !== '' ? url : 'https://smart-track-4b7p.onrender.com/api/daily-records';
  },
  DUMMY_EMAIL: () => {
    const email = import.meta.env['VITE_DUMMY_EMAIL'];
    return email && email.trim() !== '' ? email : 'rishav@navgurukul.org';
  },
};
