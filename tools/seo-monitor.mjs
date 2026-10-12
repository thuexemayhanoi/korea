#!/usr/bin/env node
/** Read-only SEO Foundation monitor for ko.rentbikehanoi.com.
 * Runs entirely offline on checked-out GitHub source and generated HTML.
 * Never infers Google/Bing indexing or Core Web Vitals from a sitemap.
 */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=async path=>readFile(join(root,path),"utf8");
const json=async path=>JSON.parse(await read(path));
const site=await json("data/site.json");
const posts=(await json("data/articles.json")).filter(x=>x.status==="PUBLISHED");
const taxonomy=await json("data/taxonomy.json");
const briefs=await json("data/editorial-briefs.json");
const faqs=await json("data/faqs.json");
const state=await json("data/factory-state.json");
const errors=[],warnings=[];
const requireCheck=(ok,msg)=>{if(!ok)errors.push(msg)};
const normalize=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
const koreanWords=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&(?:[a-z]+|#\d+);/gi," ").split(/\s+/).filter(s=>/[가-힣]/u.test(s)).length;
const titleTokens=s=>new Set(String(s||"").normalize("NFKC").toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu," ").split(/\s+/)
 .filter(x=>x.length>=2&&!new Set(["하노이","오토바이","렌트","가이드","안내","방법","비교","어떻게","확인","기준"]).has(x)));
const similarity=(x,y)=>{
 const a=titleTokens(x),b=titleTokens(y),both=[...a].filter(t=>b.has(t)).length;
 return both/Math.max(1,a.size+b.size-both);
};
requireCheck(posts.length===300,"Expected 300 published posts");
requireCheck(state.target_reached===true&&state.enabled===false,"Factory unexpectedly active or target not reached");
requireCheck(taxonomy.length===12&&taxonomy.every(t=>t.children.length===5),"Unexpected 12x5 taxonomy");
requireCheck(briefs.length===300&&faqs.length===32,"Brief or FAQ inventory changed");
const core=["/","/소개/","/문의/","/자주-묻는-질문/","/개인정보-처리방침/","/이용약관/","/블로그/"];
const parents=taxonomy.map(t=>"/"+t.slug+"/");
const children=taxonomy.flatMap(t=>t.children.map(c=>"/"+t.slug+"/"+c.slug+"/"));
const expected=[...core,...parents,...children,...posts.map(a=>a.path)];
requireCheck(expected.length===379,"Expected 379 published routes");
requireCheck(new Set(expected).size===expected.length,"Duplicate published route");
const xml=await read("sitemap.xml");
const loc=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decodeURI(m[1].replaceAll("&amp;","&")));
const fromXml=new Set(loc);
requireCheck(loc.length===379&&loc.length===fromXml.size,"Sitemap count/uniqueness mismatch");
for(const route of expected)requireCheck(fromXml.has(site.domain+route),"Missing sitemap route: "+route);
for(const u of loc)requireCheck(u.startsWith(site.domain+"/"),"Foreign sitemap URL: "+u);
const robots=await read("robots.txt");
requireCheck(robots.includes("User-agent: *")&&robots.includes("Allow: /")&&robots.includes("Sitemap: "+site.domain+"/sitemap.xml"),"robots.txt policy or sitemap mismatch");
const reportCounts={checkedPages:0,selfCanonicals:0,indexFollow:0,koreanLang:0,jsonLdParsed:0,blogPostSchema:0,faqSchemaQuestions:0};
const titleIndex=new Map();
const faqRoute="/자주-묻는-질문/";
const decodeVisible=s=>String(s||"").replace(/&(?:amp|lt|gt|quot|#39);/g,e=>({"&amp;":"&","&lt;":"<","&gt":">","&quot;":'"',"&#39;":"'"}[e]||e));
const byId=new Map(briefs.map(b=>[b.id,b]));
for(const route of expected){
 const path=route==="/"?"index.html":route.slice(1)+"index.html";
 let html;
 try{html=await read(path)}catch{errors.push("HTML missing: "+route);continue}
 reportCounts.checkedPages++;
 const canonical=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m=>m[1]);
 requireCheck(canonical.length===1&&canonical[0]===site.domain+route,"Canonical mismatch: "+route);
 if(canonical.length===1&&canonical[0]===site.domain+route)reportCounts.selfCanonicals++;
 const robotsMeta=html.match(/<meta name="robots" content="([^"]+)"/)?.[1]||"";
 requireCheck(robotsMeta.startsWith("index,follow")&&!robotsMeta.includes("noindex"),"Not indexable: "+route);
 if(robotsMeta.startsWith("index,follow")&&!robotsMeta.includes("noindex"))reportCounts.indexFollow++;
 requireCheck(/^<!doctype html><html lang="ko">/i.test(html),"Language not Korean: "+route);
 if(/^<!doctype html><html lang="ko">/i.test(html))reportCounts.koreanLang++;
 requireCheck((html.match(/<h1\b/g)||[]).length===1,"Expected one H1: "+route);
 requireCheck(html.includes('name="description"')&&html.includes('name="viewport"')&&html.includes('property="og:title"'),"Missing head SEO/meta: "+route);
 const metaDescription=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||"";
 requireCheck(/[가-힣]/.test(metaDescription),"Korean SEO description missing: "+route);
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1]||"";
 const key=normalize(title);
 if(!key)errors.push("No title: "+route);
 else if(titleIndex.has(key))errors.push("Exact normalized HTML title duplicate: "+route+" and "+titleIndex.get(key));
 else titleIndex.set(key,route);
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 let types=[];
 for(const block of blocks){
  try{
   const obj=JSON.parse(block[1]);
   for(const item of obj["@graph"]||[obj])if(typeof item?.["@type"]==="string")types.push(item["@type"]);
   reportCounts.jsonLdParsed++;
  }catch(e){errors.push("Invalid JSON-LD: "+route+" "+e.message)}
 }
 const expectedType=route==="/소개/"?"AboutPage":route==="/문의/"?"ContactPage":"WebPage";
 requireCheck(route==="/"||types.includes(expectedType),"Page schema type missing ("+expectedType+"): "+route);
 if(route==="/")requireCheck(types.includes("WebSite")&&types.includes("LocalBusiness"),"Home entity schema missing");
 if(posts.some(p=>p.path===route)){
  requireCheck(types.includes("BlogPosting"),"BlogPosting missing: "+route);
  if(types.includes("BlogPosting"))reportCounts.blogPostSchema++;
 }
 if(route===faqRoute){
  let schema=null;
  for(const block of blocks){
   try{const obj=JSON.parse(block[1]);if(obj["@type"]==="FAQPage")schema=obj}
   catch{/* recorded by the standard JSON-LD validation above */}
  }
  const visible=[...html.matchAll(/<details class="faq-item" id="faq-(\d{2})"><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)];
  requireCheck(types.includes("FAQPage")&&visible.length===faqs.length&&schema?.mainEntity?.length===faqs.length,"FAQ count or structured data missing");
  for(let i=0;i<faqs.length;i++){
   const source=faqs[i],item=schema?.mainEntity?.[i],display=visible[i];
   requireCheck(Boolean(display)&&display[1]===String(i+1).padStart(2,"0"),"FAQ anchor missing: "+(i+1));
   requireCheck(item?.["@type"]==="Question"&&item?.name===source.q&&item?.acceptedAnswer?.text===source.a,"FAQ JSON-LD differs from source: "+(i+1));
   requireCheck(Boolean(display)&&decodeVisible(display[2]).replace(/^\d+\.\s*/,"")===source.q&&decodeVisible(display[3])===source.a,"FAQ visible text differs from schema/source: "+(i+1));
  }
  reportCounts.faqSchemaQuestions=visible.length;
 }
}
requireCheck(reportCounts.checkedPages===expected.length,"Not all routes checked");
requireCheck(reportCounts.blogPostSchema===posts.length,"Not all posts have BlogPosting schema");
const identicalTitles=new Map(),nearPairs=[],keywordClusters=new Map(),ee=[];
const publishedById=new Map(posts.map(p=>[p.id,p]));
for(const p of posts){
 const key=normalize(p.title);
 if(identicalTitles.has(key))errors.push("Duplicate published title: "+p.id+" and "+identicalTitles.get(key));
 else identicalTitles.set(key,p.id);
 const br=briefs.find(b=>b.id===p.id);
 if(!br){errors.push("Missing editorial brief for "+p.id);continue}
 const k=normalize(br.primary_keyword);
 if(!keywordClusters.has(k))keywordClusters.set(k,[]);
 keywordClusters.get(k).push(p.id);
 let body;
 try{body=await read(p.contentFile)}catch{errors.push("Missing article body "+p.id);continue}
 const wc=koreanWords(body);
 ee.push(wc);
 if(wc<1500)errors.push("Under minimum 1500 Korean eojeol: "+p.id+" ("+wc+")");
 if((body.match(/<h2\b/gi)||[]).length<3)errors.push("Fewer than 3 H2: "+p.id);
}
for(const group of keywordClusters.values()){
 for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  const pa=publishedById.get(group[i]),pb=publishedById.get(group[j]);
  if(!pa||!pb||pa.childId!==pb.childId)continue;
  const score=similarity(pa.title,pb.title);
  if(score>=0.6)nearPairs.push({ids:[pa.id,pb.id],titles:[pa.title,pb.title],paths:[pa.path,pb.path],briefIntents:[byId.get(pa.id)?.search_intent||null,byId.get(pb.id)?.search_intent||null],score:Number(score.toFixed(3))});
 }
}
nearPairs.sort((a,b)=>b.score-a.score);
const broadGroups=[...keywordClusters.values()].filter(x=>x.length>1).length;
if(nearPairs.length)warnings.push(nearPairs.length+" title-token similarity pairs deserve manual search-intent review; this does not prove duplication");
if(broadGroups)warnings.push(broadGroups+" shared planned keyword labels: normal in a 12x5 editorial matrix, not cannibalization proof");
const report={
 project:"thuexemayhanoi/korea",site:site.domain,
 generatedAtUTC:new Date().toISOString(),audit:"Korea SEO Foundation and Content-Intent Monitor",
 status:errors.length?"FAIL":"PASS",
 inventory:{articles:posts.length,categoryParents:taxonomy.length,categoryChildren:children.length,corePages:core.length,expectedURLs:expected.length,sitemapURLs:loc.length},
 rendered:reportCounts,
 editorial:{minKoreanEojeol:ee.length?Math.min(...ee):null,maxKoreanEojeol:ee.length?Math.max(...ee):null,sharedKeywordGroups:broadGroups,potentiallySimilarTitlePairs:nearPairs.slice(0,45)},
 searchEngines:{googleIndexedURLs:null,bingIndexedURLs:null,gscVerification:"Requires connected property; source/verification meta alone does not prove indexing",notes:"Sitemap URLs and crawlability do not prove indexing or AI citations"},
 performance:{mobileLab:"Record externally via PageSpeed; no CWV field data in repo",fieldINP:null,fieldLCP:null,fieldCLS:null},
 warnings,errors:errors.slice(0,100)
};
const index=process.argv.indexOf("--output");
const output=index>=0&&process.argv[index+1]?process.argv[index+1]:"/tmp/korea-seo-audit.json";
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+"\n","utf8");
console.log("KOREA SEO MONITOR "+report.status+": "+posts.length+" articles, "+loc.length+" sitemap URLs, "+reportCounts.checkedPages+" pages, "+errors.length+" errors, "+warnings.length+" warnings.");
console.log("Shared keyword groups: "+broadGroups+", potentially similar title pairs: "+nearPairs.length);
for(const msg of warnings)console.log("WARN "+msg);
for(const msg of errors.slice(0,20))console.error("ERROR "+msg);
if(errors.length)process.exitCode=1;
