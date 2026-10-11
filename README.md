# Korea · 하노이 오토바이 렌트

**Production:** https://ko.rentbikehanoi.com/  
**Repository:** https://github.com/thuexemayhanoi/korea  
**Branch:** main · **Hosting:** GitHub Pages (native branch deployment)

## Scope

A standalone Korean-language static blog skeleton with a bold **black / white / vivid red** identity, responsive mega navigation and footer, accessible light/dark toggle, Korean Unicode URLs, SEO metadata and structured data.

- 12 parent topic silos × 5 child categories = **60 child categories** and **12 hubs**.
- Editorial allocation: **300 planned articles** (5 per child category), in `data/article-plan.csv`. **0 articles published**. No article-writing agent or automation workflow is installed.
- Shared source of truth: `data/site.json` and `data/taxonomy.json`. The navigation menu, footer, breadcrumbs, headings, category links and sitemap are generated from this same data by `tools/build.mjs`.
- Core indexable pages: Home, About, Contact, FAQ, Privacy, Terms. Blog listing and all empty category pages use **noindex,follow** and are excluded from sitemap until real useful editorial content is ready. No empty fake article URL is generated.
- Korean slugs are part of directory names, e.g. `/하노이-오토바이-렌트/` and `/하노이-오토바이-렌트/렌트-시작하기/`.
- Actual motorbike rental pricing, inventory, driver licensing and legal conditions must be verified before publication; do not invent facts.

## Change once → update all pages

Modify `data/site.json` for brand details and navigation-group labels, or `data/taxonomy.json` for category labels and descriptions. Then run:

```sh
node tools/build.mjs
node tools/qa.mjs
```

Commit the updated generated HTML pages and sitemap. The builder uses only built-in Node.js modules (recommended Node 20+). There is **no custom GitHub Actions workflow** at this stage.

## Files

- `data/site.json`: shared business/contact data and navigation grouping
- `data/taxonomy.json`: category hierarchy, Korean slugs and article targets
- `data/article-plan.csv`: 300 future article slots, all PLANNED
- `tools/build.mjs`: deterministic static-page generator
- `tools/qa.mjs`: basic metadata, link and content-plan checks
- `assets/css/site.css`: design tokens and responsive look
- `assets/js/site.js`: theme, mobile navigation, directory filter
- `CNAME`: GitHub Pages custom domain — **DO NOT CHANGE**

## SEO conventions

Every page has `lang="ko"`, a self-referencing canonical, a Korean title, meta description and Open Graph tags. JSON-LD is applied to eligible core pages, including FAQ. Category pages intentionally remain `noindex,follow` while empty. Add proper reciprocal hreflang annotations only after corresponding Vietnamese/English/French/Chinese URLs have been confirmed equivalent and updated reciprocally. Sitemap lists indexable core pages only.

The source site is informational; it must not represent planned topics as published articles or models mentioned in guide topics as in-stock rentals.

## One-place updates and reusable editorial layers (11 October 2026)

All site-wide content is still built by `node tools/build.mjs`; the current URLs, SEO, sitemap and red/black/white design are preserved by default.

- `data/site.json`: contacts, navigation labels, CTA text, optional banner, feature flags. Changing CTA text does not require editing HTML per page.
- `assets/css/site.css`: sitewide design tokens, no new dependencies.
- `data/taxonomy.json`: 12 parent topics and 60 child topics. Shared header, footer, breadcrumbs and category pages read this same structure.
- `site/slots/{before-main,after-article,before-footer}.html`: build-time hooks for optional common blocks (empty by default).
- `site/templates/article.html`: one reusable layout for **real** future articles; the generator composes it with SEO metadata, published-post related links, parent/child internal links and a matching CTA.
- `data/articles.json`: approved editorial metadata only; starts as `[]`, so **zero articles are published**. Never turn planned slots into live pages without substantive, verified Korean content.
- `tools/lib/editorial.mjs`: validates published article records, determines up to three related posts, creates BlogPosting JSON-LD.
- `tools/qa.mjs`: checks Korean lang, canonical, noindex/index, sitemap, duplicate SEO titles, H1, OG, JSON-LD, images and internal links.
- `.github/workflows/site-quality.yml`: QA-only CI on pushes and PRs; no AI-writing schedule, no change to GitHub Pages branch deployment.

How to apply a global change:

```sh
node tools/build.mjs
node tools/qa.mjs
node tools/build.mjs --check
```

Commit changed source files and generated HTML together. Failure in the QA-only workflow indicates a build or metadata mismatch, not that publishing or writing was performed.

Future article metadata must declare `id` matching an allocated `KOR-001`…`KOR-300` plan slot, `status: "PUBLISHED"`, matching taxonomy `parentId`/`childId`, an unmodified Korean URL prefix `path`, `title`, `description`, `publishedAt` and a real HTML `contentFile` under `content/articles/`. The generator automatically indexes its category hubs and adds only **published** URLs to sitemap. Be sure to verify licensing, safety, prices, inventory and source accuracy before approval.

**No automatic writer workflow or 300 filler articles were added.**

## KO ⇄ EN automatic reader translation

The compact `文 EN` link in the shared header opens the same Korean URL using Google Translate’s translated web proxy (`translate.goog`). English text is machine-translated for readers, not stored as separate English SEO content. The original Korean canonical, metadata, sitemap and URLs remain unchanged. On a translated page the switch becomes `KO` and points back to the original Korean path. No old Google Website Translator embed, paid API, or writing workflow is installed.

Translation requires the external Google service; it may be delayed, unavailable in some networks or imperfect. If SEO-targeted English pages become necessary, create verified English pages with dedicated canonical URLs and reciprocal hreflang instead of indexing proxy translations.

## Korean menu, contact dock and HTML knowledge assistant

Top-level Korean menu order: 홈 → 소개 → 사이트 안내 (FAQ, 문의, 개인정보 처리방침, 이용약관) → topic groups → 전체 가이드. Labels and legal-page routes share `data/site.json`; footer uses the same labels. Existing Korean slugs, canonicals and sitemap remain unchanged.

The left-hand quick dock opens phone, Zalo, WhatsApp and the existing Google Maps location from `data/site.json`; it replaces the legacy right-hand phone bubble when successfully mounted. The right-hand Korean browser-local guide answers fixed store facts and retrieves relevant sections from published Korean HTML. It is **not a generative AI model**, does not promise live availability/prices, uses **no LLM/API/account**, and does not send question text to a backend. Its search index is deterministically generated from checked-in HTML and excludes `noindex` categories.

Run after updating site content:

```sh
node tools/build.mjs
node tools/build-chat-index.mjs
node tools/qa.mjs
node tools/build.mjs --check
node tools/build-chat-index.mjs --check
```

QA-only GitHub Actions validates the static chat index; there is no auto-writer agent or additional publishing workflow.
