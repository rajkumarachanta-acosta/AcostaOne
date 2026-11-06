# Acosta One validation — 27 September 2026

This revision is saved for review and is not deployed.

## Implemented

- Audit: four required reports; SP/SB/SD read from bulk workbook; metadata header detection; invalid-input messages; worker-based analysis; nine report views and matching styled Excel report model.
- Generator: product/keyword import, macro-derived keyword extraction, SP/SB/SD row generation, template-column mapping, preview and Excel preparation.
- Reset: file selections, settings, computed results and prepared downloads cleared; audit worker cancelled.
- Pulse: 15 synthetic accounts, WoW/MoM/YoY comparisons, score components, account investigation and ASIN contribution drilldown. Demo data and illustrative scoring are clearly labelled.
- Shared Acosta styling, corrected first-use tutorials, four-module mobile navigation, wrapped audit tabs.

## Automated verification

- Numerical audit core: 29 assertions.
- Audit import and engine: 22 assertions.
- Supplied sample comparison: 20 assertions (private fixture kept outside the repository).
- Generator row engine: 48 assertions.
- Keyword extraction and template mapping: 28 assertions.
- Workbook serialization, styles, numeric values, SP/SB/SD templates and product import: 47 assertions.
- Pulse logic/rendering harness: 185 assertions.
- Independent XML inspection of synthetic audit export: valid ZIP, nine sheets, styles, no error or formula cells.

## Browser verification

Verified four report uploads, nonzero audit results, all nine tab controls, audit reset, generator CSV import, title extraction, generated rows, generator reset, Pulse comparisons, account drilldown, investigation and reset. Invalid report upload showed an actionable error.

Excel generation produces a visible Save link. The browser automation download event timed out for both CSV and Excel downloads, including on the standalone generator page. Actual browser-saved files have not been verified. The export serializer was tested separately; this does not substitute for completing download verification.

## Remaining acceptance checks

- Native Excel VBA execution is unavailable here. Source-derived and supplied-output numerical checks are not proof of every VBA branch.
- The nine-sheet export follows the supplied section structure with a new clean layout; exact source cell coordinates and all narrative text are not identical to the sample.
- Generator files have not been submitted to Amazon Ads. Template-column corrections are covered by tests, not platform acceptance.
- Pulse remains a synthetic prototype, awaiting approved OE scoring and live-data requirements.
- Complete a real browser download and inspect the workbook in Excel before publication.

No uploaded client files or extracted reference data are included in public assets.
