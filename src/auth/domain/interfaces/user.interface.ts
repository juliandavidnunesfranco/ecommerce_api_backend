export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  mfaEnabled: boolean;
  status: string;
  passwordChangedAt: Date;
  lastSignInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  hashedPassword: string;
}
