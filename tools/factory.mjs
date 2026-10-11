#!/usr/bin/env node
/**
 * Korean editorial factory. External writers create Korean HTML drafts.
 * This runner NEVER calls AI, fabricates articles, or changes core URLs.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";

const ROOT=process.cwd();
const file=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(file(p),"utf8");
const json=p=>JSON.parse(read(p));
const write=(p,s)=>{fs.mkdirSync(path.dirname(file(p)),{recursive:true});fs.writeFileSync(file(p),s,"utf8")};
const writeJson=(p,v)=>write(p,JSON.stringify(v,null,2)+"\n");
const config=json("data/factory-config.json");
const taxonomy=json("data/taxonomy.json");
const site=json("data/site.json");
const PLAN="data/article-plan.csv";
const INDEX="data/articles.json";
const STATUS=config.state_path;
const QUEUE=config.queue_path;
const HEADER="id,parent_id,parent_slug,subcategory_id,subcategory_slug,slot,status";
const statuses=new Set(["PLANNED","WRITING","REPAIR","PUBLISHED"]);
const minWords=config.min_korean_eojeol;

function loadPlan(){
 const arr=read(PLAN).trim().split(/\r?\n/);
 if(arr[0]!==HEADER)throw Error("Matrix CSV header changed");
 const rows=arr.slice(1).map(l=>{
  const a=l.split(",");
  if(a.length!==7)throw Error("Malformed article plan row: "+l);
  const [id,parent_id,parent_slug,subcategory_id,subcategory_slug,slot,status]=a;
  return {id,parent_id,parent_slug,subcategory_id,subcategory_slug,slot,status};
 });
 return rows;
}
function savePlan(rows){write(PLAN,HEADER+"\n"+rows.map(r=>[r.id,r.parent_id,r.parent_slug,r.subcategory_id,r.subcategory_slug,r.slot,r.status].join(",")).join("\n")+"\n")}
function state(){return json(STATUS)}
function posts(){return json(INDEX)}
function publishedCount(rows){return rows.filter(r=>r.status==="PUBLISHED").length}
function route(row,slug){return "/"+row.parent_slug+"/"+row.subcategory_slug+"/"+slug+"/"}
function baseRoute(row){return "/"+row.parent_slug+"/"+row.subcategory_slug+"/"}
function knownRoutes(index){
 const urls=new Set(["/","/소개/","/문의/","/자주-묻는-질문/","/개인정보-처리방침/","/이용약관/","/블로그/"]);
 for(const t of taxonomy){
  urls.add("/"+t.slug+"/");
  for(const c of t.children)urls.add("/"+t.slug+"/"+c.slug+"/");
 }
 for(const article of index.filter(a=>a.status==="PUBLISHED"))urls.add(article.path);
 return urls;
}
function validateMatrix(rows,index){
 if(rows.length!==300||taxonomy.length!==12||taxonomy.some(t=>t.children.length!==5))throw Error("Expected 300 planned IDs and existing 12x5 taxonomy");
 const names=new Set(),published=new Set(index.filter(a=>a.status==="PUBLISHED").map(a=>a.id));
 if(published.size!==index.filter(a=>a.status==="PUBLISHED").length)throw Error("Duplicate published record IDs");
 if(publishedCount(rows)!==published.size)throw Error("Published count inconsistent with articles.json");
 rows.forEach((r,i)=>{
  if(r.id!=="KOR-"+String(i+1).padStart(3,"0")||names.has(r.id)||!statuses.has(r.status))throw Error("Bad matrix ID/status at "+(i+1));
  names.add(r.id);
  const p=taxonomy.find(t=>t.id===r.parent_id),c=p?.children.find(t=>t.id===r.subcategory_id);
  if(!p||!c||p.slug!==r.parent_slug||c.slug!==r.subcategory_slug||String(r.slot)!==String(i%5+1))throw Error("Taxonomy mismatch "+r.id);
  if((r.status==="PUBLISHED")!==published.has(r.id))throw Error("Status/index inconsistency "+r.id);
 });
 const paths=new Set();
 for(const a of index){
  if(a.status!=="PUBLISHED"||paths.has(a.path)||!names.has(a.id))throw Error("Invalid articles index");
  paths.add(a.path);
  if(!fs.existsSync(file(a.contentFile)))throw Error("Missing published body "+a.contentFile);
 }
 return true;
}
function counts(rows){
 const count=s=>rows.filter(r=>r.status===s).length;
 return {target:300,published:count("PUBLISHED"),writing:count("WRITING"),repair:count("REPAIR"),planned:count("PLANNED"),remaining:300-count("PUBLISHED")};
}
function claim(rows,st){
 if(!st.enabled||st.blocked||st.target_reached)return;
 let active=rows.filter(r=>r.status==="WRITING"||r.status==="REPAIR").length;
 for(const r of rows){
  if(active>=config.batch_size)break;
  if(r.status==="PLANNED"){r.status="WRITING";active++}
 }
}
function queuePayload(rows,st){
 const c=counts(rows),active=rows.filter(r=>r.status==="WRITING"||r.status==="REPAIR").slice(0,config.batch_size);
 let status="READY";
 if(st.blocked)status="BLOCKED";
 else if(st.target_reached||c.remaining===0)status="TARGET_REACHED";
 else if(!st.enabled)status="PAUSED";
 else if(active.length===0)status="EMPTY";
 return {schema_version:1,status,target_articles:300,published:c.published,remaining:c.remaining,
  queue:active.map(r=>{
   const parent=taxonomy.find(t=>t.id===r.parent_id),child=parent.children.find(t=>t.id===r.subcategory_id);
   return {id:r.id,status:r.status,parent_id:r.parent_id,child_id:r.subcategory_id,
    parent_label:parent.title,child_label:child.title,category_url:baseRoute(r),
    draft_file:config.inbox_dir+"/"+r.id+".json",
    target_min_korean_eojeol:minWords,instructions:"_factory/EXTERNAL-WRITER.md"};
  })};
}
function persist(rows,st,index,updateIndex=false){
 if(publishedCount(rows)===300){st.target_reached=true;st.enabled=false}
 savePlan(rows);
 if(updateIndex)writeJson(INDEX,index);
 writeJson(STATUS,st);
 writeJson(QUEUE,queuePayload(rows,st));
}
function stripHtml(input){
 return input.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi," ")
  .replace(/<[^>]*>/g," ").replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi,(_,hx,num)=>String.fromCodePoint(parseInt(hx||num,hx?16:10)))
  .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi," ").replace(/\s+/g," ").trim();
}
function analyzeWords(html){
 const text=stripHtml(html);
 const tokens=text.split(/\s+/).filter(Boolean);
 const ko=tokens.filter(t=>/[가-힣]/u.test(t));
 return {count:ko.length,tokenCount:tokens.length,ratio:ko.length/Math.max(1,tokens.length),
  distinct:new Set(ko.map(t=>t.replace(/[^가-힣]/gu,"")).filter(Boolean)).size};
}
function draftErrors(d,row,index){
 const issues=[];
 const problem=s=>issues.push(s);
 const title=String(d.title||"").trim(),desc=String(d.description||"").trim();
 const body=typeof d.contentHtml==="string"?d.contentHtml:"";
 const slug=String(d.slug||"").trim().normalize("NFC");
 const type=d.type||"guide";
 if(d.id!==row.id)problem("ID must match active queue item");
 if(!/^[가-힣a-z0-9]+(?:-[가-힣a-z0-9]+)*$/u.test(slug)||slug.length>100)problem("Korean URL slug invalid");
 if(!["rental","travel","safety","guide"].includes(type))problem("Invalid article type");
 if([...title].length<14||[...title].length>95||!/[가-힣]{4,}/u.test(title))problem("Korean SEO title must be 14-95 characters");
 if([...desc].length<70||[...desc].length>210||!/[가-힣]{6,}/u.test(desc))problem("Korean meta description must be 70-210 characters");
 if(index.some(a=>a.title.trim()===title||a.path===route(row,slug)))problem("Duplicate title or canonical URL");
 if(!body||/<\s*(script|style|iframe|object|embed|form|input|button|link|meta|html|body|head|svg)\b/i.test(body)||
   /\bon[a-z]+\s*=/i.test(body)||/javascript\s*:/i.test(body))problem("Unsafe or empty HTML body");
 if(/<\s*h1\b/i.test(body))problem("H1 is created by the shared template; body must not include H1");
 const h2=(body.match(/<h2\b/gi)||[]).length;
 if(h2<config.min_h2)problem("Need at least "+config.min_h2+" H2 sections");
 const paragraphs=[...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>stripHtml(m[1])).filter(Boolean);
 if(paragraphs.length<config.min_paragraphs)problem("Need at least "+config.min_paragraphs+" paragraphs");
 const distinctParagraphs=new Set(paragraphs.map(p=>p.replace(/\s+/g," ").toLowerCase()));
 if(distinctParagraphs.size<Math.min(10,paragraphs.length))problem("Repeated filler paragraphs detected");
 const words=analyzeWords(body);
 if(words.count<minWords)problem("Korean eojeol minimum "+minWords+", got "+words.count);
 if(words.ratio<config.min_korean_eojeol_ratio)problem("Insufficient Korean word ratio");
 if(words.distinct<config.min_unique_korean_words)problem("Repeated vocabulary or thin Korean content");
 const bodyHrefs=[...body.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
 const routes=knownRoutes(index);
 const local=new Set();
 for(const href of bodyHrefs){
  let link=href;
  if(link.startsWith(site.domain))link=link.slice(site.domain.length);
  if(link.startsWith("/")){
   link=link.split(/[?#]/)[0];
   if(!routes.has(link))problem("Broken or unpublished local link: "+link);
   else local.add(link);
  }else if(!/^https:\/\//i.test(link)&&!link.startsWith("#"))problem("Unsafe link: "+link);
 }
 if(local.size<config.min_internal_links)problem("Need "+config.min_internal_links+" distinct valid internal links");
 if(!local.has(baseRoute(row)))problem("Must link to assigned Korean child category");
 if(!local.has("/"+row.parent_slug+"/"))problem("Must link to assigned Korean parent category");
 const imgs=[...body.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
 for(const img of imgs)if(!/\balt\s*=/i.test(img))problem("Image needs alt");
 const sources=Array.isArray(d.sourceUrls)?d.sourceUrls:[];
 if(sources.some(s=>typeof s!=="string"||!/^https:\/\//.test(s)))problem("Source URLs must use https");
 if((type==="safety"||/운전면허|법규|보험|면허증/u.test(title))&&sources.length===0)problem("Safety/legal claims need a verified external source");
 // Do not use "required 1500 words" as a soft SEO score. It is an absolute gate.
 const score=Math.max(0,100-(issues.length*12)-(sources.length?0:3));
 if(score<config.seo_score_min)problem("SEO score "+score+" below "+config.seo_score_min);
 return {passed:issues.length===0,errors:issues,score,korean_eojeol:words.count,distinct_words:words.distinct,internal_links:local.size,
  record:{id:row.id,parentId:row.parent_id,childId:row.subcategory_id,path:route(row,slug),
   contentFile:config.article_body_dir+"/"+row.id+".html",title,description:desc,
   publishedAt:new Date().toISOString().slice(0,10),type,status:"PUBLISHED"},
  contentHtml:body};
}
function statusAction(rows,st){console.log("KOREA_FACTORY "+JSON.stringify({status:queuePayload(rows,st).status,...counts(rows),enabled:st.enabled,blocked:st.blocked,queue:queuePayload(rows,st).queue.map(x=>x.id)}))}
function refresh(rows,st,index){
 claim(rows,st);persist(rows,st,index,false);statusAction(rows,st);
}
function processBatch(rows,st,index){
 if(!st.enabled||st.blocked||st.target_reached){statusAction(rows,st);return}
 claim(rows,st);
 const candidates=rows.filter(r=>r.status==="WRITING"||r.status==="REPAIR").slice(0,config.batch_size);
 let published=0,invalid=0;
 for(const row of candidates){
  const input=config.inbox_dir+"/"+row.id+".json";
  if(!fs.existsSync(file(input)))continue;
  const bytes=read(input),fingerprint=crypto.createHash("sha256").update(bytes).digest("hex");
  const previous=st.repair[row.id];
  if(previous?.hash===fingerprint)continue;
  let result;
  try{result=draftErrors(JSON.parse(bytes),row,index)}
  catch(e){result={passed:false,errors:["Invalid JSON: "+e.message],score:0,korean_eojeol:0}}
  if(!result.passed){
   invalid++;
   const attempts=(previous?.attempts||0)+1;
   row.status="REPAIR";
   st.repair[row.id]={hash:fingerprint,attempts,errors:result.errors,score:result.score,words:result.korean_eojeol};
   console.error("KOREA_REPAIR "+row.id+" "+JSON.stringify(st.repair[row.id]));
   if(attempts>=config.max_repair_attempts){st.blocked=true;st.last_error=row.id+": exceeds revision limit";break}
   continue;
  }
  // Existing ID and URL collision are hard failures. No overwrite on rerun.
  if(index.some(a=>a.id===row.id||a.path===result.record.path)||
    fs.existsSync(file(result.record.contentFile))){st.blocked=true;st.last_error="Refusing overwrite "+row.id;break}
  write(result.record.contentFile,result.contentHtml.trim()+"\n");
  index.push(result.record);row.status="PUBLISHED";delete st.repair[row.id];
  fs.unlinkSync(file(input));published++;
  st.last_successful_id=row.id;st.last_error=null;
  console.log("KOREA_PUBLISHED "+JSON.stringify({id:row.id,path:result.record.path,eojeol:result.korean_eojeol,score:result.score}));
 }
 st.last_run=new Date().toISOString();
 claim(rows,st);
 persist(rows,st,index,true);
 if(published){
  execFileSync(process.execPath,["tools/build.mjs"],{cwd:ROOT,stdio:"inherit"});
  execFileSync(process.execPath,["tools/build-chat-index.mjs"],{cwd:ROOT,stdio:"inherit"});
  execFileSync(process.execPath,["tools/qa.mjs"],{cwd:ROOT,stdio:"inherit"});
 }
 console.log("KOREA_BATCH "+JSON.stringify({published,invalid,status:queuePayload(rows,st).status,next:queuePayload(rows,st).queue.map(x=>x.id)}));
}
function main(){
 const action=process.argv[2]||"status";
 const rows=loadPlan(),index=posts(),st=state();
 validateMatrix(rows,index);
 if(action==="status")statusAction(rows,st);
 else if(action==="next")console.log(JSON.stringify(queuePayload(rows,st),null,2));
 else if(action==="verify"){
  const existing=json(QUEUE),expected=queuePayload(rows,st);
  if(JSON.stringify(existing)!==JSON.stringify(expected))throw Error("Writer queue differs from matrix/state");
  if(config.target_articles!==300||config.min_korean_eojeol!==1500)throw Error("Factory goals changed");
  statusAction(rows,st);
 }
 else if(action==="refresh-queue")refresh(rows,st,index);
 else if(action==="process")processBatch(rows,st,index);
 else if(action==="pause"){st.enabled=false;persist(rows,st,index);statusAction(rows,st)}
 else if(action==="resume"){
  if(publishedCount(rows)>=300)throw Error("Target already reached");
  st.enabled=true;st.blocked=false;st.last_error=null;st.repair={};refresh(rows,st,index);
 }else throw Error("Unknown action. Use next/status/verify/refresh-queue/process/pause/resume");
}
try{main()}catch(e){console.error("KOREA_FACTORY_FATAL "+e.message);process.exitCode=1}
