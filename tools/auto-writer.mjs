#!/usr/bin/env node
/**
 * Opt-in Korean AI draft writer. Editorial Factory remains the sole publisher.
 * No fake articles, no external writer draft overwrite, no QA bypass.
 * Requires MISTRAL_API_KEY or OPENAI_API_KEY in GitHub Actions secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const filename = fileURLToPath(import.meta.url);
const file = p => path.join(ROOT, p);
const load = p => JSON.parse(fs.readFileSync(file(p), "utf8"));
const escapeHtml = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const compact = s => String(s).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
export function eojeol(text) {
  const tokens = compact(text).split(/\s+/).filter(Boolean);
  const ko = tokens.filter(x => /[가-힣]/u.test(x));
  return { count: ko.length, ratio: ko.length / Math.max(tokens.length, 1), distinct: new Set(ko.map(x => x.replace(/[^가-힣]/gu,"")).filter(Boolean)).size };
}
export function koreanSlug(title, id) {
  const base=String(title).toLowerCase().normalize("NFC").replace(/[^a-z0-9가-힣]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,76).replace(/-+$/,"");
  return base + "-" + id.toLowerCase();
}
export function draftShapeOK(d, parent, child) {
  if (!d || !/^KOR-\d{3}$/.test(d.id || "")) return false;
  if (!/^[가-힣a-z0-9]+(?:-[가-힣a-z0-9]+)*$/u.test(d.slug || "") || d.slug.length>100) return false;
  if ([...String(d.title)].length<14 || [...String(d.title)].length>95 || ([...String(d.title)].filter(x => /[가-힣]/.test(x)).length<10)) return false;
  if ([...String(d.description)].length<70 || [...String(d.description)].length>210) return false;
  if (!d.contentHtml || /<(script|iframe|h1|style|form|svg)\b/i.test(d.contentHtml)) return false;
  const words=eojeol(d.contentHtml);
  const headings=(d.contentHtml.match(/<h2\b/g)||[]).length;
  const paragraphs=[...d.contentHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>compact(m[1]));
  const unique=new Set(paragraphs.map(p=>p.toLowerCase()));
  const links=[...d.contentHtml.matchAll(/<a href="(\/[^"]+)"/g)].map(m=>m[1]);
  return words.count>=1500 && words.ratio>=0.75 && words.distinct>=100 &&
    headings>=3 && paragraphs.length>=12 && unique.size>=10 && new Set(links).size>=3 &&
    links.includes(parent) && links.includes(child);
}
const SYSTEM = [
  "당신은 한국어 원어민 여행 콘텐츠 전문 편집자입니다. 자연스럽고 검증 가능한 고품질 한국어 설명을 작성합니다.",
  "모든 응답은 반드시 지정한 JSON 객체 하나여야 합니다. 부연 설명, 코드 블록, HTML을 반환하지 마세요.",
  "허위 가격, 보증금, 재고, 배송 범위, 법률 요건, 면허, 보험 보장, 현재 운영 상태, 통계, 출처를 지어내지 마세요.",
  "확인할 수 없는 것은 예약 전 사업자 또는 공식 기관에 확인하도록 안내합니다.",
  "사례는 가상의 상황임을 명확히 합니다. 반복, 문장 재활용, 키워드 나열, 뻔한 추임새를 금지합니다.",
  "독자에게 유용한 조건 비교, 확인 방법, 결정 순서, 질문 예시, 상황별 대안을 우선합니다."
].join("\n");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function provider() {
  const mistral = process.env.MISTRAL_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (mistral) return {url:"https://api.mistral.ai/v1/chat/completions",key:mistral,model:process.env.KOREA_MISTRAL_MODEL || "mistral-small-latest",name:"mistral"};
  if (openai) return {url:"https://api.openai.com/v1/chat/completions",key:openai,model:process.env.KOREA_OPENAI_MODEL || "gpt-4.1-mini",name:"openai"};
  return null;
}
async function requestJSON(ai, prompt, maxTokens=3600) {
  for (let attempt=0;attempt<3;attempt++) {
    const payload={model:ai.model,temperature:0.55,max_tokens:maxTokens,response_format:{type:"json_object"},
      messages:[{role:"system",content:SYSTEM},{role:"user",content:prompt}]};
    let response;
    try {
      response=await fetch(ai.url,{method:"POST",headers:{"Authorization":"Bearer "+ai.key,"Content-Type":"application/json"},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(110000)});
    } catch(e) {
      if (attempt===2) throw new Error("Provider unreachable: "+e.message);
      await sleep(3000*(attempt+1));continue;
    }
    if (!response.ok) {
      const excerpt=(await response.text()).slice(0,240).replace(/[\r\n]/g," ");
      if (![429,500,502,503,504].includes(response.status) || attempt===2)
        throw new Error("Provider HTTP "+response.status+" "+excerpt);
      const delay=Number(response.headers.get("retry-after"))*1000 || 5000*(attempt+1);
      await sleep(Math.min(delay,60000));continue;
    }
    const data=await response.json();
    const choice=data.choices?.[0];
    if (!choice || choice.finish_reason==="length") throw new Error("Incomplete provider response");
    const raw=choice.message?.content;
    try { return JSON.parse(typeof raw==="string"?raw:""); }
    catch(e) { if (attempt===2) throw new Error("Invalid provider JSON"); }
  }
  throw new Error("Provider exhausted retries");
}
function legalNeedsResearch(item) {
  // Do not auto-publish law/licensing/insurance guidance without checked official sources.
  return /(면허|보험|법규|법률|법령|벌금|국제운전|교통법|운전 자격|운전면허|면허증)/u.test(
    [item.working_title,item.primary_keyword,item.content_brief].join(" "));
}
function paragraphOK(s) {
  return typeof s==="string" && s.trim().length>=120 && !/<|>/.test(s) && /[가-힣]/u.test(s);
}
function articleFingerprint(html) {
  return compact(html).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,"").split(/\s+/).filter(Boolean);
}
function sampleShingles(tokens) {
  const shingles=new Set();
  for(let i=0;i+6<tokens.length;i+=3)shingles.add(tokens.slice(i,i+7).join(" "));
  return shingles;
}
export function repeatedContent(html, published) {
  const mine=sampleShingles(articleFingerprint(html));
  if (!mine.size) return true;
  for(const old of published) {
    const theirs=sampleShingles(articleFingerprint(old));
    let overlap=0;
    for(const s of mine)if(theirs.has(s))overlap++;
    if (overlap/Math.max(1,mine.size)>0.20) return true;
  }
  return false;
}
function usedMetadata() {
  const list=load("data/articles.json");
  return {titles:new Set(list.map(a=>a.title)),paths:new Set(list.map(a=>a.path))};
}
async function createDraft(ai, item, oldBodies, metadata) {
  let outline;
  for(let attempt=0;attempt<3;attempt++) {
    outline=await requestJSON(ai, [
      "다음 기획의 한국어 원문을 작성하기 위한 제목·설계안을 JSON으로 제안하세요.",
      "ID: "+item.id,
      "기획 제목: "+item.working_title,
      "키워드: "+item.primary_keyword,
      "검색 의도: "+item.search_intent,
      "콘텐츠 브리프: "+item.content_brief,
      "아래 다른 글의 제목과 중복시키지 마세요: "+[...metadata.titles].slice(-35).join(" | "),
      'JSON 필드: {"title":"한국어 14-95자 고유 SEO 제목","description":"한국어 80-180자 설명","sections":["구체적인 소제목 1", "소제목 2", "소제목 3", "소제목 4", "소제목 5", "소제목 6"]}',
      "반드시 6개의 서로 구별되는 실제적이고 구체적인 섹션을 만드세요. 확인되지 않은 규정이나 가격을 단정하지 마세요."
    ].join("\n"),1300);
    if (typeof outline.title==="string" && typeof outline.description==="string" && 
        [...outline.title].length>=14 && [...outline.title].length<=95 &&
        [...outline.description].length>=70 && [...outline.description].length<=210 &&
        Array.isArray(outline.sections) && outline.sections.length===6 &&
        outline.sections.every(x=>typeof x==="string"&&x.length>=8&&/[가-힣]/.test(x)) &&
        new Set(outline.sections).size===6 && !metadata.titles.has(outline.title) &&
        [...outline.title].filter(c=>/[가-힣]/.test(c)).length>=10) break;
    if(attempt===2)throw new Error(item.id+": invalid/duplicate SEO outline");
  }
  const sections=[], paraSeen=new Set();
  for(let sectionIndex=0;sectionIndex<outline.sections.length;sectionIndex++) {
    const name=outline.sections[sectionIndex];
    let section=null;
    for(let attempt=0;attempt<2;attempt++) {
      const existing=sections.map(x=>x.name).join(" | ");
      const prompt=[
        "전체 기사: "+outline.title,
        "목표 독자: 하노이를 방문하는 한국인 여행자.",
        "고유한 기사 기획: "+item.content_brief,
        "지금 작성할 소제목 ("+(sectionIndex+1)+"/6): "+name,
        "이미 다룬 소제목: "+existing,
        '반드시 JSON 객체 {"paragraphs":["문단1","문단2","문단3","문단4","문단5"]}만 반환합니다.',
        "각 문단은 서로 다른 논점으로 한국어 어절 75~105개, 전체 400~520개 한국어 어절을 목표로 하세요.",
        "체크리스트, 실제 판단 기준, 순서, 여행자의 다른 조건 등 구체적 도움을 줍니다.",
        "같은 결론을 되풀이하지 마세요. 추측 기반 차량 제원, 가격, 법령·보험·면허 규정을 말하지 마세요.",
        "목록·표·링크·HTML을 쓰지 말고 각각 읽기 좋은 완결된 일반 문장으로 작성하세요."
      ].join("\n");
      const raw=await requestJSON(ai,prompt,3900);
      if(Array.isArray(raw.paragraphs) && raw.paragraphs.length===5 &&
        raw.paragraphs.every(paragraphOK) &&
        eojeol(raw.paragraphs.join(" ")).count>=250 &&
        raw.paragraphs.every(p=>!paraSeen.has(p.trim().toLowerCase()))) {
          section={name,paragraphs:raw.paragraphs.map(p=>p.trim())};break;
      }
    }
    if (!section) throw new Error(item.id+": inadequate section "+(sectionIndex+1));
    sections.push(section);
    section.paragraphs.forEach(p=>paraSeen.add(p.toLowerCase()));
  }
  const body=sections.map(s=>"<h2>"+escapeHtml(s.name)+"</h2>\n"+
    s.paragraphs.map(p=>"<p>"+escapeHtml(p)+"</p>").join("\n")).join("\n");
  const links=item.internal_link_targets.filter(x=>typeof x==="string"&&x.startsWith("/"));
  const safeLinks=[...new Set([...links,"/문의/"])].slice(0,6);
  const linksHtml="<h2>관련 안내와 다음 단계</h2>\n<p>실제 대여 조건과 차량 상태, 일정에 따른 가능 여부는 예약 전에 직접 확인하는 것이 좋습니다. 다음 안내에서 필요한 내용을 차근차근 살펴보세요.</p>\n<p>"+
    safeLinks.map((l,i)=>'<a href="'+escapeHtml(l)+'">'+escapeHtml(
      i===0?"상위 주제 안내":i===1?"세부 가이드":l==="/문의/"?"대여 문의":"관련 정보")+"</a>").join(" · ")+"</p>";
  const slug=koreanSlug(outline.title,item.id);
  const d={id:item.id,title:outline.title,description:outline.description,slug,
    type:item.parent_id==="travel"?"travel":"guide",sourceUrls:[],
    generatedBy:"korea-ai-writer-v1",contentHtml:body+"\n"+linksHtml};
  const parent="/"+item.category_url.split("/")[1]+"/";
  const child=item.category_url;
  if(!draftShapeOK(d,parent,child))throw new Error(item.id+": local content gate did not pass (eojeol="+eojeol(d.contentHtml).count+")");
  if(metadata.paths.has(item.category_url+slug+"/"))throw new Error(item.id+": duplicate canonical");
  if(repeatedContent(d.contentHtml,oldBodies))throw new Error(item.id+": near-duplicate article body");
  return d;
}
async function main() {
  const queue=load("data/writer-queue.json"),st=load("data/factory-state.json");
  const summary=s=>{console.log(s);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,s+"\n");};
  if(!st.enabled||st.blocked||st.target_reached||queue.published>=300){summary("KOREA_WRITER idle: disabled/blocked/complete");return;}
  const ai=provider();
  if(!ai){summary("KOREA_WRITER UNCONFIGURED: repository secret MISTRAL_API_KEY or OPENAI_API_KEY not available; 0 generated.");console.log("::warning::KOREA AI writer requires a configured provider secret. Existing external writer still works.");return;}
  const max=Math.min(5,Math.max(1,Number(process.env.KOREA_AI_BATCH||2)||2));
  const eligible=queue.queue.filter(x=>["WRITING","REPAIR"].includes(x.status));
  const metadata=usedMetadata();
  const oldBodies=load("data/articles.json").map(a=>fs.readFileSync(file(a.contentFile),"utf8"));
  let accepted=0,failed=0,skipped=0;
  for(const item of eligible) {
    if(accepted>=max)break;
    const dest=file(item.draft_file);
    if(fs.existsSync(dest)) {
      let existing=null;
      try{existing=JSON.parse(fs.readFileSync(dest,"utf8"));}catch{}
      if(existing?.generatedBy!=="korea-ai-writer-v1"||item.status!=="REPAIR"){
        skipped++;continue; // never touch an external writer's draft
      }
    }
    if(legalNeedsResearch(item)){summary("KOREA_WRITER RESEARCH_REQUIRED "+item.id+": law/licensing/insurance claims require official sources and human fact-check");skipped++;continue;}
    try {
      const draft=await createDraft(ai,item,oldBodies,metadata);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.writeFileSync(dest,JSON.stringify(draft,null,2)+"\n","utf8");
      metadata.titles.add(draft.title);
      metadata.paths.add(item.category_url+draft.slug+"/");
      oldBodies.push(draft.contentHtml);
      accepted++;
      summary("KOREA_WRITER DRAFT "+item.id+" eojeol="+eojeol(draft.contentHtml).count+" model="+ai.model);
    } catch(e) {
      failed++;
      console.log("::warning::KOREA_WRITER "+item.id+" "+e.message.replace(/[\r\n]/g," ").slice(0,300));
    }
  }
  summary("KOREA_WRITER_RESULT "+JSON.stringify({accepted,failed,skipped,provider:ai.name}));
}
if(process.argv[1] && path.resolve(process.argv[1])===filename){
  main().catch(e=>{console.error("KOREA_WRITER_FATAL "+e.message);process.exitCode=1;});
}
