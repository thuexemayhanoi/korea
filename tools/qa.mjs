#!/usr/bin/env node
import {readFile,access} from "node:fs/promises";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const site=JSON.parse(await readFile(join(root,"data/site.json"),"utf8"));
const topics=JSON.parse(await readFile(join(root,"data/taxonomy.json"),"utf8"));
const csv=(await readFile(join(root,"data/article-plan.csv"),"utf8")).trim().split("\n").slice(1);
const paths=["/","/소개/","/문의/","/자주-묻는-질문/","/개인정보-처리방침/","/이용약관/","/블로그/"];
const slugs=new Set();
for(const p of topics){paths.push("/"+p.slug+"/");for(const c of p.children)paths.push("/"+p.slug+"/"+c.slug+"/")}
let errors=[];
if(topics.length!==12||topics.some(p=>p.children.length!==5))errors.push("expected 12 parent silos, 5 children each");
if(csv.length!==300||csv.some(row=>!row.endsWith(",PLANNED")))errors.push("article-plan.csv is not 300 unfilled slots");
for(const path of paths){
 if(slugs.has(path))errors.push("duplicate slug "+path);slugs.add(path);
 const local=path==="/"?"/index.html":path+"index.html";
 const html=await readFile(join(root,local.slice(1)),"utf8").catch(()=>null);
 if(!html){errors.push("missing "+path);continue}
 if(!html.includes('lang="ko"'))errors.push("missing lang "+path);
 if(!html.includes('rel="canonical" href="'+site.domain+path+'"'))errors.push("canonical "+path);
 if(!html.includes('name="description"'))errors.push("description "+path);
 if(!html.includes('href="/assets/css/site.css"'))errors.push("CSS missing "+path);
 const planned=!["/","/소개/","/문의/","/자주-묻는-질문/","/개인정보-처리방침/","/이용약관/"].includes(path);
 if(planned&&!html.includes('name="robots" content="noindex,follow"'))errors.push("planned category must noindex "+path);
 const hrefs=[...html.matchAll(/href="(\/[^"#?]+)(?:[?#][^"]*)?"/g)].map(m=>m[1]);
 for(const href of hrefs)if(!href.startsWith("/assets/")&&!paths.includes(href)&&href!=="/404.html")errors.push("broken internal link "+path+" -> "+href);
}
const sitemap=await readFile(join(root,"sitemap.xml"),"utf8");
if((sitemap.match(/<loc>/g)||[]).length!==6)errors.push("sitemap must list only six indexable core pages");
if((await readFile(join(root,"CNAME"),"utf8")).trim()!=="ko.rentbikehanoi.com")errors.push("CNAME changed");
if(errors.length){console.error(errors.slice(0,40).join("\n"));process.exit(1)}
console.log("PASS",paths.length,"pages, 12 parent categories, 60 children, 300 planned (0 published), 6 sitemap URLs.");
