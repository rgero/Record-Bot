export interface Location {
  id?: string;
  name: string;
  address: string | null;
  recommended: boolean|null;
  purchaseCount: number;
  notes: string | null;
}
