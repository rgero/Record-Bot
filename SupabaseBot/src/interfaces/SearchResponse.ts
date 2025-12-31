export interface SearchResponse
{
  id?: string,
  artist: string,
  album: string;
  owner?: string[];
  searcher?: string[];
}