# The Lewis Ledger — Soft Money

A one-page dashboard for Fred and Krystal, branded as The Lewis Ledger. Tap the home-screen icon and see whether this month’s soft (flexible) spending is on pace.

The page is plain HTML, CSS, and vanilla JavaScript. It has no build step and no framework. The only network request is `./data.json`.

Pocket money is not included.

Live site (after GitHub Pages is enabled from the `main` branch root):

https://fredlewis-az.github.io/soft-money/

## Data contract

`data.json` lives at the repository root. The page is driven only by that file. Another update can replace it with a git commit; do not hardcode amounts in the page.

```json
{
  "sample": false,
  "updated_at": "2026-10-28T19:15:00-07:00",
  "month": "2026-10",
  "days_in_month": 31,
  "day_of_month": 28,
  "total_budget": 3000,
  "categories": [
    { "name": "Grocery/Pet/etc Store", "budget": 750, "spent": 671.4 }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `sample` | When `true`, the page shows a banner: `SAMPLE DATA, preview only`. |
| `updated_at` | ISO-8601 timestamp with a numeric offset. Shown near the top in America/Phoenix, for example `Updated Wed, Oct 28, 2026 at 7:15 PM (AZ)`. |
| `month` | Budget month, `YYYY-MM`. |
| `days_in_month` | Number of days in that month. |
| `day_of_month` | Optional day number used for pace. If it is omitted, the page uses the calendar day of `updated_at` in America/Phoenix. |
| `total_budget` | Monthly soft-money budget. Headline pace uses this figure. |
| `categories` | One object per category: `name` (string), `budget` (number), `spent` (number). |

Total spent is the sum of category `spent` values. There is no separate spent total in the file.

Pace = budget × (`day_of_month` / `days_in_month`).

- Spent at or under pace: teal, “On track, $X under pace”.
- Over pace by at most 5% of pace: amber, “Behind, $X over pace”.
- Over pace by more than 5% of pace: red, “Behind, $X over pace”.

The same rule is applied to the month total and to each category. Dollar gaps in the headline are rounded to the nearest dollar. Category cards show budget remaining (`$left` or `$over`), colored with that pace rule.

Under the headline, a random tip matches a finer pace band: `(spent − pace) / budget`. Way ahead is at or below −15%, ahead is −15% to −5%, on pace is −5% to +3%, slightly over is +3% to +10%, and way over is above +10%. Spending more than the budget uses the over-budget lines. The line is teal, navy, amber, or brick to match the band. A category shows a tiny version only when it is way ahead, way over, or over budget. A new line is chosen on each load.

### Sample file

The committed `data.json` is sample data (`"sample": true`) for 28 October 2026, updated `2026-10-28T19:15:00-07:00`. Spent figures are examples:

| Category | Budget | Spent | Versus pace |
| --- | ---: | ---: | --- |
| Grocery/Pet/etc Store | 750 | 671.40 | under (teal) |
| Costco | 650 | 612.85 | about 4% over (amber) |
| Fun | 600 | 455.20 | under (teal) |
| Personal Care | 550 | 538.10 | about 8% over (red) |
| Shopping buffer | 400 | 262.75 | under (teal) |
| Farmer's Market/Other | 50 | 18.00 | under (teal) |

Combined spent is $2,558.30. Pace on a $3,000 budget at day 28 of 31 is $2,709.68, about $151 under pace, so the headline is teal: “On track, $151 under pace”.

## Freshness

Every load fetches `./data.json?t=<timestamp>` with `cache: "no-store"`. The page fetches again on `visibilitychange` (when visible), `focus`, and `pageshow`, because an iPhone home-screen app often resumes without reloading. There is no service worker.

## Add to Home Screen

The page sets `apple-mobile-web-app-capable`, a manifest with `display: standalone`, and an apple touch icon. In Safari, Share → Add to Home Screen. The icon opens full screen as Lewis Ledger.

## Hosting

GitHub Pages serves the default branch (`main`) from the site root. `.nojekyll` is present so Pages does not run Jekyll.

Enable it once: repository **Settings → Pages → Build and deployment → Deploy from a branch**, branch **main**, folder **/ (root)**.
