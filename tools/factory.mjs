#!/usr/bin/env node
// Korea: deterministic external-writer inbox, no API/model calls.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {validateArticles} from "./lib/editorial.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),F=x=>path.join(ROOT,x);
const read=x=>fs.readFileSync(F(x),"utf8"),load=x=>JSON.parse(read(x));
const write=(x,s)=>{fs.mkdirSync(path.dirname(F(x)),{recursive:true});fs.writeFileSync(F(x),s)};
const save=(x,j)=>write(x,JSON.stringify(j,null,2)+"\n");
const cfg=load("data/factory-config.json"),stPath="data/factory-state.json",qp="data/writer-queue.json",mp="data/article-plan.csv";
const cols=["id","parent_id","parent_slug","subcategory_id","subcategory_slug","slot","status"];
const tax=load("data/taxonomy.json"),page=load("data/site.json");
const parent=x=>tax.find(t=>t.id===x.parent_id),child=x=>parent(x)?.children.find(t=>t.id===x.subcategory_id);
const destinations=new Set(["/","/소개/","/문의/","/자주-묻는-질문/","/블로그/"]);
for(const p of tax){destinations.add("/"+p.slug+"/");for(const c of p.children)destinations.add("/"+p.slug+"/"+c.slug+"/")}
function rows(){
 const csv=read(mp).trim().split(/\r?\n/).map(x=>x.split(","));
 if(csv[0].join(",")!==cols.join(",")||csv.length!==301)throw Error("Invalid 300-slot plan");
 const r=csv.slice(1).map(x=>Object.fromEntries(cols.map((k,i)=>[k,x[i]])));
 for(let i=0;i<r.length;i++)if(r[i].id!=="KOR-"+String(i+1).padStart(3,"0")||!child(r[i])||parent(r[i]).slug!==r[i].parent_slug||child(r[i]).slug!==r[i].subcategory_slug||!["PLANNED","WRITING","REPAIR","PUBLISHED"].includes(r[i].status))throw Error("Invalid plan "+r[i].id);
 return r;
}
const saveRows=r=>write(mp,cols.join(",")+"\n"+r.map(x=>cols.map(k=>x[k]).join(",")).join("\n")+"\n");
const stats=r=>Object.fromEntries(["PLANNED","WRITING","REPAIR","PUBLISHED"].map(s=>[s,r.filter(x=>x.status===s).length]));
function view(r,st){
 const c=stats(r);const q=r.filter(x=>["WRITING","REPAIR"].includes(x.status)).slice(0,cfg.batchSize).map(x=>({
 id:x.id,status:x.status,parentId:x.parent_id,childId:x.subcategory_id,parentTitle:parent(x).title,childTitle:child(x).title,
 parentUrl:"/"+parent(x).slug+"/",childUrl:"/"+parent(x).slug+"/"+child(x).slug+"/",
 topicDescription:child(x).description,angle:["기초 안내","선택 비교","준비 절차","주의 사항","체크리스트"][Number(x.slot)-1],
 minimumKoreanEojeol:1500,minimumH2:3,requiredInternalLinks:3,draftFile:cfg.inbox+"/"+x.id+".json"
 }));
 const status=st.blocked?"BLOCKED":!st.enabled?"PAUSED":c.PUBLISHED===300?"TARGET_REACHED":"READY";
 return {schemaVersion:1,status,target:300,published:c.PUBLISHED,remaining:300-c.PUBLISHED,counts:c,queue:q,lastSuccessfulId:st.lastSuccessfulId||null,lastErrors:st.lastErrors||[]};
}
function display(r,st){const v=view(r,st);save(qp,v);console.log("KOREA_FACTORY "+JSON.stringify(v));return v}
function claim(r,st){
 if(!st.enabled||st.blocked||stats(r).PUBLISHED===300)return;
 let busy=r.filter(x=>["WRITING","REPAIR"].includes(x.status)).length;
 for(const x of r)if(busy<cfg.batchSize&&x.status==="PLANNED"){x.status="WRITING";busy++}
}
const flat=html=>html.replace(/<!--[\s\S]*?-->/g," ").replace(/<(?:script|style|nav|aside)\b[\s\S]*?<\/(?:script|style|nav|aside)>/gi," ").replace(/<[^>]*>/g," ").replace(/&[a-zA-Z0-9#]+;/g," ").replace(/\s+/g," ").trim();
const norm=x=>String(x||"").normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
function inspect(d,r,used){
 const errs=[];if(!d||Array.isArray(d)||typeof d!=="object")return ["Not JSON object"];
 if(d.id!==r.id||d.parentId!==r.parent_id||d.childId!==r.subcategory_id)errs.push("Wrong ID or category");
 const title=String(d.title||"").trim(),desc=String(d.description||"").trim(),slug=String(d.slug||"").trim(),html=String(d.body||"");
 if([...title].length<12||[...title].length>100||!/[가-힣]/u.test(title))errs.push("Korean title invalid");
 if([...desc].length<65||[...desc].length>230||!/[가-힣]/u.test(desc))errs.push("Korean description invalid");
 if(!/^[가-힣0-9]+(?:-[가-힣0-9]+)*$/u.test(slug)||[...slug].length<5||[...slug].length>70)errs.push("Korean slug invalid");
 if(!["rental","travel","safety","guide"].includes(d.type||"guide"))errs.push("Invalid article type");
 if(html.length<5000||html.length>200000)errs.push("Body size invalid");
 if(/<(?:script|iframe|style|form|input|button|object|embed|html|head|body|meta|h1)\b|on(?:click|load|error)\s*=|javascript:|data:/i.test(html))errs.push("Unsafe/full HTML");
 if((html.match(/<h2(?:\s|>)/gi)||[]).length<3)errs.push("At least 3 H2 required");
 if((html.match(/<p(?:\s|>)/gi)||[]).length<8)errs.push("At least 8 paragraphs required");
 const words=flat(html).split(/\s+/).filter(Boolean);
 const ko=words.filter(w=>/[가-힣]/u.test(w)).length;
 if(ko<1500)errs.push("Korean eojeol "+ko+" < 1500");
 if(words.length&&ko/words.length<0.7)errs.push("Korean ratio below 70%");
 const paragraphs=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>flat(x[1])).filter(x=>x.length>80);
 if(new Set(paragraphs).size<8)errs.push("Repeated or short paragraphs");
 const links=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(x=>x[1]);
 const internal=[...new Set(links.filter(x=>x.startsWith("/")))];
 const pathParent="/"+parent(r).slug+"/",pathChild=pathParent+child(r).slug+"/";
 if(!internal.includes(pathParent)||!internal.includes(pathChild)||internal.length<3)errs.push("Require parent, child, third internal link");
 for(const a of internal)if(!destinations.has(a)&&!used.paths.has(a))errs.push("Broken internal link "+a);
 for(const i of html.matchAll(/<img\b[^>]*>/gi))if(!/\balt=["'][^"']+["']/i.test(i[0])||!/\bloading=["']lazy["']/i.test(i[0]))errs.push("Image missing alt/lazy");
 if(/면허\s*불필요|무조건\s*안전|100%\s*보장/i.test(title+" "+html))errs.push("Unsubstantiated legal/safety promise");
 const url=pathChild+slug+"/";
 if(used.paths.has(url))errs.push("Duplicate canonical");
 if(used.titles.has(norm(title)))errs.push("Duplicate title");
 if(used.descriptions.has(norm(desc)))errs.push("Duplicate meta description");
 return errs;
}
function runBatch(r,st){
 if(!st.enabled||st.blocked){display(r,st);return}
 const index=load("data/articles.json"),bodies={},used={paths:new Set(),titles:new Set(),descriptions:new Set()};
 for(const a of index){
  if(a.status!=="PUBLISHED")continue;
  used.paths.add(a.path);used.titles.add(norm(a.title));used.descriptions.add(norm(a.description));bodies[a.id]=read(a.contentFile);
 }
 const accepted=[],errors=[];
 for(const row of r.filter(x=>["WRITING","REPAIR"].includes(x.status))){
  if(accepted.length===cfg.batchSize)break;
  const fp=cfg.inbox+"/"+row.id+".json";if(!fs.existsSync(F(fp)))continue;
  let d;try{d=JSON.parse(read(fp))}catch(e){row.status="REPAIR";errors.push([row.id,"Malformed JSON"]);continue}
  const err=inspect(d,row,used);
  if(err.length){row.status="REPAIR";errors.push([row.id,err]);continue}
  const url="/"+parent(row).slug+"/"+child(row).slug+"/"+d.slug+"/";
  const record={id:row.id,status:"PUBLISHED",parentId:row.parent_id,childId:row.subcategory_id,path:url,
    title:d.title.trim(),description:d.description.trim(),type:d.type||"guide",publishedAt:new Date().toISOString().slice(0,10),contentFile:"content/articles/"+row.id+".html"};
  accepted.push({row,d,record,fp});used.paths.add(url);used.titles.add(norm(record.title));used.descriptions.add(norm(record.description));
 }
 st.lastErrors=errors.slice(0,10);
 if(accepted.length===0){saveRows(r);save(stPath,st);display(r,st);return}
 for(const v of accepted)bodies[v.record.id]=v.d.body;
 validateArticles(index.concat(accepted.map(x=>x.record)),tax,bodies);
 // Publish the validated whole batch, then regenerate the central site templates.
 for(const v of accepted){write(v.record.contentFile,v.d.body.trim()+"\n");v.row.status="PUBLISHED"}
 save("data/articles.json",index.concat(accepted.map(x=>x.record)));
 saveRows(r);
 for(const v of accepted)fs.unlinkSync(F(v.fp));
 st.lastSuccessfulId=accepted.at(-1).record.id;st.lastRun=new Date().toISOString();
 if(stats(r).PUBLISHED===300){st.enabled=false;st.targetReached=true}
 claim(r,st);save(stPath,st);
 for(const task of ["build.mjs","build-chat-index.mjs","qa.mjs"]){execFileSync(process.execPath,["tools/"+task],{cwd:ROOT,stdio:"inherit"})}
 execFileSync(process.execPath,["tools/build.mjs","--check"],{cwd:ROOT,stdio:"inherit"});
 execFileSync(process.execPath,["tools/build-chat-index.mjs","--check"],{cwd:ROOT,stdio:"inherit"});
 display(r,st);console.log("KOREA_PUBLISHED "+accepted.map(x=>x.row.id).join(","));
}
const r=rows(),st=load(stPath),index=load("data/articles.json");
if(index.filter(x=>x.status==="PUBLISHED").length!==stats(r).PUBLISHED)throw Error("Registry vs plan drift");
const cmd=process.argv[2]||"status";
if(cmd==="status")console.log(JSON.stringify(view(r,st),null,2));
else if(cmd==="refresh-queue"){claim(r,st);saveRows(r);display(r,st)}
else if(cmd==="process"){claim(r,st);runBatch(r,st)}
else if(cmd==="pause"||cmd==="resume"){
 if(cmd==="resume"&&stats(r).PUBLISHED===300)throw Error("Target reached");
 st.enabled=cmd==="resume";st.blocked=false;save(stPath,st);if(st.enabled)claim(r,st);saveRows(r);display(r,st);
}else if(cmd==="pending-count")console.log(r.filter(x=>["WRITING","REPAIR"].includes(x.status)&&fs.existsSync(F(cfg.inbox+"/"+x.id+".json"))).length);
else throw Error("Unknown command: "+cmd);
