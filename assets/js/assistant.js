(()=>{"use strict";
if(window.__krAssistantMounted)return;window.__krAssistantMounted=true;
const H=document.documentElement;
const c=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const attr=(el,opts)=>{for(const [k,v] of Object.entries(opts))el.setAttribute(k,v);return el};
const safeURL=u=>/^(\/(?!\/)|https:\/\/(?:maps\.google\.com|wa\.me|zalo\.me)\/|tel:)/.test(u||"")?u:"/문의/";
let cfg={},index=null,indexPromise=null;
const normalize=s=>String(s||"").toLowerCase().normalize("NFKC").replace(/[^a-z0-9가-힣\s]/g," ").replace(/\s+/g," ").trim();
const stop=new Set("안녕 안녕하세요 정보 알려 주세요 부탁해요 어디 어떻게 무엇 무엇이 저는 제가 이게 그런 그리고 우리 대한 대한거 좀 하나요 있나요 합니다 가능 해요 알고 싶어요".split(" "));
function words(s){
 const tokens=normalize(s).split(" ").filter(x=>x.length>1&&!stop.has(x)),out=new Set(tokens);
 for(const w of tokens){if(/[가-힣]{3}/.test(w))for(let i=0;i<w.length-1;i++)out.add(w.slice(i,i+2))}
 return [...out];
}
const synonyms={가격:["요금","비용","얼마","price","cost"],렌트:["대여","빌리","rental","rent"],위치:["주소","찾아","지도","어디","map"],면허:["운전","국제면허","license"],연락:["전화","문의","왓츠앱","whatsapp","zalo"],안전:["헬멧","교통","사고"],여행:["관광","코스","trip"]};
function expanded(s){const t=new Set(words(s));for(const [key,arr] of Object.entries(synonyms)){if(t.has(key)||arr.some(x=>normalize(s).includes(normalize(x)))){words(key).forEach(x=>t.add(x));arr.forEach(x=>words(x).forEach(y=>t.add(y)))}}return [...t]}
const addMessage=(log,text,who,source)=>{const box=c("div","kr-msg "+who,text);if(source&&source.url&&source.url.startsWith("/")){const a=c("a",null,"원문 페이지 보기 ↗");a.href=source.url;box.append(a)}log.append(box);log.scrollTop=log.scrollHeight;return box};
function search(query){
 if(!index||!Array.isArray(index.e))return null;
 const terms=expanded(query),phrase=normalize(query);let best=null,highest=0;
 for(const item of index.e){
  const title=normalize(item.t+" "+item.d+" "+item.h);let top=0;
  for(const term of terms)if(title.includes(term))top+=Math.min(7,term.length+2);
  if(phrase.length>2&&title.includes(phrase))top+=18;
  let chosen=null,score=top;
  for(const section of item.s||[]){
   const content=normalize(section.h+" "+(section.p||[]).join(" "));
   let sub=0;const heading=normalize(section.h);for(const term of terms){if(heading.includes(term))sub+=Math.min(9,term.length+5);else if(content.includes(term))sub+=Math.min(4,term.length+1)}
   if(phrase.length>2&&content.includes(phrase))sub+=14;
   if(sub>score-top){chosen=section;score=top+sub}
  }
  if(score>highest){highest=score;best={item,chosen,score}}
 }
 return best&&highest>=5?best:null;
}
const liveConfig=fetch("/assets/chat/site-config.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("config");return r.json()}).then(x=>{cfg=x;return x});
const loadIndex=()=>{if(!indexPromise)indexPromise=fetch("/assets/chat/search-index.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("index");return r.json()}).then(x=>(index=x)).catch(()=>null);return indexPromise};
function known(q){
 const t=normalize(q);if(/실시간|재고|가능한 차|예약 가능|available/.test(t))return "실시간 차량 재고나 예약 가능 여부는 확인할 수 없습니다. 매장에 직접 문의해 주세요.";
 if(/얼마|가격|요금|비용|보증금|deposit|price/.test(t))return "차량별 요금 및 보증금은 시점과 계약 조건에 따라 달라집니다. 확인되지 않은 금액을 안내하지 않습니다. 정확한 금액은 문의해 주세요.";
 if(/면허|법규|운전 자격|국제운전/.test(t))return "운전 가능 여부는 면허 종류와 적용 법규에 따라 다릅니다. 베트남 관계 기관의 최신 공식 정보를 확인하세요. 사이트의 안전 가이드를 참고할 수 있습니다.";
 if(/시간|영업|운영|몇 시/.test(t))return "안내 시간: "+(cfg.hours||"09:00–21:00")+" (베트남 현지 시간). 방문 전 운영 여부를 다시 확인해 주세요.";
 if(/주소|어디|위치|지도|찾아/.test(t))return "매장 주소: "+(cfg.address||"하노이 롱비엔")+". 왼쪽 Quick Call의 지도 버튼으로 확인할 수 있습니다.";
 if(/연락|전화|왓츠앱|잘로|zalo|whatsapp/.test(t))return "전화: "+(cfg.phoneDisplay||cfg.phone||"")+". 왼쪽 Quick Call에서 전화, Zalo, WhatsApp을 선택할 수 있습니다.";
 return null;
}
async function respond(query,log){
 const value=query.trim().slice(0,240);if(!value)return;
 addMessage(log,value,"user");const pending=addMessage(log,"사이트의 게시된 HTML에서 확인 중…","bot");
 const fixed=known(value);if(fixed){pending.textContent=fixed;return}
 await loadIndex();const hit=search(value);
 if(hit){const section=hit.chosen;const excerpt=(section?.p||hit.item.p||[]).slice(0,2).join(" ").slice(0,480);
 pending.textContent=excerpt||hit.item.d||"관련 페이지를 찾았습니다.";
 const a=c("a",null,"원문 페이지 확인 ↗");a.href=hit.item.u;pending.append(a);
 }else pending.textContent="게시된 페이지에서 신뢰할 수 있는 답변을 찾지 못했습니다. 검색어를 바꾸거나 매장에 문의해 주세요.";
 log.scrollTop=log.scrollHeight;
}
function build(config){
 if(document.querySelector(".kr-quick")||document.querySelector(".kr-chat-fab"))return;
 if(config.features?.quickContact){
  const dock=attr(c("div","kr-quick"),{"data-open":"false","aria-label":"빠른 연락처"});const trigger=attr(c("button","kr-quick-main","☎"),{type:"button","aria-label":"빠른 연락처 열기","aria-expanded":"false"});
  const items=c("div","kr-quick-items");
  const services=[["tel:"+config.phone,"☎","전화"],[config.zalo,"Z","Zalo"],[config.whatsapp,"WA","WhatsApp"],[config.maps,"⌖","Google 지도"]];
  for(const [href,glyph,label] of services){if(!href)continue;const a=attr(c("a",null,glyph),{href:safeURL(href),"aria-label":label});if(!href.startsWith("tel:")){a.target="_blank";a.rel="noopener noreferrer"}a.append(c("span",null,label));items.append(a)}
  trigger.addEventListener("click",()=>{const state=dock.dataset.open!=="true";dock.dataset.open=String(state);trigger.setAttribute("aria-expanded",String(state))});
  document.addEventListener("click",e=>{if(!dock.contains(e.target)){dock.dataset.open="false";trigger.setAttribute("aria-expanded","false")}});
  dock.append(trigger,items);document.body.append(dock);
  // Existing legacy right-hand call is redundant when the 4-channel dock is mounted.
  document.querySelectorAll(".floating-call").forEach(el=>el.remove());
 }
 if(!config.features?.localChatbot)return;
 const fab=attr(c("button","kr-chat-fab","✦"),{type:"button","aria-label":"한국어 로컬 안내 도우미 열기","aria-expanded":"false","aria-controls":"kr-chat-panel"});
 const panel=attr(c("section","kr-chat-panel"),{id:"kr-chat-panel",role:"dialog","aria-label":"한국어 로컬 안내 도우미"});panel.hidden=true;
 const header=c("div","kr-chat-head"),heading=c("div");heading.append(c("strong",null,"하노이 한국어 안내 도우미"),c("small",null,"사이트 HTML 검색 · 외부 AI API 없음"));
 const close=attr(c("button","kr-chat-close","×"),{type:"button","aria-label":"채팅 닫기"});header.append(heading,close);
 const log=attr(c("div","kr-chat-log"),{"aria-live":"polite",role:"log"});
 const ideas=c("div","kr-chat-ideas");
 const form=c("form","kr-chat-form");const input=attr(c("input"),{type:"search",maxlength:"240",placeholder:"렌트·면허·여행 질문","aria-label":"한국어 질문","autocomplete":"off"});
 const submit=attr(c("button",null,"➜"),{type:"submit","aria-label":"질문 보내기"});form.append(input,submit);panel.append(header,log,ideas,form);document.body.append(fab,panel);
 const samples=["대여 요금은?","주소가 어디인가요?","운전면허 안내","하노이 여행"];
 for(const s of samples){const b=attr(c("button",null,s),{type:"button"});b.addEventListener("click",()=>respond(s,log));ideas.append(b)}
 let greeted=false;
 function setPanel(open){panel.hidden=!open;fab.setAttribute("aria-expanded",String(open));if(open){document.querySelector(".kr-quick")?.setAttribute("data-open","false");loadIndex();if(!greeted){greeted=true;addMessage(log,"안녕하세요! 공개된 한국어 페이지에서 정보를 찾아 안내합니다. 생성형 AI 모델이 아니며 실시간 가격·재고·법규를 확인할 수 없습니다.","bot")}input.focus({preventScroll:true})}}
 fab.addEventListener("click",()=>setPanel(panel.hidden));close.addEventListener("click",()=>setPanel(false));
 form.addEventListener("submit",e=>{e.preventDefault();const q=input.value;input.value="";respond(q,log)});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!panel.hidden)setPanel(false);document.querySelector(".kr-quick")?.setAttribute("data-open","false")}});
 const vv=window.visualViewport;
 function sync(){if(!vv)return;const key=window.innerHeight-vv.height>150&&document.activeElement===input;panel.dataset.keyboard=String(key);document.body.classList.toggle("kr-keyboard",key);if(key){H.style.setProperty("--kr-vv-top",Math.max(8,vv.offsetTop+8)+"px");H.style.setProperty("--kr-vv-height",Math.max(275,vv.height-16)+"px")}}
 vv?.addEventListener("resize",sync);vv?.addEventListener("scroll",sync);input.addEventListener("focus",sync);input.addEventListener("blur",sync);
}
liveConfig.then(build).catch(()=>{window.__krAssistantMounted=false});
})();