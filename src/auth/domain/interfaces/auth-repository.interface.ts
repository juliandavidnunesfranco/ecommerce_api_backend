import type { IUser } from './user.interface';
import { ITenant } from './tenant.interface';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<IUser | null>;
  createUser(userData: CreateUserData): Promise<IUser>;
  updateLastSignIn(userId: string): Promise<void>;
  getUserTenants(userId: string): Promise<ITenant[]>;
  createTenant(tenantData: CreateTenantData): Promise<ITenant>;
  associateUserToTenant(userId: string, tenantId: string): Promise<void>;
  createTenantSchema(tenantId: string): Promise<void>;
  assignAdminRole(userId: string, tenantId: string): Promise<void>;
}

export interface CreateUserData {
  email: string;
  hashedPassword: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface CreateTenantData {
  name: string;
  slug: string;
  features?: Record<string, any>;
  settings?: Record<string, any>;
}
