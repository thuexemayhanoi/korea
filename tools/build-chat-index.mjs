#!/usr/bin/env node
// Deterministic index from checked-in Korean HTML. No remote crawling, API, or LLM.
import {readFile,readdir,writeFile,mkdir} from "node:fs/promises";
import {join,relative,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const data=JSON.parse(await readFile(join(root,"data/site.json"),"utf8"));
const strip=s=>String(s||"").replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/gi," ").replace(/<[^>]+>/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(?:amp|nbsp|quot|lt|gt|#39);/g,m=>({"&amp;":"&","&nbsp;":" ","&quot;":'"',"&lt;":"<","&gt;":">","&#39;":"'"}[m]||" ")).replace(/\s+/g," ").trim();
const cut=(s,max=340)=>s.length>max?s.slice(0,max-1)+"…":s;
async function walk(path,files=[]){for(const it of await readdir(path,{withFileTypes:true})){if([".git",".github","node_modules","site","data","assets","tools"].includes(it.name))continue;const full=join(path,it.name);if(it.isDirectory())await walk(full,files);else if(it.name==="index.html")files.push(full)}return files}
const entries=[];
for(const f of await walk(root)){
 const html=await readFile(f,"utf8");if(/name="robots" content="noindex/i.test(html))continue;
 const rel=relative(root,f).split("\\").join("/"),url=rel==="index.html"?"/":"/"+rel.replace(/index\.html$/,"");
 const t=strip((html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]),d=strip((html.match(/<meta name="description" content="([^"]*)"/i)||[])[1]);
 const m=((html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||"").replace(/<nav\b[\s\S]*?<\/nav>/gi," ");
 const h=strip((m.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||t);
 const sections=[];
 for(const chunk of m.split(/(?=<h[23]\b)/i)){
  const heading=strip((chunk.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)||[])[1]||h);
  const p=[...chunk.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)].map(x=>cut(strip(x[1]))).filter(x=>x.length>=18).slice(0,3);
  if(p.length)sections.push({h:heading,p});if(sections.length>=18)break;
 }
 for(const match of m.matchAll(/<details\b[^>]*class="[^"]*faq-item[^"]*"[^>]*>([\s\S]*?)<\/details>/gi)){const block=match[1],question=strip((block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)||[])[1]);const answers=[...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>cut(strip(x[1]),550)).filter(Boolean);if(question&&answers.length)sections.push({h:question,p:answers})}
 const p=[...m.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>cut(strip(x[1]))).filter(x=>x.length>=18).slice(0,3);
 entries.push({u:url,t,d:cut(d,240),h,p,s:sections});
}
entries.sort((a,b)=>a.u.localeCompare(b.u,"ko"));
const cfg={phone:data.phone,phoneDisplay:data.phoneDisplay,zalo:data.zalo,whatsapp:data.whatsapp,maps:data.maps,hours:data.hours,address:data.address,features:{quickContact:data.features?.quickContact!==false,localChatbot:data.features?.localChatbot!==false}};
const outputs={"assets/chat/site-config.json":JSON.stringify(cfg,null,2)+"\n","assets/chat/search-index.json":JSON.stringify({version:1,site:data.domain,count:entries.length,e:entries})+"\n"};
const check=process.argv.includes("--check");let stale=[];
for(const [p,contents] of Object.entries(outputs)){
 const target=join(root,p),existing=await readFile(target,"utf8").catch(()=>null);
 if(check&&existing!==contents)stale.push(p);
 if(!check){await mkdir(dirname(target),{recursive:true});await writeFile(target,contents)}
}
if(stale.length){console.error("Chat index drift:",stale.join(", "));process.exit(1)}
console.log(check?"CHAT_INDEX_OK":"CHAT_INDEX_BUILT",entries.length,"published/indexable Korean HTML pages");
