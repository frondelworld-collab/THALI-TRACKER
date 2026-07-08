const fs = require('fs');
let code = fs.readFileSync('db/seed.ts', 'utf-8');
code = code.replace(/(protein|carbs|fats|fiber|sugar):\s*"([0-9.]+)"/g, '$1: $2');
code = code.replace(/from "\.\.\/api\/queries\/connection"/, 'from "../api/queries/connection.js"');
code = code.replace(/from "\.\/schema"/, 'from "./schema.js"');
fs.writeFileSync('db/seed.ts', code);
