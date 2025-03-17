export interface Listing {
  id: string;
  title: string;
  userId?: string;
  createdAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
} 