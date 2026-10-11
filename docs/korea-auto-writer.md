# KOREA 300 — AI draft writer operations

Scope is **only** \`thuexemayhanoi/korea\`, https://ko.rentbikehanoi.com. This is an optional AI content creation stage in front of the existing quality-gated Editorial Factory.

## Source of truth and publishing

- \`data/article-plan.csv\`: 300 IDs and PUBLISHED/WRITING/REPAIR/PLANNED statuses.
- \`data/writer-queue.json\`: current 5 active IDs. This is a queue, **not** the number of published HTML documents.
- \`data/articles.json\`: actual published article registry; \`content/articles/KOR-XXX.html\`: real Korean text.
- \`tools/auto-writer.mjs\`: drafts original Korean content from the queue if an authenticated model is available.
- \`tools/factory.mjs process\`: sole authority to validate draft JSON, publish HTML, update registry/queue, rebuild site + chatbot + sitemap, run SEO QA.
- Never change the shared \`CNAME\`, URL hierarchy, translation layout, NAP, sitemap rules, or existing articles. No force push.

## API setup and behaviour

GitHub Actions repository secret **\`MISTRAL_API_KEY\`** (preferred) or **\`OPENAI_API_KEY\`** (fallback) must be configured for automatic writing. This step is optional for pre-existing external AI writers. Models may be selected via repository variables \`KOREA_MISTRAL_MODEL\` / \`KOREA_OPENAI_MODEL\`; defaults: \`mistral-small-latest\` and \`gpt-4.1-mini\`.

This repo deliberately stores **no API keys**, does not read keys from website pages, and does not use retired GitHub Models endpoints. Model calls may incur provider costs. Automatic writing is capped at **2 new Korean drafts per workflow run**, at most 5 if explicitly increased in the workflow, and will stop when 300 real articles publish. API 429 / transient provider errors are retried with capped backoff; permanent failures are logged. The existing watchdog runs at minute 17 and 47 each hour.

If neither key is present, the workflow reports \`KOREA_WRITER UNCONFIGURED\` and publishes zero generated drafts; **green CI does not mean progress**. Run log and progress must be read separately. \`GITHUB_TOKEN\` alone cannot write LLM prose.

### Safety and quality controls

The writer makes a unique outline, then several independently generated sections, each with substantive Korean paragraphs. A local preflight checks SEO title/description, Korean \`eojeol\` count, vocabulary diversity, headings, paragraphs, three genuine local links and duplicate text. Model HTML is never accepted: plain-text paragraphs are HTML-escaped and wrapped by the script. Only a draft passing preflight is written.

The existing Factory runs its **unchanged authoritative gates**: >=1,500 Korean eojeol, >=75% Korean tokens, >=100 distinct Korean words, 3 H2, 12 substantive paragraphs, three valid internal links, correct assigned parent/child links, unique canonical/title and SEO score >=85 with no blockers. Invalid drafts go to \`REPAIR\`, not production. Drafts created externally are not overwritten. Only this writer's own draft may be regenerated when marked REPAIR.

**Legal / driver licensing / insurance** content is intentionally held for verified official-source research and human fact checking. This writer does not invent laws, vehicle stock, rates, deposits or legal obligations. The 300-article goal cannot be declared complete while researched and other missing articles remain.

### Validation

\`\`\`bash
node --check tools/auto-writer.mjs
node --test tools/auto-writer.test.mjs
node tools/factory.mjs verify
node tools/build.mjs --check
node tools/build-chat-index.mjs --check
node tools/qa.mjs
\`\`\`

For local dry execution **without** an API key: \`node tools/auto-writer.mjs\` will log \`UNCONFIGURED\` and exit without creating files. Never insert a fake placeholder or lower the Factory word-count gate to reach 300.

A scheduled \`KOREA 300 External Writer Factory\` run now executes the optional writer first, then the existing factory process and full site QA, then pushes a safe fast-forward commit if there are genuine changes. Runs are serialised by the existing workflow concurrency group. If main advances mid-run, publication aborts safely for a later retry.
