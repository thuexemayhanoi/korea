import test from "node:test";
import assert from "node:assert/strict";
import {eojeol,koreanSlug,draftShapeOK,repeatedContent} from "./auto-writer.mjs";

test("Korean spaced words are counted instead of characters",()=>{
  const s=eojeol("서울 여행자는 안전을 확인합니다. Hanoi guide 50cc");
  assert.equal(s.count,4);
  assert.equal(s.distinct,4);
  assert.ok(s.ratio>=0.5);
});

test("slug uses unique Korean words and exact KOR article ID",()=>{
  assert.equal(koreanSlug("하노이 모델 비교: 선택 기준", "KOR-149"),
    "하노이-모델-비교-선택-기준-kor-149");
});

test("short fake draft cannot slip through local content gate",()=>{
  const article={id:"KOR-149",slug:"한국어-가이드-kor-149",
    title:"하노이 여행 중 오토바이 종류별 비교 안내",
    description:"하노이 오토바이를 선택하는 여행자가 참고할 수 있도록 확인해야 하는 조건을 함께 살펴봅니다. 여행 계획을 정리하고 대여 전 문의할 항목과 안전 관련 유의 사항을 확인하는 실용 안내입니다.",
    contentHtml:'<h2>기초 안내</h2><p>내용이 짧습니다.</p><a href="/야마하-오토바이/">상위</a><a href="/야마하-오토바이/야마하-모델-비교/">하위</a><a href="/문의/">문의</a>'};
  assert.equal(draftShapeOK(article,"/야마하-오토바이/","/야마하-오토바이/야마하-모델-비교/"),false);
});

test("exact duplicate article is rejected",()=>{
  const sample=Array.from({length:200},(_,i)=>"하노이 여행자 "+i+" 차량 조건 점검 비교 안전 이용").join(" ");
  assert.equal(repeatedContent(sample,[sample]),true);
  assert.equal(repeatedContent(sample,["완전히 다른 여행의 조건을 살펴봅니다."]),false);
});
