import { Email } from '../value-objects/email.vo';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phoneNumber?: string,
    public readonly mfaEnabled: boolean = false,
    public readonly status: string = 'active',
    public readonly passwordChangedAt: Date = new Date(),
    public readonly lastSignInAt?: Date,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email.toString();
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
