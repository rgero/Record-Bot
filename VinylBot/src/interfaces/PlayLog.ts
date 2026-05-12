export interface PlayLog {
  id?: number;
  album_id: number;
  listeners: string[];
  date: Date | null;
  album?: string;
  artist?: string;
  imageUrl?: string;
}