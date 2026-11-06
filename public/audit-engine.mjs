import {num,text,lower,sums,ratios,scores,crossChannelTotals,keywordFlags,hygieneSegments,benchmarkPosition} from './audit-v35-core.mjs';
export const reportNames=['01_Executive','02_Account_Scorecard','03_Keywords','04_Search_Terms','05_Campaigns','06_Recommendations','07_ASIN_Performance','08_Benchmark_Analysis','09_Ad_Hygiene'];
const eligible=rows=>rows.filter(r=>!r._rowexcluded);
const div=(a,b)=>b>0?a/b:0;
const sum=(rows,k)=>rows.reduce((a,r)=>a+num(r[k]),0);
const campaign=r=>text(r._resolvedcampaignname||r['campaign name']||r['campaign name (informational only)']);
const adgroup=r=>text(r._resolvedadgroupname||r['ad group name']||r['ad group name (informational only)']);
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const valid=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
export function benchmarkAnalysis(sp,sheets,rows){
 const kw=sums(eligible(sp).filter(r=>r.entity==='Keyword')), filtered=eligible(rows).filter(r=>text(r['ad product'])==='Sponsored Products');
 const mean=k=>{const a=filtered.filter(r=>valid(r[k]));return a.length?sum(a,k)/a.length:null};
 const ctr=mean('ctr'),cpc=mean('cpc'),basicAvailable=ctr!==null&&cpc!==null;
 const ctrGap=basicAvailable&&ctr>0?(div(kw.clicks,kw.impressions)-ctr)/ctr:0;
 const cpcGap=basicAvailable&&cpc>0?(div(kw.spend,kw.clicks)-cpc)/cpc:0;
 const total=crossChannelTotals(sheets);
 const metrics=['CTR','CPC','CPM'].map(name=>{const k=name.toLowerCase(),r=rows.filter(x=>valid(x[`${k} (p50)`])),meanP=p=>r.length?sum(r,`${k} (${p})`)/r.length:0;
  const p25=meanP('p25'),p50=meanP('p50'),p75=meanP('p75'),actual=name==='CTR'?total.ctr:name==='CPC'?div(total.spend,total.clicks):div(total.spend,total.impressions)*1000;
  return {name,actual,p25,p50,p75,position:benchmarkPosition(actual,p25,p50,p75,name==='CTR'),count:r.length};});
 return {basicAvailable,ctr,cpc,ctrGap,cpcGap,metrics};
}
export function asinAnalysis(sp,sales,traffic){
 const lookup=traffic.filter(r=>text(r.asin)).map(r=>[lower(r.asin),num(r['featured offer page views'])]);
 // V35 shell sort + binary-search midpoint, including duplicate ASIN behavior.
 for(let gap=Math.floor(lookup.length/2);gap>0;gap=Math.floor(gap/2))for(let i=gap;i<lookup.length;i++){const v=lookup[i];let j=i;while(j>=gap&&lookup[j-gap][0]>v[0]){lookup[j]=lookup[j-gap];j-=gap}lookup[j]=v;}
 const find=asin=>{let lo=0,hi=lookup.length-1;while(lo<=hi){const m=Math.floor((lo+hi)/2);if(lookup[m][0]===asin)return lookup[m][1];if(lookup[m][0]<asin)lo=m+1;else hi=m-1}return 0;};
 const spend=new Map();for(const r of sp){const k=lower(r.asin);if(k)spend.set(k,(spend.get(k)||0)+num(r.spend));}
 const rows=sales.filter(r=>num(r['ordered revenue'])>0).map(r=>{const views=find(lower(r.asin)),units=num(r['ordered units']),adSpend=spend.get(lower(r.asin))||0,shipped=num(r['shipped revenue']),cogs=num(r['shipped cogs']),shippedUnits=num(r['shipped units']),returns=num(r['customer returns']);return {asin:text(r.asin),title:text(r['product title']),brand:text(r.brand),category:text(r.category),subcategory:text(r.subcategory),revenue:num(r['ordered revenue']),units,views,cvr:views>0?units/views:null,spend:adSpend,shipped,cogs,gp:shipped-cogs,shippedUnits,returns,margin:div(shipped-cogs,shipped),returnRate:div(returns,shippedUnits),fulfilRate:div(shippedUnits,units),trueProfit:shipped-cogs-adSpend};});
 const revenue=sum(rows,'revenue'),units=sum(rows,'units'),views=sum(rows,'views'),matched=rows.filter(r=>r.views>0).length,avgCVR=div(units,views),avgPV=div(views,matched);
 let cumulative=0;rows.sort((a,b)=>b.revenue-a.revenue);for(const r of rows){cumulative+=r.revenue;r.cohort=cumulative<=revenue*.8?'Cash Cow':r.cvr!==null&&r.cvr>avgCVR&&r.views<avgPV?'Need More Love':r.cvr!==null&&r.cvr<avgCVR*.5?'Reduce/Pause':'Monitor';}
 const cohorts=['Cash Cow','Need More Love','Reduce/Pause'].map(name=>{const items=rows.filter(r=>r.cohort===name);return {name,count:items.length,revenue:sum(items,'revenue'),spend:sum(items,'spend'),rows:items.slice(0,50)};});
 const brands=[];for(const r of rows.filter(r=>r.cohort!=='Monitor'&&r.brand)){let b=brands.find(b=>b.brand===r.brand);if(!b&&brands.length<200){b={brand:r.brand,cashCow:0,cashCowRevenue:0,needLove:0,reduce:0,total:0};brands.push(b)}if(!b)continue;b.total++;if(r.cohort==='Cash Cow'){b.cashCow++;b.cashCowRevenue+=r.revenue}else if(r.cohort==='Need More Love')b.needLove++;else b.reduce++;}
 const vendorAvailable=['shipped revenue','shipped cogs'].every(k=>k in (sales[0]||{}));
 const gp=sum(rows,'gp'),shipped=sum(rows,'shipped'),shippedUnits=sum(rows,'shippedUnits'),returns=sum(rows,'returns');
 const vendor={available:vendorAvailable,gp,margin:div(gp,shipped),returnRate:div(returns,shippedUnits),fulfilRate:div(shippedUnits,units),trueProfit:sum(rows,'trueProfit'),risks:[['High returns',r=>r.returnRate>.15&&r.spend>0],['Low fulfilment',r=>r.fulfilRate>0&&r.fulfilRate<.85&&r.spend>0],['Unprofitable advertising',r=>r.spend>r.gp&&r.spend>0]].map(([name,fn])=>{const a=rows.filter(fn);return{name,count:a.length,spend:sum(a,'spend')}})};
 return {rows,revenue,units,views,matched,avgCVR,avgPV,cohorts,brands,vendor};
}
export function runEngine(input,options={}){
 const {sp,terms,sb=[],sbmag=[],sd=[],sales,traffic,benchmark}=input,sheets=[sp,sb,sbmag,sd];
 const findings=[];const add=(category,issue,severity,impact,action,extra={})=>{const f={id:`F-${String(findings.length+1).padStart(4,'0')}`,category,issue,severity,impact,action,type:'Waste',exempt:false,confidence:'N/A',source:'',...extra};findings.push(f);return f;};
 const keywords=keywordFlags(sp),summaries=[[],[],[],[]];
 const actions=['Pause or sharply reduce bids. For inactive targets, confirm the current state and review historical waste.','Reduce bids and review search-term relevance.','Review targeting relevance, product visibility and creative.','Review listing conversion and landing-page relevance before increasing bids.'];
 for(const {row:r,flags} of keywords)for(const flag of flags){const ix=flag.includes('no sales')?0:flag.includes('ACOS')?1:flag.includes('CTR')?2:3;summaries[ix].push(r);add('Keyword Audit',`${flag.split(': ')[1]}: ${text(r['keyword text'])}`,flag.split(':')[0],ix===2?0:num(r.spend),actions[ix],{exempt:true,source:`[${text(r.state)||'Unknown'}] ${campaign(r)} > ${adgroup(r)} > ${text(r['keyword text'])}`});}
 ['No-sales keyword pattern','High-ACOS keyword pattern','Low-CTR keyword pattern','Low-conversion keyword pattern'].forEach((name,i)=>{const rows=summaries[i];if(rows.length)add('Keyword Audit',`${name}: ${rows.length} keyword rows; ${money(sum(rows,'spend'))} spend.`,['Critical','High','Medium','Medium'][i],i<2?sum(rows,'spend'):0,actions[i],{confidence:i<2?'High':'Medium',source:'Account-wide keyword pattern'});});
 const kwSet=new Set(sp.filter(r=>r.entity==='Keyword').map(r=>lower(r['keyword text']))),negSet=new Set(sp.filter(r=>['Negative Keyword','Campaign Negative Keyword'].includes(r.entity)).map(r=>lower(r['keyword text']))),exactSet=new Set(terms.filter(r=>lower(r['match type'])==='exact').map(r=>lower(r['customer search term'])));
 const stRows=eligible(terms),baseline=ratios(sums(stRows)),groups={waste:[],negative:[],underfunded:[],engagement:[],never:[],exact:[]};
 const termRecords=[];
 for(const r of stRows){const spend=num(r.spend),sales=num(r.sales),orders=num(r.orders),clicks=num(r.clicks),impressions=num(r.impressions),cvr=num(r['conversion rate']),term=text(r['customer search term']),k=lower(term),source=`${campaign(r)} > ${adgroup(r)} > ${term}`,flags=[];
  const item=(group,issue,severity,impact,action,type='Waste',confidence='Medium')=>{if(groups[group].length>=7000)return;groups[group].push(r);flags.push(issue);add('Search Term Audit',`${issue}: ${term}`,severity,impact,action,{type,confidence,source,exempt:true});};
  if(spend>0&&orders===0&&sales===0){groups.waste.push(r);if(spend>5)item('negative',negSet.has(k)?'Negative scope gap':'Wasted spend - add as negative','Critical',spend,negSet.has(k)?'Review the negative keyword scope for this campaign and ad group.':'Add a relevant negative after checking query intent.','Waste','High');}
  if(orders>0&&clicks>=5&&clicks<=15&&baseline.cvr>0&&cvr>2*baseline.cvr)item('underfunded','Underfunded converter','Medium',sales,'Consider a controlled bid or budget increase.','Opportunity');
  if(orders===0&&clicks>=15&&baseline.ctr>0&&div(clicks,impressions)>2*baseline.ctr)item('engagement','High engagement / no conversion','Medium',spend,'Review listing, price and query relevance.');
  if(orders>=3&&!kwSet.has(k))item('never','Never added as keyword','High',sales,'Create a dedicated Exact or Phrase target.','Opportunity','High');
  if(orders>=10&&cvr>=.25&&!exactSet.has(k))item('exact','Exact-match expansion','Medium',sales,'Create a dedicated Exact target.','Opportunity');
  termRecords.push({...r,flags});
 }
 const rollups=[['waste','Search term waste summary','spend','Waste','High'],['never','Never-added-as-keyword summary','sales','Opportunity','High'],['underfunded','Underfunded converters summary','sales','Opportunity','Medium'],['exact','Exact-match expansion summary','sales','Opportunity','Medium'],['engagement','Relevance-mismatch summary','spend','Waste','Medium']];
 for(const [k,title,metric,type,confidence] of rollups){const rows=groups[k],impact=sum(rows,metric);if(!rows.length)continue;const severity=k==='waste'?(impact>=500?'Critical':impact>=100?'High':'Medium'):k==='never'?(impact>=50000?'Critical':impact>=10000?'High':'Medium'):'Medium';add('Search Term Audit',`${title}: ${rows.length} term rows; ${money(impact)}.`,severity,impact,k==='waste'?'Review the wasted-spend rows and apply negatives at the correct scope.':k==='engagement'?'Investigate conversion barriers for the listed terms.':'Review the corresponding conversion opportunities and stage controlled changes.',{type,confidence,source:'Account-wide search term roll-up'});}
 const campaigns=eligible(sp).filter(r=>r.entity==='Campaign'&&num(r.spend)>0),campSpend=sum(campaigns,'spend'),topSpend=[...campaigns].sort((a,b)=>num(b.spend)-num(a.spend)).slice(0,5).reduce((s,r)=>s+num(r.spend),0),days=num(options.days)>0?num(options.days):30;
 if(campSpend>0&&topSpend/campSpend>=.4)add('Budget Audit',`Concentration risk: top ${Math.min(5,campaigns.length)} campaigns account for ${(topSpend/campSpend*100).toFixed(1)}% of spend.`,'Medium',topSpend,'Review concentration and diversification opportunities.',{confidence:'High'});
 const campaignRecords=campaigns.map(r=>{const flags=[],spend=num(r.spend),sales=num(r.sales),acos=num(r.acos),budget=num(r['daily budget']),source=`[${text(r.state)||'Unknown'}] ${campaign(r)}`;const item=(issue,severity,action)=>{flags.push(issue);add('Budget Audit',`${issue}: ${campaign(r)}`,severity,spend,action,{source});};
  if(sales>0&&acos>.5)item('Overspending campaign','Critical','Reduce bids on inefficient targets. Confirm current state for inactive campaigns.');
  if(spend>1&&sales===0)item('Wasted campaign spend','Critical','Check targeting, retail readiness and current campaign state.');
  if(budget>0&&sales>0&&acos>0&&acos<=.3&&lower(r.state)==='enabled'&&spend/days/budget>=.9)item('Budget increase candidate','Medium','Check actual budget-cap history before increasing budget. This is a directional signal.');
  return {...r,flags,avgDaily:spend/days};});
 const bm=benchmarkAnalysis(sp,sheets,benchmark);
 for(const [name,gap,bad,action] of [['CTR',bm.ctrGap,-1,'Review targeting and creative relevance.'],['CPC',bm.cpcGap,1,'Review bid strategy against the peer benchmark.']])if(bm.basicAvailable&&gap*bad>=.15)add('Benchmark Audit',`${name} ${name==='CTR'?'below':'above'} benchmark by ${Math.abs(gap*100).toFixed(1)}%.`,gap*bad>=.3?'Critical':'High',0,action,{confidence:'Low'});
 const score=scores(sp,terms,bm.ctrGap),growth={exact:sum(groups.exact,'sales')*.2*.7,underfunded:sum(groups.underfunded,'sales')*.3*.7,never:sum(groups.never,'sales')*.2*.7};growth.total=growth.exact+growth.underfunded+growth.never;
 add('Growth Opportunity',`Modeled revenue upside: ${money(growth.total)}.`,'High',growth.total,'Prioritize converting queries and validate the uplift assumptions with controlled tests.',{confidence:'Medium',source:'Account-wide growth model'});
 const ranked=findings.filter(f=>!f.exempt);const rank=f=>({Critical:4,High:3,Medium:2}[f.severity]||1)*1000000+Math.max(0,Math.min(999999,f.impact));
 for(let i=0;i<ranked.length-1;i++)for(let j=i+1;j<ranked.length;j++)if(rank(ranked[j])>rank(ranked[i]))[ranked[i],ranked[j]]=[ranked[j],ranked[i]];
 for(const f of ranked)f.timeframe=f.type==='Waste'?(f.severity==='Critical'?'Immediate (0–7 days)':f.severity==='High'?'Short-term (7–30 days)':'Strategic (30–90 days)'):['Critical','High'].includes(f.severity)?'Short-term (7–30 days)':'Strategic (30–90 days)';
 return {input,options,total:crossChannelTotals(sheets),score,keywords,termRecords,groups,campaigns:campaignRecords,findings,ranked,growth,benchmark:bm,asins:asinAnalysis(sp,sales,traffic),hygiene:hygieneSegments(sheets,options.brandTerms||[],options.competitorTerms||[])};
}
