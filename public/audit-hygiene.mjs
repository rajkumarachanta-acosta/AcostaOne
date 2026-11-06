import {num,text,lower,sums,ratios} from './audit-v35-core.mjs';
const cname=r=>text(r._resolvedcampaignname||r['campaign name']||r['campaign name (informational only)']);
const aname=r=>text(r._resolvedadgroupname||r['ad group name']||r['ad group name (informational only)']);
const div=(a,b)=>b>0?a/b:0;
const inc=(map,key)=>map.set(key,(map.get(key)||0)+1);
export function detailedHygiene(sp){
 const rows=sp.filter(r=>!r._rowexcluded),camps=new Set(),ags=new Set(),agCounts=new Map(),kwCounts=new Map(),matches=new Map(),neg=new Set(),zeroSales=new Map(),zeroSpend=new Map(),ghost=new Map(),autos=new Set(),autoNeg=new Set(),agKeywords=new Map();
 for(const r of rows){const c=cname(r),a=aname(r),e=lower(r.entity),state=lower(r.state||r['campaign status']);if(!c)continue;
  if(e==='campaign'){camps.add(c);if(num(r.spend)>0&&num(r.sales)===0&&zeroSales.size<1000)zeroSales.set(c,r);if(num(r.spend)===0&&state!=='paused'&&zeroSpend.size<1000)zeroSpend.set(c,r);if(state==='paused'&&num(r.spend)>0&&ghost.size<500)ghost.set(c,r);if(lower(r['targeting type'])==='auto')autos.add(c);}
  if(e.includes('ad group')&&!e.includes('negative')){ags.add(c+'|'+a);inc(agCounts,c);}
  if(e.includes('keyword')&&!e.includes('negative')){inc(kwCounts,c);inc(agKeywords,c+'|'+a);const k=c+'|'+a+'|'+lower(r['keyword text']),m=lower(r['match type']);if(!matches.has(k))matches.set(k,{campaign:c,adgroup:a,keyword:lower(r['keyword text']),match:''});const item=matches.get(k);if(!item.match.includes(m))item.match+=item.match?' + '+m:m;}
  if(e.includes('negative')){neg.add(c);if(autos.has(c))autoNeg.add(c);}
 }
 const totalKW=[...kwCounts.values()].reduce((a,b)=>a+b,0),duplicates=[...matches.values()].filter(r=>r.match.includes(' + '));
 const primaryMatches=new Map();for(const r of sp){const c=text(r['campaign name']),a=text(r['ad group name']),e=lower(r.entity);if(!c||!e.includes('keyword')||e.includes('negative'))continue;const k=c+'|'+a;if(!primaryMatches.has(k))primaryMatches.set(k,{campaign:c,adgroup:a,count:0,specific:false});const item=primaryMatches.get(k);item.count++;if(['exact','phrase'].includes(lower(r['match type'])))item.specific=true;}
 const broadOnly=[...primaryMatches.values()].filter(r=>r.count>0&&!r.specific);
 const structure=[['Campaigns',camps.size,'Review campaign coverage.'],['Ad groups',ags.size,'Review ad-group structure.'],['Keywords',totalKW,'Review keyword coverage.'],['Average keywords per campaign',div(totalKW,camps.size),div(totalKW,camps.size)<5?'ALERT: fewer than five keywords per campaign.':'PASS'],['Average ad groups per campaign',div(ags.size,camps.size),'INFO'],['Single-keyword campaigns',[...kwCounts.values()].filter(v=>v<=1).length,'Review fragmented campaign structures.'],['Single-ad-group campaigns',[...agCounts.values()].filter(v=>v<=1).length,'Review opportunities to consolidate.']];
 const noNegative=[...camps].filter(c=>!neg.has(c)).map(c=>({campaign:c,targeting:text(sp.find(r=>text(r['campaign name'])===c&&lower(r.entity)==='campaign')?.['targeting type']),action:'Review negative keyword coverage.'}));
 const placements=['Top of Search','Product Page','Rest of Search','Other/Unclassified'].map(name=>({name,rows:[]}));
 for(const r of rows.filter(r=>lower(r.entity)==='bidding adjustment')){const p=lower(r.placement),ix=p.includes('top')?0:p.includes('product page')||p.includes('detail')?1:p.includes('rest')||p.includes('other')?2:3;placements[ix].rows.push(r);}
 for(const p of placements)Object.assign(p,ratios(sums(p.rows)));
 const placementTotal=sums(placements),hasPlacement=placementTotal.spend!==0||placementTotal.sales!==0;
 let best=null;for(const p of placements.slice(0,3))if(p.clicks>0&&(!best||p.cvr>best.cvr))best=p;
 for(const p of placements){p.spendShare=div(p.spend,placementTotal.spend);p.salesShare=div(p.sales,placementTotal.sales);p.insight='';if(p.spend>0&&p===best)p.insight=p.salesShare-p.spendShare>.1?'UNDER-INVESTED: strongest CVR and sales share exceeds spend share.':p.salesShare-p.spendShare<-.1?'REVIEW: spend share exceeds sales contribution.':'PASS';else if(p.spend>0&&p.name!=='Other/Unclassified')p.insight=p.spendShare-p.salesShare>.15?'INEFFICIENT: review bids and targeting.':'INFO';}
 const top=placements[0],otherCVR=div(placements[1].orders+placements[2].orders,placements[1].clicks+placements[2].clicks);
 const reallocation=top.cvr>otherCVR*1.2?'REALLOCATION SIGNAL: test a shift toward Top of Search; verify conversion volume first.':top.cvr>0&&top.spendShare<.3?'MONITOR: Top of Search has conversion activity with low spend share.':'PASS: no Top-of-Search reallocation signal.';
 const topByCampaign=new Map();for(const r of placements[0].rows){const c=cname(r);if(!c||(!topByCampaign.has(c)&&topByCampaign.size>=500))continue;if(!topByCampaign.has(c))topByCampaign.set(c,[]);topByCampaign.get(c).push(r);}
 const opportunities=[];if(top.cvr>0)for(const [c,rs] of topByCampaign){const p=ratios(sums(rs)),total=sp.filter(r=>r.entity==='Campaign'&&text(r['campaign name'])===c).reduce((s,r)=>s+num(r.spend),0);if(total>100&&p.spend/total<.4&&p.cvr>=top.cvr*.5&&opportunities.length<50)opportunities.push({campaign:c,spend:total,topSpend:p.spend,topCVR:p.cvr,action:'Test a higher Top-of-Search bid modifier.'});}
 opportunities.sort((a,b)=>b.spend-a.spend);
 return {structure,duplicates:duplicates.slice(0,50),duplicateCount:duplicates.length,zeroSales:[...zeroSales.values()].slice(0,50),zeroSalesCount:zeroSales.size,zeroSpend:[...zeroSpend.values()].slice(0,50),zeroSpendCount:zeroSpend.size,noNegative:noNegative.slice(0,50),noNegativeMacroCount:camps.size-neg.size,ghost:[...ghost.values()].slice(0,50),flags:[['Paused campaigns with spend',ghost.size],['Auto campaigns without negatives',Math.max(0,autos.size-autoNeg.size)],['Single-keyword ad groups',[...agKeywords.values()].filter(n=>n===1).length],['Ad groups without Exact or Phrase',broadOnly.length]],placements:placements.filter((p,i)=>i<3||p.spend||p.sales),hasPlacement,reallocation,opportunities:opportunities.slice(0,15)};
}
