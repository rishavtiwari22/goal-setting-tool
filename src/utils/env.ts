function getEnvVar(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please set it in your .env file or environment.`
    );
  }
  return value;
}

export function validateEnvironment(): void {
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_API_TOKEN',
    'VITE_HUGGINGFACE_API_URL',
  ];

  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const errorMessage = 
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please create a .env file with these variables. See .env.example for reference.`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export const ENV = {
  API_BASE_URL: () => getEnvVar('VITE_API_BASE_URL'),
  API_TOKEN: () => getEnvVar('VITE_API_TOKEN'),
  HUGGINGFACE_API_URL: () => getEnvVar('VITE_HUGGINGFACE_API_URL'),
  HUGGINGFACE_API_KEY: () => {
    const key = import.meta.env['VITE_HUGGINGFACE_API_KEY'];
    return key && key.trim() !== '' ? key : '';
  },
  HUGGINGFACE_MODEL: () => {
    const model = import.meta.env['VITE_HUGGINGFACE_MODEL'];
    return model && model.trim() !== '' ? model : '';
  },
};
