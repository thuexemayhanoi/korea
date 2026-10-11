export function validateArticles(articles,taxonomy,bodies){
 if(!Array.isArray(articles))throw Error("articles.json must be array");
 const IDs=new Set(),paths=new Set();
 for(const a of articles){
  if(!["DRAFT","PUBLISHED"].includes(a.status)||!/^KOR-[0-9]{3}$/.test(a.id)||IDs.has(a.id))throw Error("Invalid article status/id "+a.id);
  IDs.add(a.id);
  if(a.status!=="PUBLISHED")continue;
  const p=taxonomy.find(x=>x.id===a.parentId),c=p?.children.find(x=>x.id===a.childId);
  if(!p||!c||typeof a.path!=="string"||!a.path.startsWith("/"+p.slug+"/"+c.slug+"/")||!a.path.endsWith("/")||a.path.includes("..")||paths.has(a.path))throw Error("Invalid path for "+a.id);
  paths.add(a.path);
  for(const k of ["title","description","publishedAt","contentFile"])if(typeof a[k]!=="string"||!a[k].trim())throw Error("Missing "+k+" "+a.id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(a.publishedAt)||Number.isNaN(Date.parse(a.publishedAt+"T00:00:00Z")))throw Error("Invalid date "+a.id);
  if(!["rental","travel","safety","guide"].includes(a.type||"guide"))throw Error("Invalid article type "+a.id);
  if(!bodies[a.id]||bodies[a.id].length<100||/<script\b|<iframe\b|<style\b/i.test(bodies[a.id])||!/<h2\b/i.test(bodies[a.id]))throw Error("Missing or unsafe editorial HTML "+a.id);
 }
}

export function selectRelated(a,all,max=3){
 const valid=all.filter(x=>x.status==="PUBLISHED"&&x.id!==a.id);
 const score=t=>(t.childId===a.childId?100:0)+(t.parentId===a.parentId?20:0)+(t.type===a.type?3:0);
 return valid.sort((a1,b1)=>score(b1)-score(a1)||a1.id.localeCompare(b1.id)).slice(0,Math.max(0,Math.min(6,max)));
}

export function makeArticleSchema(a,site){
 return {"@context":"https://schema.org","@type":"BlogPosting","headline":a.title,"description":a.description,"inLanguage":"ko","mainEntityOfPage":{"@type":"WebPage","@id":site.domain+a.path},"datePublished":a.publishedAt,"dateModified":a.updatedAt||a.publishedAt,"publisher":{"@type":"Organization","name":site.brand,"url":site.mainBusiness}};
}
