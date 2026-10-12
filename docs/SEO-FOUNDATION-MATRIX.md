# Korea — SEO Foundation Matrix (2026-10-13)

Repository: thuexemayhanoi/korea. Production: https://ko.rentbikehanoi.com/

**Current inventory:** 300 PUBLISHED Korean articles, 12 parent topics, 60 children, 7 essential pages, 32 visible FAQ entries, 379 unique URLs in sitemap; writer factory reached KOR-300 and is paused.

The new workflow \`.github/workflows/korea-seo-monitor.yml\` is independent of \`korea-article-factory.yml\` and \`ai-search-optimizer.yml\`. It is read-only, runs on push, pull request, weekly schedule and manual dispatch, and uploads a JSON audit artifact. It does not make commits or publish content.

| Priority | Workstream | Baseline | Required next action |
|---|---|---|---|
| P0 | Technical SEO | robots.txt, sitemap 379, index/follow, self-canonical on production samples | Continually verify *every* generated HTML page and sitemap |
| P0 | SEO Architecture | 12 pillar/topic groups, 60 child hubs, breadcrumbs, internal links | Existing QA + editorial orphan analysis; preserve all slugs |
| P0 | On-page SEO | title, meta, H1, OG, Korean lang | Detect duplicate titles and missing metadata on all routes |
| P1 | Content SEO | 300 full Korean articles; factory minimum 1,500 Korean eojeol and 3 H2 | Review near-matching article-title pairs within the same child category; actual intent requires human/source review |
| P1 | AEO/GEO | 32 FAQ, BlogPosting, entity graph, llms.txt | Compare published answer evidence and Schema against visible content; do not insert boilerplate FAQ in all articles |
| P1 | Mobile/Performance | 2026-10-12 mobile lab: FCP 1.1s, LCP 1.2s, CLS 0, TBT 0ms, Speed Index 2.3s; redirect estimate 630ms | Check redirect chain and *field* CWV, especially INP; do not equate lab with field data |
| P0 | Index measurement | User supplied GSC ownership confirmation; connected SEO apps still do **not** expose ko.rentbikehanoi.com | Inspect exact Search Console property and 'Couldn't fetch' sitemap status; re-submit only after confirming error and avoid duplicate submissions |
| P1 | Bing measurement | User reported Bing Webmaster Tools access; no direct tool data available in this connection | Check indexed URLs and sitemap processing via Bing account |
| P2 | Authority and language | Korean marketing/reader focus, consistent Nguyen Tu NAP and contact | Earn legitimate citations and maintain verified sources; no spammy links |

## Strict safeguards

- GSC ownership verification, sitemap being fetched, and URLs actually indexed are three separate states.
- Repeating the same *parent keyword* across several distinct article intents is not conclusive cannibalization. The audit only flags candidate pairs and never merges, noindexes, redirects or deletes them.
- Mobile SEO metrics in the matrix are dated lab measurements, not new measurements by the GitHub workflow.
- Read-only monitor has \`contents: read\`; all generated audit output stays under \`/tmp\` and GitHub artifact storage.
- Do not enable the 300-article factory again, touch /china, change DNS/CNAME or replace any production URLs as part of an audit.
- On actual findings: source QA → generated page QA → report → human review → separately authorized modifications.
