/**
 * Auto-translation script (build-time).
 *
 * Reads `en.ts` (the key registry) and automatically translates any NEW or
 * still-English keys into all supported languages using Google's free
 * translate endpoint. Existing translations are preserved byte-for-byte.
 *
 * Usage:
 *   npm run i18n:translate
 *
 * Add a new feature with English strings -> add them to en.ts -> run the
 * script -> every language file is updated automatically.
 */
const fs = require('fs');
const path = require('path');

const LANGS = ['hi', 'mr', 'pa', 'te', 'ta', 'ml', 'kn', 'bn', 'gu', 'as', 'or', 'ur'];
const DIR = path.join(__dirname, '..', 'src', 'i18n', 'translations');
const EN_FILE = path.join(DIR, 'en.ts');
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const REQUEST_DELAY_MS = 150;
const MAX_ATTEMPTS = 3;

function readEntries(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /^\s*(?:["']((?:\\.|[^"'\n])*)["']|([A-Za-z_$][\w$]*))\s*:\s*["']((?:\\.|[^"'\n])*)["'],?\s*$/gm;
  const entries = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    entries.push({ key: m[1] || m[2], value: m[3] });
  }
  return entries;
}

/** Emits a TS string literal that reproduces the SAME runtime string as the
 *  raw source text `raw` (which may contain escape sequences like \n). */
function tsLiteralFromSource(raw) {
  return "'" + raw.replace(/\\'/g, "\\'") + "'";
}

/** Emits a TS string literal for an actual JS string `value`. */
function tsLiteralFromValue(value) {
  return "'" + String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    + "'";
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

async function translateOne(text, targetLang) {
  const placeholders = [];
  let safe = String(text);
  safe = safe.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match) => {
    const token = `\u27E6${placeholders.length}\u27E7`;
    placeholders.push(match);
    return token;
  });
  safe = safe.split('\\n').join('\u27E6NL\u27E7').split('\n').join('\u27E6NL\u27E7');

  const url = `${ENDPOINT}?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(safe)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  let out = '';
  if (Array.isArray(data) && Array.isArray(data[0])) {
    out = data[0].map((seg) => (Array.isArray(seg) && seg[0]) || '').join('');
  }
  out = out.split('\u27E6NL\u27E7').join('\n');
  placeholders.forEach((original, i) => {
    out = out.split(`\u27E6${i}\u27E7`).join(original);
  });
  return out;
}

async function translateWithRetry(text, targetLang) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await translateOne(text, targetLang);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS * attempt));
    }
  }
  return text;
}

async function main() {
  if (!fs.existsSync(EN_FILE)) {
    console.error(`en.ts not found at ${EN_FILE}`);
    process.exit(1);
  }

  const enEntries = readEntries(EN_FILE);
  const enMap = new Map(enEntries.map((e) => [e.key, e.value]));

  for (const lang of LANGS) {
    const file = path.join(DIR, `${lang}.ts`);
    if (!fs.existsSync(file)) {
      console.warn(`Skipping missing ${file}`);
      continue;
    }
    const existing = readEntries(file);
    const existingMap = new Map(existing.map((e) => [e.key, e.value]));

    // Keys that need translation: only those MISSING from the language file.
    // (Existing translated values — including intentionally-English values like
    //  N/A or bank names — are preserved as-is.)
    const pending = enEntries.filter(({ key }) => {
      const cur = existingMap.get(key);
      return cur === undefined;
    });

    if (pending.length === 0) {
      console.log(`${lang}: up to date (${existing.length} keys)`);
      continue;
    }

    console.log(`${lang}: translating ${pending.length} new key(s)...`);
    const newLines = [];
    const failures = [];
    for (const { key, value } of pending) {
      try {
        const translated = await translateWithRetry(value, lang);
        newLines.push(`  ${tsLiteralFromSource(key)}: ${tsLiteralFromValue(translated)},`);
        console.log(`  [${lang}] ${value} -> ${translated}`);
      } catch (err) {
        failures.push(key);
        console.warn(`  [${lang}] FAILED: ${value} (${err.message})`);
      }
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }

    if (newLines.length === 0) {
      console.log(`${lang}: no keys translated (${failures.length} failed)`);
      continue;
    }

    // Append the new entries just before the closing `};` of the object.
    // IMPORTANT: search only the region BEFORE the export statements so we never
    // match the `};` inside `export { lang };`.
    let src = fs.readFileSync(file, 'utf8');
    const exportIdx = src.indexOf('export default');
    const searchRegion = exportIdx === -1 ? src : src.slice(0, exportIdx);
    const closingIdx = searchRegion.lastIndexOf('};');
    if (closingIdx === -1) {
      console.error(`${lang}: could not find closing brace, skipping write`);
      continue;
    }
    const head = src.slice(0, closingIdx);
    const tail = src.slice(closingIdx);
    const insertion = head.endsWith('\n') ? '' : '\n';
    src = head + insertion + newLines.join('\n') + '\n' + tail;
    fs.writeFileSync(file, src, 'utf8');
    console.log(`${lang}: wrote ${newLines.length} translations (${failures.length} failed)`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
