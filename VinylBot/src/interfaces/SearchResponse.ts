export interface SearchResponse
{
  id?: string,
  artist: string,
  album: string;
  owners?: string[];
  searcher?: string[];
}