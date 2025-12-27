export interface Location {
  id?: string;
  name: string;
  address: string | null;
  recommended: boolean;
  purchaseCount: number;
  notes: string | null;
}
