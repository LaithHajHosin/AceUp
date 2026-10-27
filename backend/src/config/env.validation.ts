export interface ValidatedEnv {
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  CORS_ORIGIN: string;
}

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  const mongodbUri =
    typeof config.MONGODB_URI === 'string' ? config.MONGODB_URI.trim() : '';
  if (!mongodbUri) {
    throw new Error('Missing required environment variable: MONGODB_URI');
  }

  const jwtSecret =
    typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET.trim() : '';
  if (!jwtSecret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  const jwtExpiresIn =
    typeof config.JWT_EXPIRES_IN === 'string' &&
    config.JWT_EXPIRES_IN.trim().length > 0
      ? config.JWT_EXPIRES_IN.trim()
      : '1h';

  const rawPort = config.PORT !== undefined ? Number(config.PORT) : 3000;
  if (!Number.isInteger(rawPort) || rawPort <= 0) {
    throw new Error('Invalid environment variable: PORT must be a positive integer');
  }

  const corsOrigin =
    typeof config.CORS_ORIGIN === 'string' &&
    config.CORS_ORIGIN.trim().length > 0
      ? config.CORS_ORIGIN.trim()
      : 'http://localhost:5173';

  return {
    MONGODB_URI: mongodbUri,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    PORT: rawPort,
    CORS_ORIGIN: corsOrigin,
  };
}
