export class Tenant {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly features: Record<string, any> = {},
    public readonly settings: Record<string, any> = {},
    public readonly status: string = 'active',
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  isActive(): boolean {
    return this.status === 'active';
  }

  hasFeature(featureName: string): boolean {
    return this.features[featureName] === true;
  }
}
