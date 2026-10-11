(()=>{"use strict";const root=document.documentElement;const btn=document.querySelector('[data-theme-toggle]');const setTheme=t=>{root.dataset.theme=t;btn?.setAttribute("aria-label",t==="dark"?"라이트 모드로 전환":"다크 모드로 전환");if(btn)btn.textContent=t==="dark"?"☀":"☾"};let t=root.dataset.theme||"light";setTheme(t);btn?.addEventListener("click",()=>{t=root.dataset.theme==="dark"?"light":"dark";try{localStorage.setItem("korea-theme",t)}catch(e){}setTheme(t)});const toggle=document.querySelector("[data-menu-toggle]"),nav=document.querySelector("#main-nav");const close=()=>{nav?.classList.remove("is-open");toggle?.setAttribute("aria-expanded","false")};toggle?.addEventListener("click",()=>{const open=!nav.classList.contains("is-open");nav.classList.toggle("is-open",open);toggle.setAttribute("aria-expanded",String(open))});document.addEventListener("click",e=>{if(!e.target.closest(".header-row")){close();document.querySelectorAll(".nav-drop[open]").forEach(el=>el.open=false)}});document.addEventListener("keydown",e=>{if(e.key==="Escape"){close();document.querySelectorAll(".nav-drop[open]").forEach(el=>el.open=false);toggle?.focus()}});document.querySelectorAll(".nav-drop").forEach(el=>el.addEventListener("toggle",()=>{if(el.open){document.querySelectorAll(".nav-drop").forEach(other=>{if(other!==el)other.open=false})}}));const field=document.querySelector("[data-directory-filter]");field?.addEventListener("input",()=>{const term=field.value.trim().toLocaleLowerCase("ko-KR");let count=0;document.querySelectorAll("[data-filter-card]").forEach(el=>{const match=!term||el.textContent.toLocaleLowerCase("ko-KR").includes(term);el.hidden=!match;if(match)count++});const empty=document.querySelector("[data-filter-empty]");if(empty)empty.hidden=count!==0});})();
;(()=>{
 const link=document.querySelector("[data-lang-switch]");
 if(!link)return;
 if(location.hostname.endsWith(".translate.goog")){
  link.href="https://ko.rentbikehanoi.com"+location.pathname;
  link.setAttribute("aria-label","한국어 원본 페이지로 돌아가기");
  link.title="한국어 원본 페이지";
  const text=link.querySelector("[data-lang-text]");
  if(text)text.textContent="KO";
 }
})();

/* Sitewide, dependency-free Korean quick contact and HTML search assistant. */
if(!window.__koreanLocalAssistant){window.__koreanLocalAssistant=true;const s=document.createElement("script");s.src="/assets/js/assistant.js";s.defer=true;document.body.appendChild(s)}
