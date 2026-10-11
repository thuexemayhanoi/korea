#!/usr/bin/env node
// Deterministic Korean static site builder. No automation workflow is installed.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {validateArticles,selectRelated,makeArticleSchema} from "./lib/editorial.mjs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const site=JSON.parse(await readFile(join(root,"data/site.json"),"utf8"));
const taxonomy=JSON.parse(await readFile(join(root,"data/taxonomy.json"),"utf8"));
const articleIndex=JSON.parse(await readFile(join(root,"data/articles.json"),"utf8"));
const articleBodies={};
for(const a of articleIndex)if(a.status==="PUBLISHED"){
 if(!/^content\/articles\/[a-zA-Z0-9\/_-]+\.html$/.test(a.contentFile||""))throw Error("Bad content path "+a.id);
 articleBodies[a.id]=await readFile(join(root,a.contentFile),"utf8");
}
validateArticles(articleIndex,taxonomy,articleBodies);
const readSlot=async name=>await readFile(join(root,"site/slots/"+name+".html"),"utf8").catch(e=>{if(e.code==="ENOENT")return "";throw e});
const slots={beforeMain:await readSlot("before-main"),afterArticle:await readSlot("after-article"),beforeFooter:await readSlot("before-footer")};
const template=await readFile(join(root,"site/templates/article.html"),"utf8");

const buildSite=function buildSite(site,taxonomy,articleIndex,articleBodies,slots,template){
  const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const base=site.domain;
  const url=path=>base+path;
  const abs=path=>base+path;
  const parentPath=p=>"/"+p.slug+"/";
  const childPath=(p,c)=>parentPath(p)+c.slug+"/";
  const byId=id=>taxonomy.find(p=>p.id===id);

 const flags=site.features||{};
 const livePosts=articleIndex.filter(a=>a.status==="PUBLISHED");
 const postsFor=(id,child)=>livePosts.filter(a=>a.parentId===id&&(!child||a.childId===child));
 const slot=name=>flags.slotInjection===false?"":(slots[name]||"");
 const banner=flags.siteBanner?'<aside class="site-banner"><div class="wrap"><strong>'+E(site.banner.label)+'</strong> '+E(site.banner.message)+' <a href="'+E(site.banner.href)+'">자세히 ↗</a></div></aside>':"";
 const cta=(type)=>{if(flags.articleCta===false)return "";const t=type==="travel"||type==="safety",c=site.cta;return '<aside class="article-cta"><h2>'+E(t?c.travelTitle:c.articleTitle)+'</h2><p>'+E(t?c.travelText:c.articleText)+'</p><a class="btn red" href="'+E(t?c.travelUrl:c.articleUrl)+'">'+E(t?c.travelButton:c.articleButton)+'</a></aside>'};
 const related=a=>{if(flags.relatedPosts===false)return "";const posts=selectRelated(a,livePosts,3);return posts.length?'<section class="related-posts" aria-label="관련 글"><h2>함께 읽으면 좋은 글</h2><div class="grid">'+posts.map(x=>card(x.title,x.description,x.path,"","관련 글 보기")).join("")+'</div></section>':""};
 const internal=a=>{if(flags.smartInternalLinks===false)return "";const p=byId(a.parentId),c=p?.children.find(x=>x.id===a.childId);return !p||!c?"":'<nav class="article-internal-links" aria-label="관련 카테고리"><h2>관련 주제</h2><p><a href="'+parentPath(p)+'">'+E(p.title)+'</a> · <a href="'+childPath(p,c)+'">'+E(c.title)+'</a></p></nav>'};

  const card=(title,desc,path,index="",meta="가이드 살펴보기",extra="")=>`<a class="editor-card" href="${E(path)}" ${extra}><span class="card-number">${E(index)}</span><h3>${E(title)}</h3><p>${E(desc)}</p><span class="card-bottom"><span>${E(meta)}</span><span aria-hidden="true">↗</span></span></a>`;
  const themeBoot=`<script>try{let t=localStorage.getItem("korea-theme");document.documentElement.dataset.theme=(t==="dark"||t==="light")?t:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}</script>`;
  const groupNav=()=>site.navGroups.map(g=>`<details class="nav-drop"><summary>${E(g.label)}</summary><div class="mega">${g.ids.map(id=>{let p=byId(id);return `<div class="mega-column"><h3><a href="${parentPath(p)}">${E(p.title)}</a></h3>${p.children.map(c=>`<a class="subitem" href="${childPath(p,c)}">${E(c.title)}</a>`).join("")}</div>`}).join("")}</div></details>`).join("");
  const nav=`<header class="site-header"><div class="topline"></div><div class="wrap header-row"><a class="brand" href="/" aria-label="홈"><span class="brand-mark">KR</span><span>${E(site.shortName)}<span class="brand-small">하노이 오토바이 렌트 · 한국어</span></span></a><nav class="main-nav" id="main-nav" aria-label="주 메뉴">${site.pages.filter(m=>m.path==="/").map(m=>`<a href="${E(m.path)}">${E(m.label)}</a>`).join("")}${groupNav()}${site.pages.filter(m=>m.path==="/블로그/").map(m=>`<a href="${E(m.path)}">${E(m.label)}</a>`).join("")}<details class="nav-drop nav-utility"><summary>사이트 안내</summary><div class="mega mega-utility"><div class="mega-column"><h3>사이트 안내</h3>${site.pages.filter(m=>m.path!=="/"&&m.path!=="/블로그/").map(m=>`<a class="subitem" href="${E(m.path)}">${E(m.label)}</a>`).join("")}</div></div></details></nav><div class="header-actions"><a class="header-call" href="/문의/">${E(site.cta?.headerLabel||"렌트 문의 ↗")}</a><button class="theme-toggle" data-theme-toggle type="button" aria-label="다크 모드로 전환">◐</button><button class="menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="main-nav" type="button">☰ <span class="sr-only">메뉴</span></button></div></div></header>`;
  const footer=`<footer class="site-footer"><div class="wrap"><div class="footer-layout"><div><div class="footer-brand">${E(site.footerBrandParts?.[0]||"HANOI")} <span>${E(site.footerBrandParts?.[1]||"RIDE.")}</span></div><p class="footer-desc">하노이 오토바이 렌트와 베트남 여행을 한국어로 안내합니다. 차량 및 이용 조건은 예약 전 확인해 주세요.</p><a href="${E(site.mainBusiness)}" rel="noopener noreferrer" target="_blank" style="font-size:.8rem">사업자 웹사이트 ↗</a></div>${site.navGroups.map(g=>`<div class="footer-group"><h2>${E(g.label)}</h2>${g.ids.map(id=>{const p=byId(id);return `<a href="${parentPath(p)}">${E(p.title)}</a>`}).join("")}</div>`).join("")}</div><div class="footer-bottom"><span>© 2026 ${E(site.brand)} · 한국어 안내 사이트</span><span>${site.pages.map(x=>`<a href="${E(x.path)}">${E(x.label)}</a>`).join(" · ")}</span></div></div></footer>`;
  const head=(path,title,desc,noindex=false,structured=[])=>{
    const canonical=abs(path), robots=noindex?"<meta name=\"robots\" content=\"noindex,follow\">":"<meta name=\"robots\" content=\"index,follow,max-image-preview:large\">";
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${themeBoot}<title>${E(title)}</title><meta name="description" content="${E(desc)}">${robots}<link rel="canonical" href="${E(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="${E(site.name)}"><meta property="og:title" content="${E(title)}"><meta property="og:description" content="${E(desc)}"><meta property="og:url" content="${E(canonical)}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#f52235"><link rel="stylesheet" href="/assets/css/site.css">${structured.map(s=>`<script type="application/ld+json">${JSON.stringify(s).replace(/</g,"\\u003c")}</script>`).join("")}</head>`;
  };
  const crumbs=arr=>`<div class="wrap breadcrumbs" aria-label="현재 위치"><a href="/">홈</a>${arr.map(x=>`<span aria-hidden="true">/</span>${x.path?`<a href="${E(x.path)}">${E(x.title)}</a>`:`<span aria-current="page">${E(x.title)}</span>`}`).join("")}</div>`;
  const crumbsSchema=(path,arr)=>({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{ "@type":"ListItem",position:1,name:"홈",item:abs("/")},...arr.map((a,i)=>({"@type":"ListItem",position:i+2,name:a.title,item:abs(a.path||path)}))]});
  const side=`<aside class="sidebox"><strong>빠른 안내</strong><a href="/하노이-오토바이-렌트/">렌트 방법 ↗</a><a href="/렌트-가격-예약/">가격·예약 ↗</a><a href="/면허-교통안전/">면허·안전 ↗</a><a href="/자주-묻는-질문/">FAQ ↗</a><a href="/문의/">문의하기 ↗</a><p>실제 요금, 차량 재고, 운전 요건은 상황에 따라 달라집니다. 예약 전 확인해 주세요.</p></aside>`;
  const page=(path,title,desc,inner,{crumb=[],noindex=false,sidebar=true,type="WebPage",extraSchema=[]}={})=>{
    const schema=[{"@context":"https://schema.org","@type":type,"name":title,"description":desc,"inLanguage":"ko","url":abs(path)},crumbsSchema(path,crumb.length?crumb:[{title:title}]),...extraSchema];
    const layout=`${crumbs(crumb.length?crumb:[{title}])}${slot("beforeMain")}<main id="main"><section class="wrap page-head"><div class="kicker">HANOI RIDE / 한국어 가이드</div><h1 class="page-title">${E(title.split("|")[0].trim())}</h1><p class="lead">${E(desc)}</p></section><div class="wrap content-shell"><article class="prose">${inner}${slot("afterArticle")}</article>${sidebar?side:""}</div></main>`;
    return head(path,title,desc,noindex,schema)+"<body><a class=\"skip-link\" href=\"#main\">본문으로 이동</a>"+nav+banner+layout+slot("beforeFooter")+footer+`<a class="floating-call" href="tel:${site.phone}" aria-label="전화 문의">${E(site.cta?.callLabel||"☎ 전화 문의")}</a><script defer src="/assets/js/site.js"></script></body></html>`;
  };
  const files=[];
  const add=(path,content)=>files.push({path,content});
  const topicSections=taxonomy.map((p,i)=>card(p.title,p.description,parentPath(p),String(i+1).padStart(2,"0"),"하위 주제 5개")).join("");
  const homeBody=`<main id="main"><section class="hero"><div class="wrap hero-grid"><div><div class="kicker">KOREAN TRAVEL GUIDE / HANOI, VIETNAM</div><h1>하노이 오토바이,<br><em>더 쉽게 알아보기.</em></h1><p class="lead">하노이에서 오토바이 렌트를 준비하고 계신가요? 차종 선택부터 요금 문의, 50cc, 면허와 교통안전, 지역별 여행까지 한국어로 핵심 정보를 찾아보세요.</p><div class="actions"><a class="btn red" href="${E(site.cta.homePrimaryHref)}">${E(site.cta.homePrimaryLabel)}</a><a class="btn outline" href="${E(site.cta.homeSecondaryHref)}">${E(site.cta.homeSecondaryLabel)}</a></div><div class="chips"><span class="chip">한국어 안내</span><span class="chip">하노이 · 롱비엔</span><span class="chip">차량·안전·여행 가이드</span></div></div><aside class="hero-aside"><div class="kicker" style="color:#ff6473">LOCAL RENTAL DESK</div><strong>렌트하기 전,<br>꼭 필요한 것부터 확인하세요.</strong><p>대여 기간 · 차량 종류 · 면허 요건 · 보증금 · 인수 위치</p><small>안내 시간 ${E(site.hours)}<br>주소 ${E(site.address)}</small></aside></div></section><section class="section"><div class="wrap"><div class="section-heading"><h2><span class="section-number">01</span>렌트 시작하기</h2><p>어떤 차량과 대여 기간이 적합한지 확인하고, 문의 전에 중요한 질문을 정리하세요.</p></div><div class="grid">${taxonomy.slice(0,6).map((p,i)=>card(p.title,p.description,parentPath(p),String(i+1).padStart(2,"0"))).join("")}</div></div></section><div class="ribbon"><div class="wrap"><div><strong>운전면허와 교통안전, 먼저 확인하세요.</strong><p>차종이나 여행 일정만으로 법적 운전 가능 여부를 판단하지 마세요.</p></div><a class="btn red" href="/면허-교통안전/">안전 가이드 ↗</a></div></div><section class="section soft"><div class="wrap"><div class="section-heading"><h2><span class="section-number">02</span>하노이·베트남 여행</h2><p>지역별 이동, 근교 일정, 여행 준비를 차근차근 살펴보세요.</p></div><div class="grid">${taxonomy.slice(6).map((p,i)=>card(p.title,p.description,parentPath(p),String(i+7).padStart(2,"0"))).join("")}</div></div></section><section class="section"><div class="wrap"><div class="section-heading"><h2><span class="section-number">03</span>실제 렌트 문의</h2><p>온라인 정보는 준비를 돕는 참고 자료입니다. 실제 이용 조건과 가능 차종은 직접 확인해 주세요.</p></div><div class="grid">${card("문의·예약","여행 날짜와 원하는 차종을 알려주시면 확인할 사항을 안내해 드립니다.","/문의/","CONTACT")}${card("자주 묻는 질문","면허, 보증금, 인수, 장기 렌트 등 자주 묻는 질문을 확인하세요.","/자주-묻는-질문/","FAQ")}${card("운영자 소개","하노이 롱비엔 지역의 오토바이 렌트 서비스 정보를 확인하세요.","/소개/","ABOUT")}</div></div></section></main>`;
  const homeSchema={"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":site.name,"url":abs("/"),"inLanguage":"ko"},{"@type":"LocalBusiness","name":site.businessName,"url":site.mainBusiness,"telephone":site.phone,"address":{"@type":"PostalAddress",...site.postalAddress},"openingHours":site.openingHoursSchema}]};
  add("index.html",head("/","하노이 오토바이 렌트 | 한국어 가이드 · Nguyễn Tú","하노이 오토바이 렌트 한국어 안내. 50cc, 스쿠터, 가격 문의, 운전면허, 안전 및 베트남 여행 가이드를 확인하세요.",false,[homeSchema])+'<body><a class="skip-link" href="#main">본문으로 이동</a>'+nav+banner+slot("beforeMain")+homeBody+slot("beforeFooter")+footer+`<a class="floating-call" href="tel:${site.phone}" aria-label="전화 문의">${E(site.cta?.callLabel||"☎ 전화 문의")}</a><script defer src="/assets/js/site.js"></script></body></html>`);

  add("소개/index.html",page("/소개/","소개 | 하노이 오토바이 렌트 Nguyễn Tú","하노이 롱비엔의 Nguyễn Tú 오토바이 렌트 서비스와 한국어 안내 웹사이트의 운영 목적을 소개합니다.",`<h2>하노이 현지 렌트 안내</h2><p>이 사이트는 베트남 하노이 롱비엔에 있는 Nguyễn Tú 오토바이 렌트 서비스와 관련된 한국어 정보 사이트입니다. 처음 하노이를 방문하는 여행자가 필요한 내용을 쉽게 찾아볼 수 있도록 차량 종류, 이용 절차, 안전과 여행 주제를 정리합니다.</p><h2>안내하는 내용</h2><p>렌트 기간에 따른 질문, 차량 선택 기준, 인수 전 점검, 교통 환경, 지역별 여행 준비와 같은 실용 정보를 소개합니다. 각 글은 향후 실제 확인된 정보에 맞춰 보강할 예정이며 모델 소개가 현재 재고를 의미하지는 않습니다.</p><h2>매장 및 연락처</h2><p><strong>주소:</strong> ${E(site.address)}<br><strong>운영 시간:</strong> ${E(site.hours)}<br><strong>전화:</strong> <a href="tel:${site.phone}">${E(site.phoneDisplay)}</a></p><p>대여 가능 차종과 요금, 보증금, 인수·반납 조건은 실제 예약 시 확인해 주세요.</p><p><a href="/문의/">문의 페이지로 이동 ↗</a></p>`,{type:"AboutPage"}));

  add("문의/index.html",page("/문의/","문의 | 하노이 오토바이 렌트 Nguyễn Tú","하노이 Nguyễn Tú 오토바이 렌트 매장 위치, 연락 방법과 문의할 때 필요한 정보를 확인하세요.",`<h2>전화·메신저 문의</h2><p>이용 날짜, 기간, 원하는 차종, 인수 장소를 알려주시면 상담에 도움이 됩니다. 현재 사용 가능한 차종 및 조건은 문의 시 확인하세요.</p><div class="actions"><a class="btn red" href="tel:${site.phone}">☎ ${E(site.phoneDisplay)}</a><a class="btn outline" href="${E(site.whatsapp)}" rel="noopener noreferrer" target="_blank">WhatsApp ↗</a><a class="btn outline" href="${E(site.zalo)}" rel="noopener noreferrer" target="_blank">Zalo ↗</a></div><h2>매장 방문 안내</h2><p><strong>주소:</strong> ${E(site.address)}<br><strong>안내 시간:</strong> ${E(site.hours)}</p><p><a href="${E(site.maps)}" rel="noopener noreferrer" target="_blank">Google 지도에서 위치 확인 ↗</a></p><h2>문의 전 확인할 사항</h2><ul><li>방문 또는 대여를 원하는 날짜와 기간</li><li>필요한 차종 및 주행 경험</li><li>본인의 운전면허와 법적 운전 가능 여부</li><li>보증금과 보험 등 이용 조건</li></ul><p class="notice">이 웹사이트에는 예약 결제나 입력 폼이 없습니다. 전화·메신저를 통한 문의는 각 서비스의 정책이 적용됩니다.</p>`,{type:"ContactPage"}));

  const faqs=[
    ["하노이에서 오토바이를 빌리려면 무엇부터 확인해야 하나요?","이용 날짜, 주행 경험, 원하는 차종, 운전면허 조건을 먼저 확인하세요. 대여 가능 여부와 계약 조건은 직접 문의해 주세요."],
    ["한국 운전면허만으로 베트남에서 운전할 수 있나요?","개인의 면허 종류, 인정되는 국제운전면허증과 현지 규정에 따라 달라집니다. 반드시 베트남 관계 기관과 최신 공식 지침을 확인하세요."],
    ["50cc면 누구나 운전할 수 있나요?","엔진 배기량만으로 법적 요건을 단정할 수 없습니다. 적용 규정과 본인 자격을 먼저 확인하세요."],
    ["렌트 가격은 얼마인가요?","차종, 이용 기간, 날짜와 실제 조건에 따라 달라질 수 있습니다. 최신 요금은 매장에 직접 문의해 주세요."],
    ["보증금이 있나요?","계약과 차량 종류에 따라 보증금 및 신분 확인 조건이 다를 수 있습니다. 계약 전에 반환 기준까지 확인하세요."],
    ["하루만 빌릴 수 있나요?","단기 렌트 가능 여부는 일정과 현재 대여 상황에 따라 달라질 수 있으므로 문의를 권장합니다."],
    ["한 달 이상 빌리려면 무엇이 필요한가요?","대여 기간, 점검·정비 방식, 반납 위치, 계약 조건을 문의 전에 정리해 주세요."],
    ["어떤 종류의 오토바이를 살펴볼 수 있나요?","자동 스쿠터, 반자동, 50cc 등 여러 유형을 가이드에서 비교할 수 있습니다. 소개된 모든 모델이 실제 재고라는 뜻은 아닙니다."],
    ["구시가지에서 차량을 받을 수 있나요?","인수·반납 장소는 운영 상황에 따라 달라집니다. 가능한 장소를 매장에 직접 문의해 주세요."],
    ["운전하기 전 무엇을 점검해야 하나요?","브레이크, 타이어, 등화 장치, 연료·배터리 상태를 확인하고 헬멧을 준비하세요."],
    ["보험은 자동으로 포함되나요?","포함 여부와 보장 범위는 상품·계약에 따라 다릅니다. 서면 계약 내용을 확인해야 합니다."],
    ["비가 오면 어떻게 해야 하나요?","기상 상황과 도로 상태를 확인하고, 시야나 노면이 좋지 않다면 이동 계획을 조정하세요."]
  ];
  add("자주-묻는-질문/index.html",page("/자주-묻는-질문/","자주 묻는 질문 | 하노이 오토바이 렌트","하노이 오토바이 렌트 가격, 보증금, 50cc, 면허, 안전과 문의에 대한 한국어 FAQ를 확인하세요.",`<h2>렌트 전 많이 묻는 질문</h2><p>아래 답변은 일반적인 안내입니다. 실제 계약 조건과 법적 운전 가능 여부는 매장 및 관계 기관에 반드시 확인하세요.</p>${faqs.map(([q,a])=>`<details class="faq-item"><summary>${E(q)}</summary><p>${E(a)}</p></details>`).join("")}<p><a href="/문의/">추가 문의하기 ↗</a></p>`,{type:"FAQPage"}).replace("</head>","<script type=\"application/ld+json\">"+JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))})+"</script></head>"));

  add("개인정보-처리방침/index.html",page("/개인정보-처리방침/","개인정보 처리방침 | 하노이 오토바이 렌트","한국어 웹사이트에서 사용하는 브라우저 설정과 외부 연락 서비스 관련 개인정보 안내입니다.",`<h2>웹사이트 이용과 개인정보</h2><p>이 사이트는 정적 GitHub Pages 웹사이트이며, 현재 자체 회원가입이나 온라인 예약 입력 폼을 제공하지 않습니다. 사이트 이용 중 서버를 운영하는 플랫폼이 접속 관련 기술 정보를 처리할 수 있습니다.</p><h2>테마 설정</h2><p>라이트/다크 모드 선택을 기억하기 위해 이용자 브라우저의 로컬 저장소(localStorage)에 <code>korea-theme</code> 값을 보관합니다. 이 값은 사이트 표시 설정에 사용되며 별도의 사용자 계정과 연결되지 않습니다.</p><h2>외부 연락 링크</h2><p>전화, WhatsApp, Zalo 및 Google 지도 링크를 이용하는 경우 해당 제공업체의 개인정보 처리방침이 적용됩니다. 메시지로 민감한 신분 정보나 결제 정보를 보내기 전에 수신자를 확인해 주세요.</p><h2>문의</h2><p>개인정보 관련 문의는 <a href="mailto:${E(site.email)}">${E(site.email)}</a>로 연락할 수 있습니다. 사이트에 새로운 분석 도구나 입력 폼이 도입되면 정책을 함께 검토해야 합니다.</p>`,{type:"WebPage"}));

  add("이용약관/index.html",page("/이용약관/","이용약관 | 하노이 오토바이 렌트","한국어 정보 사이트의 이용 범위와 오토바이 대여 계약에 관한 주의사항을 확인하세요.",`<h2>정보 제공 범위</h2><p>이 웹사이트의 글은 오토바이 렌트와 베트남 여행을 준비하는 데 도움을 주기 위한 일반 정보입니다. 현재 표시되지 않은 조건이나 장래의 서비스 제공을 보장하지 않습니다.</p><h2>대여 계약</h2><p>실제 차량 대여는 별도로 확인한 견적, 계약서, 운전 자격, 보증금·반납 조건 등 개별 합의에 따릅니다. 웹사이트의 모델 설명은 특정 차량의 즉시 대여 가능 여부를 의미하지 않습니다.</p><h2>안전·법규</h2><p>운전면허와 교통 규정은 변경될 수 있습니다. 적용 법령과 공식 기관의 최신 정보를 확인하고, 안전에 적합하지 않은 경우 운전을 삼가세요.</p><h2>변경 및 문의</h2><p>사이트 구성과 안내는 업데이트될 수 있습니다. 자세한 내용은 <a href="/문의/">문의 페이지</a>를 이용해 주세요.</p>`,{type:"WebPage"}));

  const directory=`<h2>주제별 전체 가이드</h2><p>원하는 주제를 선택하면 관련 하위 카테고리로 이동할 수 있습니다. ${livePosts.length?`현재 ${livePosts.length}개의 한국어 글을 확인할 수 있습니다.`:"현재는 한국어 콘텐츠 구조를 준비하는 단계이며 개별 기획 기사는 아직 게시되지 않았습니다."}</p><label for="directory-filter"><strong>카테고리 검색</strong></label><input id="directory-filter" class="directory-filter" data-directory-filter type="search" placeholder="예: 50cc, 면허, 하노이, 여행" autocomplete="off"><div class="grid">${taxonomy.map((p,i)=>card(p.title,p.description,parentPath(p),String(i+1).padStart(2,"0"),"하위 주제 5개",'data-filter-card')).join("")}</div><p data-filter-empty hidden>검색 결과가 없습니다. 다른 단어로 검색해 주세요.</p>${livePosts.length?`<h2>최근 가이드</h2><div class="grid">${livePosts.slice().sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,12).map(a=>card(a.title,a.description,a.path)).join("")}</div>`:`<div class="notice">기획된 기사 300편은 아직 공개되지 않았습니다. 빈 카테고리 페이지는 검색엔진의 색인 대상에서 제외합니다.</div>`}`;
  add("블로그/index.html",page("/블로그/","전체 가이드 | 하노이 오토바이 렌트 블로그","하노이 오토바이 렌트, 모델, 50cc, 가격, 면허, 여행 정보의 한국어 카테고리 목록입니다.",directory,{noindex:!livePosts.length,sidebar:false}));

  for (const p of taxonomy){
    const parentPublished=postsFor(p.id);
    const pth=parentPath(p), bc=[{title:p.title}], intro=`<h2>${E(p.title)} 안내</h2><p>${E(p.description)} 여행 일정과 개인 상황에 따라 알맞은 선택이 달라질 수 있으므로 최신 정보를 직접 확인하세요.</p><h2>세부 카테고리</h2><div class="grid">${p.children.map((c,i)=>card(c.title,c.description,childPath(p,c),String(i+1).padStart(2,"0"),"세부 가이드")).join("")}</div><div class="empty-list"><strong>관련 기사는 준비 중입니다.</strong><p>이 페이지는 향후 글을 분류하기 위한 카테고리 허브입니다. 현재 게시된 개별 기사는 없습니다.</p></div><h2>도움이 되는 다음 단계</h2><p>주제별 안내를 확인한 뒤, 실제 차량 조건이 필요하면 <a href="/문의/">문의 페이지</a>에서 날짜와 차종을 알려주세요. 면허 및 교통안전 사항은 <a href="/면허-교통안전/">안전 안내</a>를 먼저 확인할 수 있습니다.</p>`;
    add(p.slug+"/index.html",page(pth,p.title+" | 한국어 가이드",p.description,parentPublished.length?intro.replace(/<div class="empty-list">[\s\S]*?<\/div>/,'<div class="grid">'+parentPublished.map(a=>card(a.title,a.description,a.path)).join("")+"</div>"):intro,{crumb:bc,noindex:!parentPublished.length,sidebar:false}));
    for(const c of p.children){
      const cpth=childPath(p,c), sib=p.children.filter(x=>x.id!==c.id),childPublished=postsFor(p.id,c.id);
      const html=`<h2>${E(c.title)} 알아보기</h2><p>${E(c.description)} 이 주제는 <a href="${pth}">${E(p.title)}</a> 카테고리에 속합니다. 핵심 안내와 검증된 자료를 모아 업데이트할 예정입니다.</p><div class="empty-list"><strong>아직 게시된 글이 없습니다.</strong><p>이 주제의 상세 기사는 준비 중입니다. 빈 페이지는 검색엔진 색인 대상에 포함하지 않습니다.</p></div><h2>같은 주제의 다른 가이드</h2><div class="grid">${sib.map((s,i)=>card(s.title,s.description,childPath(p,s),String(i+1).padStart(2,"0"),"관련 카테고리")).join("")}</div><p><a href="${pth}">${E(p.title)} 전체 보기 ↗</a> · <a href="/블로그/">전체 가이드 보기 ↗</a></p>`;
      add(p.slug+"/"+c.slug+"/index.html",page(cpth,c.title+" | "+p.title+" 가이드",c.description,childPublished.length?html.replace(/<div class="empty-list">[\s\S]*?<\/div>/,'<div class="grid">'+childPublished.map(a=>card(a.title,a.description,a.path)).join("")+"</div>"):html,{crumb:[{title:p.title,path:pth},{title:c.title}],noindex:!childPublished.length,sidebar:false}));
    }
  }
  
 for(const a of livePosts){
  const parent=byId(a.parentId),child=parent.children.find(x=>x.id===a.childId);
  const body=template.replace("{{CONTENT}}",articleBodies[a.id]).replace("{{INTERNAL_LINKS}}",internal(a)).replace("{{CTA}}",cta(a.type)).replace("{{RELATED}}",related(a));
  const crumb=[{title:parent.title,path:parentPath(parent)},{title:child.title,path:childPath(parent,child)},{title:a.title}];
  const extraSchema=flags.articleSchema===false?[]:[makeArticleSchema(a,site)];
  add(a.path.slice(1)+"index.html",page(a.path,a.title+" | 하노이 오토바이 렌트",a.description,body,{crumb,sidebar:true,type:"WebPage",extraSchema}));
 }

  const notFound=`<main class="wrap" id="main" style="padding:110px 0"><div class="kicker">ERROR / 404</div><h1 class="page-title">페이지를 찾을 수 없습니다.</h1><p class="lead">주소를 확인하거나 전체 가이드에서 원하는 정보를 찾아보세요.</p><div class="actions"><a class="btn red" href="/">홈으로</a><a class="btn outline" href="/블로그/">전체 가이드</a></div></main>`;
  add("404.html",head("/404.html","페이지를 찾을 수 없습니다 | 404", "요청한 페이지가 없습니다.",true)+"<body>"+nav+notFound+footer+`<script defer src="/assets/js/site.js"></script></body></html>`);
  add("robots.txt","User-agent: *\nAllow: /\n\nSitemap: https://ko.rentbikehanoi.com/sitemap.xml\n");
  const indexPaths=["/","/소개/","/문의/","/자주-묻는-질문/","/개인정보-처리방침/","/이용약관/",...(livePosts.length?["/블로그/"]:[]),...taxonomy.filter(p=>postsFor(p.id).length).map(parentPath),...taxonomy.flatMap(p=>p.children.filter(c=>postsFor(p.id,c.id).length).map(c=>childPath(p,c))),...livePosts.map(a=>a.path)];
  add("sitemap.xml",'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+indexPaths.map(x=>"  <url><loc>"+E(encodeURI(abs(x)))+"</loc></url>").join("\n")+"\n</urlset>\n");
  return files;
};
const files=buildSite(site,taxonomy,articleIndex,articleBodies,slots,template);
if(process.argv.includes("--check")){
 const dirty=[];
 for(const file of files){const existing=await readFile(join(root,file.path),"utf8").catch(()=>null);if(existing!==file.content)dirty.push(file.path)}
 if(dirty.length){console.error("Generated files out of date: "+dirty.slice(0,30).join(", "));process.exitCode=1}
 else console.log("Generated files in sync:",files.length);
}else{for(const file of files){const dest=join(root,file.path);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,file.content,"utf8")}}
console.log("Generated",files.length,"static and SEO files for",site.domain);
