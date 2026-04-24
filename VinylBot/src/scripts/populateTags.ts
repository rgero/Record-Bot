import { Vinyl } from "../interfaces/Vinyl";
import { fileURLToPath } from "node:url";
import fs from 'node:fs';
import { parse } from "csv-parse/sync";
import supabase from "../services/supabase";

interface TaggedVinyl {
  id: number,
  artist: string,
  album: string,
  tags: string[]
}

const getDataFromFile = (filePath: string): TaggedVinyl[] => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        if (context.column === 'id') return Number(value);
        
        if (context.column === 'tags') {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        }
        return value;
      }
    });

    return records as TaggedVinyl[];
  } catch (err) {
    console.error("Error parsing vinyl CSV:", err);
    return [];
  }
};

export const getAlbumsToUpdate = async (): Promise<TaggedVinyl[]> => {
  const { data: albums, error } = await supabase.from("vinyls").select("id, artist, album, tags");

  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  const albumsToFix = albums?.filter( (album) => !album.tags || album.tags.length === 0 );

  if (!albumsToFix || albumsToFix.length === 0) {
    console.log("All albums are already tagged.");
    return [];
  }

  return albumsToFix;
};

const processUpdate = async (vinylsToFix: TaggedVinyl[], updateData: TaggedVinyl[]) => {
  const updateMap = new Map(updateData.map(item => [item.id, item.tags]));
  let updateCount = 0;
  for (const album of vinylsToFix) {
    const newTags = updateMap.get(album.id);

    if (newTags) {
      const { error } = await supabase
        .from("vinyls")
        .update({ tags: newTags }) // Only update the tags field
        .eq("id", album.id); // Strictly match the existing ID

      if (error) {
        console.error(`Failed to update album ${album.id}:`, error.message);
      } else {
        updateCount++;
      }
    }
  }

  console.log(`Process complete. Updated ${updateCount} existing records.`);
};

const updateAlbumTagsProcess = async () => {
  const data = getDataFromFile(process.argv[2])
  if (!data)
  {
    throw new Error("Failed to get data from file");
  }

  const vinylsToFix = await getAlbumsToUpdate();
  if (vinylsToFix.length == 0)
  {
    return;
  }

  await processUpdate(vinylsToFix, data);

}


if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateAlbumTagsProcess().catch(console.error);
}