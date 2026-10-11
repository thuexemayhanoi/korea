# Korea: 300 Korean articles written by an external AI

Scope: ONLY thuexemayhanoi/korea and ko.rentbikehanoi.com. No changes to china, web, French, Hostinger or DNS.

The repository owns 300 planned slots (KOR-001 through KOR-300), divided between 12 parent and 60 child Korean categories. The factory does not generate content or call external AI APIs. An external writer reads data/writer-queue.json, writes original Korean HTML in _factory/inbox/KOR-001.json, and pushes to main. GitHub Actions validates, rebuilds the shared site and HTML search index, updates taxonomy pages and sitemap, then native GitHub Pages deploys.

Minimum article length: **1,500 Korean eojeol (어절)**: whitespace-separated tokens containing at least one Hangul syllable within article BODY. NOT 1,500 Korean characters or English words. At least 3 H2 headings, 8 substantive non-identical paragraphs, 3 distinct internal links (including both parent and child category), unique Korean slug, headline and meta description.

## Writer instructions

Always read data/writer-queue.json to get exact assigned IDs and taxonomy. One file per assignment at _factory/inbox/KOR-001.json, for example:

{
  "id": "KOR-001",
  "parentId": "rental",
  "childId": "rental-1",
  "slug": "하노이-오토바이-렌트-준비-체크리스트",
  "title": "하노이에서 오토바이를 빌리기 전에 살펴볼 필수 사항",
  "description": "하노이에서 오토바이 렌트를 계획할 때 차량 상태와 인수 순서, 운전 자격, 보증금 확인 방법, 계약 전 필수 점검 항목을 한국어로 자세히 정리합니다.",
  "type": "rental",
  "sourceNotes": ["Actual verified official source URLs/notes"],
  "body": "<h2>첫 번째 항목</h2><p>검증한 한국어 내용...</p>..."
}

Body is an HTML fragment with no H1, script, schema, footer, full-document tags or JavaScript attributes. Include meaningful links to both /하노이-오토바이-렌트/ and /하노이-오토바이-렌트/렌트-시작하기/ plus a third existing internal destination such as /문의/. No links to unwritten posts, keyword stuffing or paragraph repetition. Shared builder generates Article JSON-LD, canonical, metadata, related posts, CTA, breadcrumbs, sitemap, menu, footer and theme.

Workflow: 5 claimed drafts per batch, inbox push trigger, 15-minute recovery watchdog, manual status / refresh-queue / process / pause / resume; stop automatically at 300. Invalid drafts get REPAIR without publishing. Published IDs and URLs cannot be overwritten. Reject concurrent main-branch advances rather than rebasing generated state.

Commands:

    node tools/factory.mjs status
    node tools/factory.mjs refresh-queue
    node tools/factory.mjs process
    node tools/factory.mjs pause
    node tools/factory.mjs resume
    node tools/qa.mjs
    node tools/build.mjs --check
    node tools/build-chat-index.mjs --check

All source and results must be kept on repo korea. No modification to /web or /china and no DNS/CNAME/hosting changes.

Writer must verify rental prices, traffic law, license conditions, stock and address from reliable sources. Automatic QA does not prove factual accuracy, originality or Google ranking; the 1,500-eojeol floor must not be filled with repetitive fluff.
