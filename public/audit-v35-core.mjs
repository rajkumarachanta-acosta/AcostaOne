/* Numerical port of supplied V35. Deliberately preserves distinct macro grains.
 * Not the complete reporting engine. Never treat these functions alone as a full audit.
 */
export const defaults=Object.freeze({keywordFloor:30,keywordAcos:.4,termFloor:5,campaignFloor:1,campaignAcos:.5,neverOrders:3,efficiencyWeight:.7});
export function num(v){if(v===null||v===undefined||typeof v==='boolean'||String(v).trim()==='')return 0;return Number.isFinite(Number(v))?Number(v):0;}
export function normalize(row){const out={};for(const [k,v] of Object.entries(row)){const key=k.trim().toLowerCase();if(!(key in out))out[key]=v;}return out;}
export const text=v=>String(v??'').trim();
export const lower=v=>text(v).toLowerCase();
export function bankersRound(v){const floor=Math.floor(v),fraction=v-floor;return fraction===.5?(floor%2===0?floor:floor+1):Math.round(v);}
const clamp=v=>Math.max(0,Math.min(100,v));
export function normalizeImportedRows(rows){return rows.map(row=>{const r=normalize(row);return {...r,_resolvedcampaignname:text(r['campaign name'])||text(r['campaign name (informational only)']),_resolvedadgroupname:text(r['ad group name'])||text(r['ad group name (informational only)']),_rowexcluded:false};});}
export function sums(rows){const result={spend:0,sales:0,orders:0,impressions:0,clicks:0};for(const r of rows)for(const k of Object.keys(result))result[k]+=num(r[k]);return result;}
export function ratios(x){return {...x,acos:x.sales>0?x.spend/x.sales:0,roas:x.spend>0?x.sales/x.spend:0,ctr:x.impressions>0?x.clicks/x.impressions:0,cvr:x.clicks>0?x.orders/x.clicks:0};}
export function crossChannelTotals(sheets){return ratios(sums(sheets.flatMap(rows=>rows.filter(r=>!('entity' in r)||r.entity==='Campaign'))));}
export function scores(campaigns,terms,ctrGap=0,config={}){
 const c={...defaults,...config},kw=campaigns.filter(r=>!r._rowexcluded&&r.entity==='Keyword'),camp=campaigns.filter(r=>!r._rowexcluded&&r.entity==='Campaign'&&num(r.spend)>0),st=terms.filter(r=>!r._rowexcluded);
 const kwSet=new Set(campaigns.filter(r=>r.entity==='Keyword').map(r=>lower(r['keyword text'])));
 let K=0,C=0,H=0,N=0,problems=0,T=0,W=0,converters=0,uncovered=0,B=0,BW=0,BO=0;
 for(const r of kw){const spend=num(r.spend),sales=num(r.sales);if(spend<=0)continue;K+=spend;N++;if(spend>c.keywordFloor&&sales===0){C+=spend;problems++}else if(sales>0&&num(r.acos)>c.keywordAcos){H+=spend*.5;problems++}}
 for(const r of st){const spend=num(r.spend);T+=spend;if(spend>c.termFloor&&num(r.orders)===0&&num(r.sales)===0)W+=spend;if(num(r.orders)>=c.neverOrders){converters++;if(!kwSet.has(lower(r['customer search term'])))uncovered++;}}
 for(const r of camp){const spend=num(r.spend),sales=num(r.sales);B+=spend;if(spend>c.campaignFloor&&sales===0)BW+=spend;else if(sales>0&&num(r.acos)>c.campaignAcos)BO+=spend*.5;}
 const E=c.efficiencyWeight,S=1-E;
 const keyword=clamp(bankersRound(clamp((K>0?(1-(C+H)/K)*100:100)+ctrGap*10)*E+(N>0?(1-problems/N)*100:100)*S));
 const searchTerm=clamp(bankersRound((T>0?(1-W/T)*100:100)*E+(converters>0?(1-uncovered/converters)*100:100)*S));
 const budget=clamp(bankersRound(B>0?(1-(BW+BO)/B)*100:100));
 const w=(K>0?.4:0)+(T>0?.3:0)+(B>0?.3:0),health=w?bankersRound(((K>0?keyword*.4:0)+(T>0?searchTerm*.3:0)+(B>0?budget*.3:0))/w):0;
 return {keyword,searchTerm,budget,health,risk:health>=90?'Excellent':health>=75?'Good':health>=60?'Needs Improvement':'At Risk',macroOverlappingSpend:K+T+B,macroOverlappingWaste:C+W+BW,keywordAdSales:kw.reduce((s,r)=>s+num(r.sales),0)};
}
export function classifyKeyword(keyword,brandTerms=[],competitorTerms=[]){const s=lower(keyword);for(const term of competitorTerms)if(lower(term)&&s.includes(lower(term)))return 'Competitor';for(const term of brandTerms)if(lower(term)&&s.includes(lower(term)))return 'Branded';return 'Generic';}
export function hygieneSegments(sheets,brandTerms=[],competitorTerms=[]){
 const [sp=[],sb=[],sbmag=[],sd=[]]=sheets;
 const eligible=rows=>rows.filter(r=>!r._rowexcluded);
 const spCampaign=eligible(sp).filter(r=>!('entity' in r)||r.entity==='Campaign');
 const adTypes=[['Sponsored Products',sums(spCampaign)],['Sponsored Brands',sums([...eligible(sb),...eligible(sbmag)])],['Sponsored Display',sums(eligible(sd))]].map(([name,values])=>({name,...ratios(values)}));
 const total=ratios(sums(adTypes));
 const group=(rows,names,get)=>names.map(name=>({name,...ratios(sums(rows.filter(r=>get(r)===name)))}));
 return {total,adTypes,targeting:group(spCampaign,['Auto','Manual'],r=>lower(r['targeting type'])==='auto'?'Auto':'Manual'),match:group(eligible(sp).filter(r=>r.entity==='Keyword'),['exact','phrase','broad'],r=>lower(r['match type'])),intent:group(eligible(sp).filter(r=>r.entity==='Keyword'),['Generic','Branded','Competitor'],r=>classifyKeyword(r['keyword text'],brandTerms,competitorTerms))};
}
export function keywordFlags(rows,config={}){const c={...defaults,...config};return rows.filter(r=>!r._rowexcluded&&r.entity==='Keyword').map(r=>{const spend=num(r.spend),sales=num(r.sales),clicks=num(r.clicks),impressions=num(r.impressions),cvr=num(r['conversion rate']);const flags=[];if(spend||clicks||impressions){if(spend>=c.keywordFloor&&sales===0)flags.push('Critical: High spend / no sales');if(sales>0&&num(r.acos)>c.keywordAcos)flags.push('High: High ACOS');if(impressions>=500&&clicks/impressions<.002)flags.push('High: Low CTR');if(clicks>=30&&cvr>0&&cvr<.05)flags.push('Medium: Low conversion');}return{row:r,flags};});}
export function benchmarkPosition(actual,p25,p50,p75,isCTR){if(p50===0)return 'No data';return isCTR?(actual>=p75?'Top 25%':actual>=p50?'Above median':actual>=p25?'Below median':'Bottom 25%'):(actual<=p25?'Efficient':actual<=p50?'Below median':actual<=p75?'Above median':'Expensive');}
