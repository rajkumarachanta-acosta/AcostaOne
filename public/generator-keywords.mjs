/** Title-only extraction port from Module1.bas. No external keyword data is invented. */
import {scoreKeyword,recommendBid} from './generator-engine.mjs';
const s=x=>String(x??'').trim();
const FILLER=new Set(('a an the and or in of by for with to from at on as is are was be this that it its our new best per one two three four five six pack pcs piece pieces count set kit bundle qty item product size style type class series edition version gen standard premium certified genuine official original black white red blue green yellow navy grey gray pink purple brown orange beige cream gold silver copper bronze small medium large xl xxl xs sm lg inch inches cm mm ft feet meter meters kg lb oz king queen twin full california ultra usa already hand your photos personal empty modern soft gallery living room bedroom printed paint own also have from been into more than will can not but').split(' '));
const ANCHORS=new Set(('framed canvas wall art print poster painting artwork picture mat photo photograph image illustration drawing sketch storage organizer holder rack stand mount bracket case cover cushion pillow throw blanket rug mat tray bowl cup mug shirt tee top dress pants jacket coat light lamp fan heater cooler filter pump motor table chair shelf cabinet drawer bench stool').split(' '));
const alpha=x=>s(x).toLowerCase().replace(/[^a-z ]/g,' ').replace(/ +/g,' ').trim();
export function cleanTitleMacro(title){
  let t=String(title??''),i;
  while((i=t.toLowerCase().indexOf(' by '))>=0){const after=t.slice(i+4),j=after.indexOf(' ');
    if(j>=0){const k=after.slice(j+1).indexOf(' ');
      // Source Mid(..., firstSpace+secondSpace+2) drops the first next-word letter.
      t=t.slice(0,i)+' '+(k>=0?after.slice(j+k+3):after.slice(j+1));
    }else t=t.slice(0,i);
  }
  return alpha(t.split(';')[0].split('|')[0]);
}
function wordsFor(title,brand){const excluded=new Set(alpha(brand).split(' '));
  return cleanTitleMacro(title).split(' ').filter(w=>w.length>=3&&!FILLER.has(w)&&!excluded.has(w));}
export function buildWordFreqTable(products){
  const counts=new Map();for(const p of products){const seen=new Set();for(const w of wordsFor(p.title,p.brand)){
    if(seen.has(w))continue;if(seen.size<100)seen.add(w);
    if(counts.has(w))counts.set(w,counts.get(w)+1);else if(counts.size<500)counts.set(w,1);
  }}return {counts,totalTitles:products.length};
}
export function extractKeywordsFromTitle(title,brand='',frequency={counts:new Map(),totalTitles:0}){
  const words=[...new Set(wordsFor(title,brand))].slice(0,100);if(words.length<2)return [];
  const candidates=[];
  for(let size=2;size<=4;size++)for(let i=0;i<=words.length-size;i++){
    const slice=words.slice(i,i+size);let sum=0,descriptor=false,anchor=false;
    for(const word of slice){let score=.7;if(ANCHORS.has(word)){score=.25;anchor=true;}
      else{if(frequency.counts.size&&frequency.totalTitles>0&&frequency.counts.has(word)){
        const count=frequency.counts.get(word),freq=count/frequency.totalTitles;
        score=freq>=.99?.3:freq>=.6?.45:freq>=.3?.6:count===1?1:.75;
      }if(score>=.6)descriptor=true;}sum+=score;
    }
    let score=sum/size;if(descriptor&&anchor)score*=1.4;else if(!descriptor&&anchor)score*=.7;if(size===3)score*=1.05;
    if(candidates.length<200)candidates.push({keyword:slice.join(' '),score});
  }
  // Stable descending sort is equivalent to source bubble sort's strict comparison.
  candidates.sort((a,b)=>b.score-a.score);return [...new Set(candidates.map(c=>c.keyword))].slice(0,8);
}
function prepare(products,globalBrand){return products.map(p=>{
  const title=s(p.title);let brand=s(s(p.brand)+' '+s(globalBrand));
  if(!brand&&title)brand=title.split(' ')[0];return {...p,asin:s(p.asin),title,brand};
});}
export function containsBrandWord(keyword,brand){const text=' '+s(keyword).toLowerCase()+' ';
  return s(brand).toLowerCase().split(' ').some(w=>w.length>=3&&text.includes(' '+w+' '));}
/** Returns replacement keyword rows with macro-compatible asin/keyword/campaignType
 * plus notes, recommendedBid, source, relevance, matchType, confidence, wordCount.
 * Pass returned .keywords directly to generateSP/SB input. Macro generation itself
 * uses selected global match types and recomputes bids, ignoring extraction notes.
 */
export function smartExtractKeywords({products=[],globalBrand='',baseBid,bidConfig={},capacity=Infinity}){
  if(!(Number(baseBid)>0))throw Error('Base bid must be greater than zero before extracting keywords.');
  const batch=prepare(products,globalBrand).filter(p=>p.asin&&p.title).slice(0,500);
  if(!batch.length)throw Error('No ASINs with titles found.');
  const frequency=buildWordFreqTable(batch),keywords=[],counts={exact:0,phrase:0,broad:0};
  for(const p of batch){if(keywords.length>=capacity)break;let written=0;const seen=new Set();
    for(const keyword of extractKeywordsFromTitle(p.title,p.brand,frequency)){
      if(written>=10||keywords.length>=capacity)break;if(seen.has(keyword))continue;seen.add(keyword);
      const wordCount=keyword.split(' ').length;if(wordCount<2)continue;
      const relevance=scoreKeyword(keyword,p.title,'generic'),campaignType=containsBrandWord(keyword,p.brand)?'Branded':'Generic';
      let matchType=relevance==='H'?'exact':relevance==='M'?'phrase':'broad',confidence=relevance==='H'?85:relevance==='M'?70:55;
      if(wordCount>=4&&relevance==='M'){matchType='exact';confidence=75;}
      if(wordCount===2&&relevance==='H'){matchType='phrase';confidence=78;}
      keywords.push({asin:p.asin,keyword,notes:`title-extracted | rel ${relevance} | ${matchType} | wc ${wordCount} | Conf ${confidence}`,
        recommendedBid:recommendBid(Number(baseBid),campaignType,relevance,matchType,bidConfig),source:'title',campaignType,
        relevance,matchType,confidence,wordCount});written++;counts[matchType]++;
    }
  }return {keywords,counts,asinCount:batch.length,totalWritten:keywords.length};
}
/** Legacy ExtractKeywordsFromTitles: same ranked phrases, all Generic, exact bid. */
export function extractKeywordsFromTitles({products=[],globalBrand='',baseBid,bidConfig={},capacity=Infinity}){
  if(!(Number(baseBid)>0))throw Error('Base bid must be greater than zero before extracting keywords.');
  const batch=prepare(products,globalBrand),frequency=buildWordFreqTable(batch.filter(p=>p.asin&&p.title).slice(0,500));
  const keywords=[],perAsin=[];let noTitle=0,filled=0;
  for(const p of batch){if(!p.asin)continue;if(!p.title){noTitle++;continue;}
    const phrases=extractKeywordsFromTitle(p.title,p.brand,frequency);if(!phrases.length)continue;let written=0;
    for(const keyword of phrases){if(keywords.length>=capacity)break;const relevance=scoreKeyword(keyword,p.title,'generic');
      keywords.push({asin:p.asin,keyword,notes:'auto-extracted from title',recommendedBid:recommendBid(Number(baseBid),'generic',relevance,'exact',bidConfig),source:'title',campaignType:'Generic',relevance});written++;}
    filled++;perAsin.push(written);
  }return {keywords,filled,noTitle,totalWritten:keywords.length,minKeywords:perAsin.length?Math.min(...perAsin):0,maxKeywords:perAsin.length?Math.max(...perAsin):0};
}
/** Literal optional cleanup action. Preserves source defects: kwOut accumulates
 * without reset/separator across rows; all campaign types checked; only original
 * worksheet columns B/C/D cleared, leaving recommended bid/source/type intact.
 * This is NOT automatically applied during extraction or generation.
 */
export function removeBrandKeywordsMacro({products=[],keywords=[]}){
  let kwOut='',removed=0;const output=keywords.map(row=>{
    const r={...row};if(!s(r.asin)||!s(r.keyword))return r;
    const brand=s(products.find(p=>s(p.asin)===s(r.asin))?.brand);if(!brand)return r;
    kwOut+=s(r.keyword).toLowerCase().replace(/[^a-z0-9 ]/g,' ');kwOut=kwOut.trim().replace(/ +/g,' ');
    const hay=' '+brand.toLowerCase()+' ';
    if(kwOut.split(' ').some(w=>w&&hay.includes(' '+w+' '))){r.asin='';r.keyword='';r.notes='';removed++;}return r;
  });return {keywords:output,removed};
}
