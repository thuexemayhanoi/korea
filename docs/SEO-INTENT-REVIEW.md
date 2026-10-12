# KOREA — Search-intent Review (13 October 2026)

**Repository:** `thuexemayhanoi/korea` · **Site:** https://ko.rentbikehanoi.com/ · **Review status:** no destructive changes.

## Evidence

Baseline audit: [Korea SEO Audit and Monitoring](https://github.com/thuexemayhanoi/korea/actions/runs/38282418576). It verified 379 self canonicals, 379 index/follow routes, 300 BlogPosting schemas and 32 FAQ. Three similar-title pairs are KOR-211/212, KOR-212/215 and KOR-211/215.

All three complete published Korean article bodies and their actual `data/editorial-briefs.json` entries were reviewed, not only titles.

| Article (live canonical URL) | Current role | Unique user question | Action |
|---|---|---|---|
| [KOR-211](https://ko.rentbikehanoi.com/베트남-북부-여행/까오방/까오방-여행-처음-준비-반족-폭포-동굴-교통/) | First-visit introduction | What should I prepare for a first Cao Bang trip? | Keep introductory guide; link to comparison and FAQ where useful |
| [KOR-212](https://ko.rentbikehanoi.com/베트남-북부-여행/까오방/까오방-여행-선택-기준-폭포-동굴-숙소-교통/) | Decision comparison | Which waterfall/cave schedule, lodging base and transport suit my trip? | Keep transport and lodging comparisons |
| [KOR-215](https://ko.rentbikehanoi.com/베트남-북부-여행/까오방/까오방-반족-동굴-교통-숙소-faq-215/) | Situation-specific Q&A | What are answers to common waterfall, cave, route and family questions? | Keep visitor FAQ format; no redundant schema insertion |

These are distinct content emphases (informational vs comparative vs FAQ) and their texts are substantive. **Similarity of overlapping place names does not prove cannibalization**. No redirects, article deletions, noindex directives or canonical consolidation without GSC query→landing-page evidence.

## SEO Matrix — Next decisions

| Priority | Finding | Required evidence/action |
|---|---|---|
| P0 | Schema and visible answers | Validate 32 visible FAQ Q&A items exactly match FAQPage JSON-LD and JSON source |
| P1 | Similar Cao Bang articles | Retain all three; examine impressions/queries for overlap once GSC is connected |
| P1 | 60 shared planned keyword clusters | 5 pieces per child topic is expected; not 60 instances of cannibalization |
| P0 | GSC property and sitemap | User has ownership confirmation but connector lacks Korea property. Inspect `https://ko.rentbikehanoi.com/sitemap.xml` status and URL Inspection before repeated submissions |
| P1 | Bing Webmaster Tools | Compare submitted/discovered/indexed as separate figures |
| P1 | Mobile redirects | Identify redirect chain before changing routing or DNS; estimated 630ms is a lab opportunity only |
| P2 | Authority | Legitimate citations and verified business facts, no fabricated backlinks or testimonials |

## SEO review workflow

After a change, execute **Korea SEO Audit and Monitoring** GitHub Action, download `korea-seo-audit` JSON and inspect `editorial.potentiallySimilarTitlePairs` (now with paths and planned-intent labels). Review the affected pages before modifying any title or article. Source-of-truth content and canonical paths remain intact.

Factory is paused at KOR-300. This SEO workflow does not write or generate posts, and it does not modify `/china`.
