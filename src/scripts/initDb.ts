import dotenv from "dotenv"; dotenv.config();
import { openDb, initDb } from "../db/index.js";

const url = process.env.DATABASE_URL || "file:./data/ais.db";
const db = openDb(url);
initDb(db);
console.log("DB initialized at", url);
