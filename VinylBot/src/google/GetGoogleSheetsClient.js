import fs from "fs";
import { google } from "googleapis";

export const getGoogleSheetsClient = async () => {
  const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}