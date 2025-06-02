import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  validateSync,
  IsOptional,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_KEY: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN: string;

  @IsOptional()
  @IsNumber()
  PORT: number;

  @IsOptional()
  @IsNumber()
  THROTTLE_TTL: number;

  @IsOptional()
  @IsNumber()
  THROTTLE_LIMIT: number;

  @IsOptional()
  @IsBoolean()
  AUDIT_ENABLED: boolean;

  @IsOptional()
  @IsString()
  AUDIT_SCHEMA: string;
}

export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
