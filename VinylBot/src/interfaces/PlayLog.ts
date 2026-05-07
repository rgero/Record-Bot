export interface PlayLog {
  id?: string;
  album_id: number;
  listeners: string[];
  date: Date | null;
  album?: string;
  artist?: string;
  imageUrl?: string;
}