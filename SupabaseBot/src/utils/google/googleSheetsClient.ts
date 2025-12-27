import dotenv from "dotenv";
import { google } from "googleapis";
import path from "node:path";

dotenv.config();

if (!process.env.SPREADSHEET_ID) {
  throw new Error("SPREADSHEET_ID env var is required");
}

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), "service-account.json");

const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

export const sheets = google.sheets({ version: "v4", auth });
export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;