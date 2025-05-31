export interface ITenant {
  id: string;
  name: string;
  slug: string;
  features?: Record<string, any>;
  settings?: Record<string, any>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
