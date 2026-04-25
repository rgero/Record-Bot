export interface SearchResponse
{
  id?: number,
  artist: string,
  album: string;
  owners?: string[];
  searcher?: string[];
  length?: number;
}