#!/usr/bin/env node
// Built-in Node.js QA for Korean static pages and future real article publishing.
import {readFile} from "node:fs/promises";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {validateArticles} from "./lib/editorial.mjs";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=async path=>readFile(join(root,path),"utf8");
const errors=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg)};
const site=JSON.parse(await read("data/site.json"));
const cats=JSON.parse(await read("data/taxonomy.json"));
const posts=JSON.parse(await read("data/articles.json"));
const plan=(await read("data/article-plan.csv")).trim().split("\n").slice(1);
check(cats.length===12&&cats.every(x=>x.children.length===5),"taxonomy must remain 12 parents and 60 children");
check(plan.length===300&&new Set(plan.map(r=>r.split(",")[0])).size===300,"300 unique article plan slots required");
check(posts.every(a=>plan.some(row=>row.split(",")[0]===a.id)),"article not in 300-slot content plan");
const bodies={};
for(const a of posts.filter(x=>x.status==="PUBLISHED")){
 try{bodies[a.id]=await read(a.contentFile)}catch(e){errors.push("missing article content for "+a.id)}
}
try{validateArticles(posts,cats,bodies)}catch(e){errors.push("editorial validation: "+e.message)}
const core=["/","/소개/","/문의/","/자주-묻는-질문/","/개인정보-처리방침/","/이용약관/"];
const published=posts.filter(a=>a.status==="PUBLISHED");
const listing=["/블로그/"];
const parentRoutes=cats.map(p=>"/"+p.slug+"/");
const childRoutes=cats.flatMap(p=>p.children.map(c=>"/"+p.slug+"/"+c.slug+"/"));
const routes=[...core,...listing,...parentRoutes,...childRoutes,...published.map(a=>a.path)];
check(new Set(routes).size===routes.length,"duplicate site route");
const indexed=new Set([...core,...(published.length?listing:[]),...parentRoutes.filter(p=>published.some(a=>a.path.startsWith(p))),...childRoutes.filter(p=>published.some(a=>a.path.startsWith(p))),...published.map(a=>a.path)]);
let xml=await read("sitemap.xml");
const sitemap=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>decodeURI(x[1].replace(/&amp;/g,"&")));
check(sitemap.length===indexed.size,"sitemap URL count differs from indexed pages");
for(const p of indexed)check(sitemap.includes(site.domain+p),"sitemap missing "+p);
for(const url of sitemap)check(url.startsWith(site.domain+"/"),"out of site sitemap "+url);
const titles=new Map();
const covered=new Set(routes);
function extract(html,p){
 const title=html.match(/<title>([^<]*)<\/title>/i)?.[1];
 check(Boolean(title),"missing title "+p);
 if(title){if(titles.has(title))errors.push("duplicate title "+p+" = "+titles.get(title));else titles.set(title,p)}
 check(/^<!doctype html><html lang="ko">/i.test(html),"missing Korean document language "+p);
 check((html.match(/<h1\b/g)||[]).length===1,"expected one H1 "+p);
 check(html.includes('name="description"'),"meta description "+p);
 check(html.includes('rel="canonical" href="'+site.domain+p+'"'),"canonical "+p);
 check(html.includes('property="og:title"'),"Open Graph "+p);
 check(html.includes('property="og:url"'),"Open Graph URL "+p);
 check(html.includes('id="main-nav"')&&html.includes('class="site-footer"'),"shared layout "+p);
 check(html.includes('href="/assets/css/site.css"'),"shared stylesheet "+p);
 const robots=indexed.has(p)?'index,follow,max-image-preview:large':'noindex,follow';
 check(html.includes('name="robots" content="'+robots+'"'),"robots incorrect "+p);
 if(!indexed.has(p))check(!sitemap.includes(site.domain+p),"noindex in sitemap "+p);
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 check(schemas.length>=2,"page and breadcrumb JSON-LD missing "+p);
 for(const m of schemas)try{JSON.parse(m[1])}catch(e){errors.push("broken JSON-LD "+p+": "+e.message)}
 const hrefs=[...html.matchAll(/href="(\/[^"#?]+)(?:[?#][^"]*)?"/g)].map(x=>x[1]);
 for(const href of hrefs)if(!href.startsWith("/assets/")&&!covered.has(href)&&href!=="/404.html")errors.push("broken local link "+p+" -> "+href);
 for(const m of html.matchAll(/<img\b[^>]*>/g))check(/\balt\s*=/.test(m[0]),"image missing alt "+p);
}
for(const p of routes){
 const path=p==="/"?"index.html":p.slice(1)+"index.html";
 try{extract(await read(path),p)}catch(e){errors.push("missing or invalid "+path+": "+e.message)}
}
for(const a of published){
 const html=await read(a.path.slice(1)+"index.html").catch(()=>"");
 if(site.features?.articleSchema!==false)check(html.includes('"@type":"BlogPosting"'),"missing BlogPosting "+a.id);
 if(site.features?.articleCta!==false)check(html.includes('class="article-cta"'),"missing article CTA "+a.id);
}
const cname=(await read("CNAME")).trim();
check(cname==="ko.rentbikehanoi.com","CNAME must remain ko.rentbikehanoi.com");
check(xml.includes("https://ko.rentbikehanoi.com/"),"wrong sitemap host");
if(errors.length){console.error("FAIL "+errors.length+" SEO QA error(s)");console.error(errors.slice(0,50).join("\n"));process.exit(1)}
console.log("PASS "+routes.length+" live routes; "+indexed.size+" sitemap URLs; "+published.length+" published articles; 300 planned slots. SEO, links and shared layout OK.");
