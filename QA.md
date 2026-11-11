# Verification record

Verified 11 November 2026.

## Automated

- 16 domain tests pass: `node --test core.test.js`.
- Cumulative differences, exact period containment, invalid values/dates, reset exclusion, fair ranking and JSON/CSV round trips are checked independently of the UI.
- 7 Flask/SQLite tests pass: `python -m unittest -v test_server.py`. Persistence after app recreation, rejected invalid writes, reset retention, same-origin enforcement, asset serving and private-file exclusion were checked.

## Browser checks

The common interface was exercised on WattWatch in Chrome:

- Create a block; enter a baseline and subsequent reading; calculated 30 kWh correctly.
- Reject a second reading for the same block/date, with the form and existing data preserved.
- Retain a decreasing reading as “Review reset”; editing it restores a valid interval.
- Refresh retains records. Deleting an intermediate reading recalculates the adjacent interval (60 kWh over 2 days).
- Block/period filters update dashboard and cost totals; missing boundary coverage does not receive a leaderboard rank.
- Search, navigation, saving-tip dialogs, assumptions save, block edit/delete, and empty/sample workspace flows work.
- JSON backup download restored 5 blocks / 118 readings through the file picker and replacement confirmation.
- Report and reading CSV downloads were created and parsed successfully.
- 390 × 844 mobile viewport: no page-wide horizontal overflow; navigation opens/closes, register scrolls within its panel, and reading dialog fits the viewport (356 px).
- No browser console errors observed during the checked app flows.

HostelWatt was separately opened, its identity and leaderboard verified, its tariff changed and retained after reload, then its sample workspace restored. Both apps share the tested calculation and interaction code, with independent storage keys and app configuration.

The SQLite-backed UI was also opened, its tariff changed to 8.25 and retained after reload. Its sample state was restored afterward.
