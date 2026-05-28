# Acoustic Escalation Dashboard

Live weekly escalation trend report — hosted on GitHub Pages, updated from a Zendesk `.xlsx` export.

## Quick start

### 1. Create the repo and enable GitHub Pages

```bash
git init escalation-dashboard
cd escalation-dashboard
# copy all files here
git add .
git commit -m "init: escalation dashboard"
git remote add origin https://github.com/<your-org>/escalation-dashboard.git
git push -u origin main
```

In GitHub → Settings → Pages → Source: **Deploy from branch** → `main` → `/ (root)`.

Your site will be live at: `https://<your-org>.github.io/escalation-dashboard/`

---

### 2. Weekly update (2 minutes)

Each week when you have a new Zendesk export:

```bash
# 1. Install dependencies (first time only)
pip install -r tools/requirements.txt

# 2. Run the data ingester
python tools/format_data.py /path/to/Zendesk_export.xlsx

# 3. Push — GitHub Pages auto-deploys
git add data/latest.json
git commit -m "data: $(date +%Y-%m-%d)"
git push
```

The site refreshes automatically. No build step, no CI needed for basic updates.

---

### 3. GitHub Actions (optional — update from GitHub UI)

If you don't want to run Python locally:

1. Commit your `.xlsx` file to the repo root (or any path)
2. Go to **Actions → Update Escalation Data → Run workflow**
3. Enter the filename and click **Run**

The action runs the ingester, commits `data/latest.json`, and the site updates.

---

## Repo structure

```
escalation-dashboard/
├── index.html              # App shell — fetches data on load
├── css/style.css           # Acoustic brand stylesheet
├── js/app.js               # Dynamic renderer (Chart.js, all 5 tabs)
├── data/
│   └── latest.json         # ← Only this changes each week
├── tools/
│   ├── format_data.py      # Data ingester CLI
│   └── requirements.txt
└── .github/workflows/
    └── update-data.yml     # Optional GitHub Actions workflow
```

---

## Data ingester — format_data.py

```
Usage: python tools/format_data.py <xlsx> [options]

Arguments:
  xlsx                   Path to the Zendesk .xlsx export

Options:
  --out PATH             Output path (default: data/latest.json)
  --weeks N              Number of complete Mon–Sun weeks (default: 8)
  --dry-run              Print summary only, do not write output
```

### What it does

- Computes the 8 most recent complete Mon–Sun weeks from today
- Counts total tickets per region per week (by created date)
- Counts escalated tickets per region per week (by Hot Case / Client Escalated date)
- Extracts category breakdown, top 5 accounts, last-week tickets, open backlog
- Excludes DemandTec-tagged tickets throughout
- Writes a single `data/latest.json` that the web app fetches

---

## Excel export columns required

| Column | Used for |
|--------|----------|
| Ticket ID | Links, backlog |
| Ticket organization name | Top accounts, display |
| Region | NA / EMEA / LATAM / APJ segmentation |
| Hot Case | Escalation flag |
| Client Escalated | Escalation flag |
| Hot Case Date/Time - Date | Week assignment |
| Client Escalated Date/Time - Date | Week assignment |
| Ticket created - Date | Denominator (total tickets) |
| Ticket status | Backlog filtering |
| Escalation Category | Category breakdown |
| Escalation Sub Category (×7) | Sub-category display |
| Ticket priority | Display |
| JIRA Ticket Number | Jira links |
| Planhat CSM | CSM filter |

---

## Roadmap

- **Now**: Excel export → local ingester → git push → site updates
- **Next**: GitHub Actions scheduled job calling Zendesk API directly (no Excel needed)
