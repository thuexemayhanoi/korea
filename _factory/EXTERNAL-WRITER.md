# KOREA 300 · EXTERNAL WRITER RULEBOOK 🇰🇷

**Only repository:** `thuexemayhanoi/korea`  
**Domain:** https://ko.rentbikehanoi.com/  
**Target:** 300 **real Korean articles**, `KOR-001` to `KOR-300`, grouped under the existing **12 parent / 60 child** categories.  
**Critical requirement:** **at least 1,500 Korean 어절 (eojeol) per article**, counted from the actual text of `contentHtml`, not from HTML tags, title, menu, or boilerplate.

## Start here — read the queue, not the /web or /china repo

1. Read `README.md`, `data/writer-queue.json` and `data/taxonomy.json`.
2. Run `node tools/factory.mjs next` on a clone of this repository, or read the committed queue JSON.
3. Write only the IDs currently in `queue[]` (first queue: KOR-001 to KOR-005).
4. Save one complete, original and well-checked draft per ID at the exact `draft_file` path in `_factory/inbox/`.
5. Run `node tools/factory.mjs status` and push the **draft JSON files** to `main`. GitHub Actions runs QA and, if compliant, publishes up to **five** per iteration. It automatically rebuilds category listings, canonical/meta, related posts, the sitemap and local Korean HTML chatbot index.
6. Read `data/factory-state.json` for any `repair` messages. Fix the draft **in place** and push a genuine revision, never submit the same file unchanged repeatedly.

**The GitHub workflow does not generate prose and does not call any AI API.** External AI/Mistral can write content and push draft files through its own authorised GitHub environment. This does not install or configure Mistral access.

## Exact JSON format (one file per queue ID)

Example: `_factory/inbox/KOR-001.json`

```json
{
  "id": "KOR-001",
  "title": "하노이 오토바이 렌트 초보자를 위한 준비 방법과 확인할 사항",
  "description": "하노이에서 처음 오토바이를 빌리는 여행자를 위한 준비 안내입니다. 예약 전에 확인해야 할 차량 상태, 계약 조건, 도로 환경, 운전 자격과 안전 점검 사항을 쉽게 설명합니다.",
  "slug": "하노이-오토바이-렌트-초보자-준비",
  "type": "rental",
  "sourceUrls": [],
  "contentHtml": "<p>여기에 충분히 조사한 실제 한국어 본문을 작성하세요.</p><h2>대여 준비</h2><p>...</p><h2>차량 확인</h2><p>...</p><h2>안전 점검</h2><p>...</p><p><a href=\"/하노이-오토바이-렌트/\">상위 가이드</a> · <a href=\"/하노이-오토바이-렌트/렌트-시작하기/\">하위 가이드</a> · <a href=\"/문의/\">문의</a></p>"
}
```

The short example above **fails the minimum-length QA by design**; you must write a full substantial article. Use `JSON.stringify` or a JSON-aware writer so quotes and newlines inside `contentHtml` are escaped correctly.

## Hard QA gates

- **1,500+ Korean eojeol**, each whitespace-separated token containing Hangul; Korean-word ratio at least 75%; at least 100 different Hangul tokens. This is not 1,500 Hangul characters. Estimate 1,700–2,000 eojeol to leave room for edits.
- At least 3 genuine `<h2>` headings, 12 distinct substantive `<p>` paragraphs, no copied boilerplate repeated to pad length. **Do not write an H1**; the shared template creates it.
- Korean SEO title 14–95 characters, Korean meta description 70–210 characters, unique title and slug, no duplicate canonical URL.
- **At least 3 distinct, valid local links**: one to the exact assigned parent category, one to the assigned child, and another relevant real published page, category or contact/FAQ page. Link to `ko.rentbikehanoi.com` paths only; do not link to unpublished planned articles.
- Allowed `type`: `rental`, `travel`, `safety`, `guide`. Safety or licensing/legal topics require `sourceUrls` with official or verifiable HTTPS sources. Do not invent license rules, rental prices, deposits, opening hours, delivery areas, availability, named products or quoted statistics.
- Pure trusted article HTML only: no iframe, script, inline event handlers or dangerous links. Images need alt text.
- QA score must reach **85/100** with **zero blocking errors**. A high numeric score alone never overrides a failed hard gate.
- Korean slug example: `/하노이-오토바이-렌트/렌트-시작하기/하노이-오토바이-렌트-초보자-준비/`. Parent and child prefix is derived from queue; the writer supplies only the final Korean slug.

## Queue behavior and safeguards

- The first 5 IDs start in `WRITING`; there are **295 PLANNED, 0 PUBLISHED**. The next batch is automatically claimed when earlier IDs publish, to a maximum of five active IDs.
- An absent draft waits; it is not counted as failed. A failing submitted draft becomes `REPAIR` with explicit reasons in `data/factory-state.json`. An unchanged bad draft is not repeatedly penalized on the 30-minute watchdog. Three distinct failed revisions block the factory until a human checks and resumes it.
- Published articles cannot be silently overwritten; duplicate IDs, titles and paths are rejected.
- The whole workflow stops and disables itself on 300 published. It does not touch the completed `/web` workflow or `/china`.
- GitHub Actions: **KOREA 300 External Writer Factory** → `status`, `process`, `refresh-queue`, `pause`, `resume`. On-push automation plus a 30-minute recovery watchdog. CI and safe fast-forward push run before publishing to main.
- Indexable categories activate only once real published Korean articles are present. Empty categories stay noindex. Related posts and chatbot index pull only actually published content.

**Pre-publish editor check:** external AI can hallucinate real-world information. Before submitting, verify real service facts, originality and any legal/safety claims against current reliable sources.
