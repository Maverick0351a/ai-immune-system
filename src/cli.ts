#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { runPipeline } from "./pipeline/core.js";

const args = process.argv.slice(2);
let file: string | undefined;
let schemaPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-f" || args[i] === "--file") file = args[++i];
  if (args[i] === "--schema") schemaPath = args[++i];
}

if (!file) {
  console.error("Usage: ais -f <jsonFile> [--schema <schemaFile>]");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(file), "utf-8");
const schema = schemaPath ? JSON.parse(fs.readFileSync(path.resolve(schemaPath), "utf-8")) : undefined;

const out = await runPipeline(raw, schema, { coerce: true, dropUnknown: true, redactPaths: [], disableLLM: false });
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 2);
