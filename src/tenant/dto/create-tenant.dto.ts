import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
} from 'class-validator';

export enum ServiceType {
  MARKETPLACE = 'marketplace',
  LOGISTICS = 'logistics',
  MARKETING = 'marketing',
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @IsObject()
  @IsOptional()
  features?: Record<string, boolean>;
}
