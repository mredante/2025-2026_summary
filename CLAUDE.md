# NEFF 2025–26 Harvest & Non-Commercial Report

## What this is
A static HTML dashboard (`index.html`) reporting timber harvests and non-commercial forestry activities for the New England Forestry Foundation (NEFF) FY 2025–26.

## Files
- `index.html` — the full dashboard (single file, ~567 lines)
- `robots.txt` — standard robots file

## GitHub repo
`https://github.com/mredante/2025-2026_summary.git` (private)

## Airtable integration
- **Base ID:** `appdMtv53nEmh7D02`
- **Timber Harvests table ID:** `tblDHK8Hi2nlbY8SF`
- **Woodlots table ID:** `tbl8vG7I0kDbvRiq1`
- **Non-commercial activities table ID:** `tblxI48011oNYZc8X`
- The API key is stored directly in `index.html` (line ~570) — flagged by GitHub push protection
- On page load, `syncAirtableHarvests()` fetches FY 26 records and updates dollar/acreage fields in the hardcoded `HARVESTS` array

## Data structure
- `HARVESTS` — hardcoded array of 15 timber harvest objects (id, name, state, season, status, acres, gross, net, overhead fields, cords, forester, logger, notes)
- `ACTIVITIES` — hardcoded array of non-commercial investment activities (not yet synced from Airtable)
- Airtable sync updates only: `gross`, `foresterFee`, `roadWork`, `invasives`, `other`, `totalOverhead`, `net`, `netPerAc`, `cordsPerAc`, `totalCords`, `acres`
- Non-synced fields (still hardcoded): `season`, `status`, `forester`, `logger`, `notes`, `postHarvest`, `state`

## Known issues / future work
- API key is exposed in browser source — need to proxy via Vercel or Cloudflare Pages serverless function
- New harvests added in Airtable won't appear automatically (HARVESTS array is hardcoded)
- ACTIVITIES array is not yet synced from Airtable
- Hosting: looking at Vercel or Cloudflare Pages (Netlify credits exhausted)
