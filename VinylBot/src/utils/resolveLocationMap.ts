import { getLocations } from "../services/locations.api.js";

export const resolveLocationMap = async (): Promise<Map<string, string>> => {
  const locationList = await getLocations();
  
  const locationRecord = new Map<string, string>();

  locationList.forEach(location => {
    locationRecord.set(location.name, location.id ?? "");
  });

  return locationRecord;
};