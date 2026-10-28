/**
 * PrepPressure Configuration
 * Environment variables configuration matching Specification Section 9
 */

export interface AppConfig {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: number;
  mongoUri: string;
  corsOrigin: string;
}

export function parseDuration(val?: string): number {
  if (!val) return 3600;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  const match = val.trim().match(/^(\d+)([smhd])$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === 's') return num;
    if (unit === 'm') return num * 60;
    if (unit === 'h') return num * 3600;
    if (unit === 'd') return num * 86400;
  }
  return 3600;
}

export const configuration = (): AppConfig => ({
  port: 3000,
  jwtSecret: process.env.JWT_SECRET || 'preppressure_ultra_secure_jwt_secret_key_v3_frozen',
  jwtExpiresIn: parseDuration(process.env.JWT_EXPIRES_IN),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/AceUp',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
});
