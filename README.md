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
