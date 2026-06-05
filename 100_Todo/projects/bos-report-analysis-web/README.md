# BOS Report Analysis Web

Static Netlify frontend plus Google Apps Script backend for collecting BOS Summary data.

## Source Excel Mapping

- Input range: `Summary!B2:F6`
- Columns: `Sort`, `Part Quantity`, `FMD Applying`, `FMD Released`, `Approved`
- Rows: `ME Single`, `Packing Single`, `Assy`, `Total`
- Stored backend shape: one project per row, grouped by `ME Single`, `Packing Single`, `Assembly`, and `Total`; each group contains `Part Quality`, `FMD Applying`, `FMD Released`, and `Approved`.
- Graphic rule: render `FMD Applying / Part Quantity`, `FMD Released / Part Quantity`, and `Approved / Part Quantity` for each row. Project-level pie charts use each project's `Total` values against the all-project `Part Quality` total.

## Folders

- `frontend/`: Netlify static site.
- `apps-script/`: Google Apps Script Web App backend.

## Deployment Notes

Production frontend:

- Netlify: `https://bos-report-analysis-web.netlify.app`

Production backend:

- Google Apps Script Web App URL is configured in `frontend/app.js`.
- Clasp script ID is stored in `apps-script/.clasp.json`.

Update flow:

1. In `apps-script/`, run `npx @google/clasp push --force`.
2. If backend behavior changed, update the existing Web App deployment with `npx @google/clasp deploy --deploymentId <deployment-id> --description "<description>"`.
3. In `frontend/`, run `netlify deploy --dir . --prod`.
4. Verify the production URL and the Apps Script `action=list` endpoint.
