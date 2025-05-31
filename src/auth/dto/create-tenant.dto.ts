import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsObject()
  @IsOptional()
  features?: Record<string, any>;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
