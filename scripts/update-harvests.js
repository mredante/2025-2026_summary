#!/usr/bin/env node
// Fetches FY26 harvest records from Airtable and bakes them into index.html.
// Run locally:  AIRTABLE_API_KEY=your_key node scripts/update-harvests.js
// Run via CI:   key is read from AIRTABLE_API_KEY environment variable

const fs    = require('fs');
const https = require('https');
const path  = require('path');

const BASE_ID   = 'appdMtv53nEmh7D02';
const TABLE_ID  = 'tblDHK8Hi2nlbY8SF';
const API_KEY   = process.env.AIRTABLE_API_KEY;
const HTML_FILE = path.join(__dirname, '..', 'index.html');

if (!API_KEY) {
  console.error('Error: AIRTABLE_API_KEY environment variable is not set');
  process.exit(1);
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
function get(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// ── Fetch all FY26 records (handles pagination) ──────────────────────────────
async function fetchRecords() {
  const filter = encodeURIComponent('SEARCH("FY 26",ARRAYJOIN({NEFF FY},","))');
  let records = [], offset = null;
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${filter}${offset ? '&offset=' + offset : ''}`;
    const data = await get(url, { Authorization: `Bearer ${API_KEY}` });
    if (data.error) throw new Error('Airtable error: ' + JSON.stringify(data.error));
    records = records.concat(data.records || []);
    offset = data.offset || null;
  } while (offset);
  return records;
}

// ── Safe numeric value (handles Airtable formula special values) ─────────────
function num(v) {
  if (v == null || (typeof v === 'object' && v.specialValue)) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let html = fs.readFileSync(HTML_FILE, 'utf8');

  // Locate the HARVESTS array by its unique surrounding markers
  const START_MARKER = 'const HARVESTS = ';
  const END_MARKER   = '\nconst ACTIVITIES = [';
  const si = html.indexOf(START_MARKER);
  const ei = html.indexOf(END_MARKER);
  if (si < 0 || ei < 0) throw new Error('Could not locate HARVESTS array in index.html');

  // Parse the array (valid JS with unquoted keys — use Function safely)
  const arrayStr = html.slice(si + START_MARKER.length, ei).trimEnd().replace(/;$/, '');
  const harvests = Function('return ' + arrayStr)();

  // Fetch from Airtable
  console.log('Fetching Airtable FY26 harvest records...');
  const records = await fetchRecords();
  console.log(`  ${records.length} records returned`);

  // Merge financial and acreage fields into the harvests array
  let count = 0;
  records.forEach(rec => {
    const f    = rec.fields;
    const name = (f['Name (from Woodlot)'] || [])[0];
    if (!name) return;
    const h = harvests.find(x => x.name === name);
    if (!h) return;

    // Gross stumpage — actual only, no estimate fallback
    const grossActual = num(f['Gross Stumpage (actual)']);
    if (grossActual != null) h.gross = grossActual;

    // Cost fields — 0 is a valid value
    if ('Forester Fee $'                    in f) h.foresterFee  = num(f['Forester Fee $'])                    ?? 0;
    if ('Road work'                         in f) h.roadWork      = num(f['Road work'])                         ?? 0;
    if ('Invasives cost'                    in f) h.invasives     = num(f['Invasives cost'])                    ?? 0;
    if ('Other cost'                        in f) h.other         = num(f['Other cost'])                        ?? 0;
    if ('TOTAL overhead'                    in f) h.totalOverhead = num(f['TOTAL overhead'])                    ?? 0;

    // Calculated fields
    if ('Net stumpage (actual)'             in f) h.net           = num(f['Net stumpage (actual)']);
    if ('$ per ac value (net)'              in f) h.netPerAc      = num(f['$ per ac value (net)']);
    if ('Total cds/ac harvested (actual)'   in f) h.cordsPerAc    = num(f['Total cds/ac harvested (actual)']);
    if ('Total cds harvested (actual)'      in f) h.totalCords    = num(f['Total cds harvested (actual)']);
    if ('Harvested acres'                   in f) h.acres         = num(f['Harvested acres']);

    count++;
  });

  console.log(`  Matched and updated ${count} harvests`);

  // Replace the array in the HTML and write back
  const newHtml =
    html.slice(0, si + START_MARKER.length) +
    JSON.stringify(harvests, null, 2) +
    ';' +
    html.slice(ei);

  fs.writeFileSync(HTML_FILE, newHtml, 'utf8');
  console.log('index.html updated successfully');
}

main().catch(e => { console.error(e.message); process.exit(1); });
