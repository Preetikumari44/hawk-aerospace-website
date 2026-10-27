# Seed data

These values are the static data the original Sales Aggregator already shipped
(`src/data/*.js`, plus the profile that was hard-coded in the Account screen).
The original project had **no backend calls**, so there was no real API to preserve.

Nothing in the UI imports this folder. Only the files in `services/` do. When the real
backend is available, replace the body of each service function with a call through
`lib/http.ts` — no component changes needed.
