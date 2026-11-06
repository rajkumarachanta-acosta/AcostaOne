/** Pure row-generation port of supplied Module1.bas. Column numbers are the macro's
 * embedded template positions (1-based). No UI, network, workbook or hidden state.
 * Deliberately preserves documented source quirks; see GENERATOR_PARITY_NOTES.
 */
const str = x => String(x ?? '').trim();
const lc = x => str(x).toLowerCase();
const val = x => Number.parseFloat(x) || 0;
const list = (x, sep = ',') => String(x ?? '').split(sep).map(str).filter(Boolean);
const yes = x => x === true || str(x).toUpperCase() === 'YES';
const positive = (x,d) => val(x)>0?val(x):d;
const proper = x => lc(x).replace(/^./, c=>c.toUpperCase());
export const GENERATOR_PARITY_NOTES = [
  'QualifyKeywords accumulates word count across terms, matching the macro defect.',
  'Budget split OFF uses full defaultBudget per campaign: source counters reset before precount use.',
  'Split budgets round each campaign independently with a $1 floor; totals may differ from sessionTotal.',
  'Manual product targets use column19, while auto targets use column20, matching source.',
  'Branded keyword combinations are created only for the first ASIN in each shared ad group.',
  'SB/SD campaign deduplication is adjacent-row only, matching source.',
  'Title extraction, full Excel validation and template export are separate from this row engine.'
];
export function buildCampName(brand,category,subcategory,adType,tactic) {
  return [brand,category,subcategory,adType,tactic].map(str).filter(Boolean).join('_');
}
export function loadBidConfig(c={}) {
  const enabled = c.enabled !== false && str(c.enabled).toUpperCase() !== 'NO';
  return {enabled,minWords:enabled?(val(c.minWords)>=2?roundEven(val(c.minWords)):3):3,
    branded:positive(c.branded,1.3),generic:positive(c.generic,1),discovery:positive(c.discovery,.7),
    high:positive(c.high,1.2),medium:positive(c.medium,1),low:positive(c.low,.8),
    exact:positive(c.exact,1.2),phrase:positive(c.phrase,1),broad:positive(c.broad,.8),
    min:positive(c.min,.02),max:positive(c.max,9.99)};
}
function roundEven(x) {const n=Math.floor(x);return x-n===.5?(n%2?n+1:n):Math.round(x);}
export function recommendBid(base,type,relevance,match,c={},tier=1) {
  c=loadBidConfig(c); if(!c.enabled)return base;
  const t=lc(type),r=str(relevance).toUpperCase(),m=lc(match);
  let b=base*c[t==='branded'||t==='competitor'?'branded':t==='discovery'?'discovery':'generic']*
    c[r==='H'?'high':r==='L'?'low':'medium']*c[m==='exact'?'exact':m==='broad'?'broad':'phrase']*(tier>0?tier:1);
  b=Math.floor(b*100+.5)/100; if(b<c.min)b=c.min;if(b>c.max)b=c.max;return b;
}
export function scoreKeyword(keyword,title,type='generic') {
  if(lc(type)==='discovery')return 'L';
  const words=lc(keyword).split(' '),hay=` ${lc(title)} `;
  const hits=words.filter(w=>w.length>=3&&hay.includes(` ${w} `)).length;
  return hits/words.length>=.8&&words.length>=4?'H':hits/words.length>=.5||(words.length===3&&hits>=2)?'M':'L';
}
export function qualifyKeywordsMacro(keywords,minWords=3) {
  let wc=1; return list(Array.isArray(keywords)?keywords.join('|'):keywords,'|').filter(kw=>{
    wc+=(kw.match(/ /g)||[]).length;return wc>=Math.max(2,minWords);
  });
}
export function getAllKeywords(rows,asin,filter='') {
  return rows.filter(r=>str(r.asin)===str(asin)&&(!filter||!str(r.campaignType)||lc(r.campaignType)===lc(filter)))
    .flatMap(r=>list(r.keyword,'|'));
}
function normalized(input) {
  const c={adType:'SP',targeting:'MANUAL',matches:'exact',baseBid:.75,defaultBudget:50,state:'paused',
    strategy:'Dynamic bids - down only',generic:true,branded:false,productBranded:false,productCompetitor:false,
    auto:false,autoFill:false,negativeLevel:'Campaign',...input};
  c.adType=str(c.adType).toUpperCase();c.state=lc(c.state);c.targeting=str(c.targeting).toUpperCase()||'MANUAL';
  c.matchList=(Array.isArray(c.matches)?c.matches:lc(c.matches||'exact').split(',')).map(lc);
  c.brands=list(c.brandKeywords);c.products=(c.products||[]).map(p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,str(v)])))
    .filter(p=>p.asin||p.brand||p.category);
  c.keywords=c.keywords||[];return c;
}
function selectedTactics(c) {return [yes(c.generic)&&'Generic',yes(c.branded)&&c.brands.length&&'Branded',
  yes(c.productBranded)&&str(c.brandedAsins)&&'ProductBranded',yes(c.productCompetitor)&&str(c.competitorAsins)&&'ProductCompetitor',
  yes(c.auto)&&'Auto'].filter(Boolean);}
function nameFor(p,c,t,m='') {return buildCampName(p.brand,p.category,p.subcategory,c.adType,t)+(m?'_'+proper(m):'');}
export function computeCampaignBudgets(input) {
  const c=normalized(input),groups=new Map(),split=c.matchList.length>1;
  const weights={Generic:0,Branded:0,Auto:0,ProductBranded:0,ProductCompetitor:0,...c.tacticWeights};
  const matches={exact:0,phrase:0,broad:0,...c.matchWeights};
  for(const t of selectedTactics(c))for(const p of c.products)for(const m of t==='Generic'&&split?c.matchList:['']) {
    if(m&&!['exact','phrase','broad'].includes(m))continue;
    const k=t+(m?'_'+m:'');if(!groups.has(k))groups.set(k,new Map());
    const n=nameFor(p,c,t,m);groups.get(k).set(lc(n),n);
  }
  const active=[...new Set([...groups.keys()].map(k=>k.split('_')[0]))];
  const sum=active.reduce((a,t)=>a+val(weights[t]),0)||1;
  const msum=[...groups.keys()].filter(k=>k.startsWith('Generic_')).reduce((a,k)=>a+val(matches[k.split('_')[1]]),0)||1;
  const out=new Map();for(const [key,names]of groups){const [t,m]=key.split('_');
    const pool=val(c.sessionTotal)*val(weights[t])/sum*(m?val(matches[m])/msum:1);
    const per=Math.max(1,Math.floor(pool/names.size+.5));for(const n of names.values())out.set(lc(n),per);
  }return out;
}
function makeRow(product,entity,camp,cols={}) {const r=Array(28).fill('');
  for(const [k,v]of Object.entries({1:product,2:entity,3:'Create',4:camp,...cols}))r[Number(k)-1]=v??'';return r;}
export function generateSP(input) {
  const c=normalized({...input,adType:'SP'}),rows=[],seen={};
  for(const k of ['camp','ag','ad','kw','target','neg'])seen[k]=new Set();
  const first=(type,key)=>{key=lc(key);if(seen[type].has(key))return false;seen[type].add(key);return true;};
  const bid=val(c.baseBid),bc=loadBidConfig(c.bidConfig),budgets=yes(c.budgetSplit)?computeCampaignBudgets(c):new Map();
  const put=(entity,camp,ag,cols={})=>rows.push(makeRow('Sponsored Products',entity,camp,{10:camp,...(ag?{5:ag,11:ag}:{}),...cols}));
  function campaign(p,t,m){const n=nameFor(p,c,t,m);if(first('camp',n)){
    put('Campaign',n,'',{6:p.portfolio||c.portfolio,12:str(c.startDate),13:str(c.endDate),14:t==='Auto'?'AUTO':'MANUAL',
      15:c.state,16:budgets.get(lc(n))??val(c.defaultBudget),25:c.strategy||'Dynamic bids - down only'});
    for(const [key,placement]of [['topPlacement','placementTop'],['productPlacement','placementProductPage'],['restPlacement','placementRestOfSearch']])
      if(val(c[key])>0)put('Bidding Adjustment',n,'',{26:placement,27:val(c[key])});
  }return n;}
  function group(n,p){if(!first('ag',n+'|'+p.adGroup))return false;put('Ad Group',n,p.adGroup,{15:c.state,19:bid});return true;}
  function ads(n,p){if(!p.asin)return;const skus=list(p.skus?.replace(/;/g,','));
    for(const sku of skus.length?skus:[''])if(first('ad',n+'|'+p.adGroup+'|'+p.asin+(sku?'|SKU:'+lc(sku):'')))
      put('Product Ad',n,p.adGroup,{15:c.state,...(sku?{17:sku}:{18:p.asin})});}
  function kw(n,p,k,m,type,state=c.state,rel=scoreKeyword(k,p.title,type)) {
    if(first('kw',[n,p.adGroup,lc(k),lc(m)].join('|')))put('Keyword',n,p.adGroup,{15:state,20:recommendBid(bid,type,rel,m,c.bidConfig),21:k,24:m});}
  function negatives(n,p){const agScope=['adgroup','ad group'].includes(lc(c.negativeLevel));
    if(agScope&&!p.adGroup&&c.brands.length)throw Error('Ad Group-level negative keyword requires an Ad Group ID/name.');
    for(const b of c.brands)if(first('neg',n+'|'+(agScope?p.adGroup+'|':'')+lc(b)))
      put(agScope?'Negative Keyword':'Campaign Negative Keyword',n,agScope?p.adGroup:'',{15:'enabled',21:b,24:'negativeExact'});}
  for(const t of selectedTactics(c))for(const p of c.products){
    if(t==='Generic'){
      let ks=qualifyKeywordsMacro(getAllKeywords(c.keywords,p.asin,'Generic'),bc.minWords),state=c.state;
      if(!ks.length&&yes(c.autoFill)){ks=['placeholder-edit-this-keyword'];state='paused';}
      for(const m of c.matchList.filter(Boolean)){const n=campaign(p,t,c.matchList.length>1?m:'');group(n,p);ads(n,p);
        for(const k of ks)kw(n,p,k,m,'generic',state);negatives(n,p);}
    }else{const n=campaign(p,t,'');const fresh=group(n,p);
      if(fresh&&t==='Branded')for(const m of c.matchList.filter(Boolean))for(const b of c.brands){
        kw(n,p,b,m,'branded',c.state,'H');for(const k of getAllKeywords(c.keywords,p.asin,'Branded')){
          const combo=b+' '+k;if(combo.split(' ').length<=6)kw(n,p,combo,m,'branded');}}
      if(fresh&&['ProductBranded','ProductCompetitor','Auto'].includes(t)) {
        const targets=t==='Auto'?['close-match','loose-match','substitutes','complements']:
          list(t==='ProductBranded'?c.brandedAsins:c.competitorAsins,'|').map(a=>'asin="'+a+'"');
        for(const expr of targets)if(first('target',n+'|'+p.adGroup+'|'+lc(expr)))
          put('Product Targeting',n,p.adGroup,{15:c.state,[t==='Auto'?20:19]:bid,28:expr});}
      ads(n,p);if(t==='Auto')negatives(n,p);
    }
  }return rows;
}
export function generateSD(input) {
  const c=normalized({...input,adType:'SD'}),rows=[];let prevCamp='',prevAG='';
  for(const p of c.products){const n=nameFor(p,c,'');const put=(entity,cols)=>rows.push(makeRow('Sponsored Display',entity,n,cols));
    if(n!==prevCamp){put('Campaign',{6:p.portfolio||c.portfolio,10:n,12:str(c.startDate),13:str(c.endDate),14:c.state,
      15:str(c.sdTactic),16:'DAILY',17:val(c.defaultBudget)});prevCamp=n;prevAG='';}
    if(p.adGroup!==prevAG){put('Ad Group',{5:p.adGroup,10:n,11:p.adGroup,14:c.state,19:val(c.baseBid),20:c.sdCostType||'cpc'});prevAG=p.adGroup;}
    put('Product Ad',{5:p.adGroup,10:n,11:p.adGroup,14:c.state,18:p.asin});
  }return rows;
}
export function generateSB(input) {
  const c=normalized({...input,adType:'SB'}),rows=[];let prevCamp='';
  for(const p of c.products){const n=nameFor(p,c,c.targeting);const put=(entity,cols)=>rows.push(makeRow('Sponsored Brands',entity,n,cols));
    if(n!==prevCamp){put('Campaign',{6:p.portfolio||c.portfolio,10:n,11:str(c.startDate),12:str(c.endDate),13:c.state,14:'DAILY',
      15:val(c.defaultBudget),16:'productCollection',17:str(c.landingURL),18:p.asin,19:str(c.brandEntityID),20:str(c.brandName),
      25:str(c.headline),26:str(c.creativeASINs)});prevCamp=n;}
    let ks=getAllKeywords(c.keywords,p.asin),state=c.state;
    if(!ks.length&&yes(c.autoFill)){ks=['placeholder-edit-this-keyword'];state='paused';}
    for(const k of ks)for(const m of c.matchList.filter(Boolean))put('Keyword',{13:state,24:val(c.baseBid),22:k,23:m});
  }return rows;
}
export function generateRows(input) {
  const type=str(input.adType||'SP').toUpperCase();
  if(type==='SP')return generateSP(input);if(type==='SB')return generateSB(input);if(type==='SD')return generateSD(input);
  throw Error('Ad type must be SP, SB or SD.');
}
/** Source-derived field checks. `today` is explicit YYYYMMDD for reproducible tests.
 * Excel UI setup checks (named-range existence) are intentionally not applicable.
 * Date validation is stricter than DateSerial rollover to avoid invalid upload dates.
 */
export function validateGenerator(input,today='') {
  const c=normalized(input),errors=[],add=(field,message)=>errors.push({field,message});
  if(!['SP','SB','SD'].includes(c.adType))add('adType','Ad type must be SP, SB or SD.');
  if(val(c.baseBid)<=0)add('baseBid','Default bid must be greater than zero.');
  if(val(c.defaultBudget)<=0)add('defaultBudget','Default budget must be greater than zero.');
  const s=str(c.startDate),y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),date=new Date(Date.UTC(y,m-1,d));
  if(!/^\d{8}$/.test(s)||date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)
    add('startDate','Start date must be a valid YYYYMMDD date.');
  else if(today&&s<today)add('startDate','Start date cannot be in the past.');
  if(!['enabled','paused'].includes(c.state))add('state','State must be enabled or paused.');
  if(!['campaign','ad group','adgroup'].includes(lc(c.negativeLevel)))add('negativeLevel','Negative keyword level must be Campaign or Ad Group.');
  if(c.adType==='SP'&&!['AUTO','MANUAL'].includes(c.targeting))add('targeting','SP targeting must be AUTO or MANUAL.');
  if(c.adType==='SB'){
    for(const f of ['brandName','brandEntityID','headline','landingURL'])if(!str(c[f]))add(f,`${f} is required for Sponsored Brands.`);
    if(str(c.headline).length>50)add('headline','Headline must not exceed 50 characters.');
    if(str(c.landingURL)&&!str(c.landingURL).startsWith('http'))add('landingURL','Landing URL must start with http.');
  }
  if(c.adType==='SD'&&!str(c.sdTactic))add('sdTactic','SD tactic is required.');
  if(![c.generic,c.branded,c.productBranded,c.productCompetitor,c.auto].some(yes))add('tactics','Select at least one targeting tactic.');
  if(yes(c.branded)&&!str(c.brandKeywords))add('brandKeywords','Branded targeting requires brand keywords.');
  for(const [flag,f]of [['productBranded','brandedAsins'],['productCompetitor','competitorAsins']])if(yes(c[flag])){
    if(!str(c[f]))add(f,'Product targeting requires target ASINs.');
    else for(const a of list(c[f],'|'))if(a.length!==10||!a.startsWith('B'))add(f,`Invalid target ASIN: ${a}`);
  }
  if(!c.products.length)add('products','No ASIN data found.');
  c.products.forEach((p,i)=>{
    if(!p.asin||p.asin.length!==10||!p.asin.startsWith('B'))add(`products.${i}.asin`,'ASIN must have 10 characters and start with B.');
    for(const f of ['brand','category','adGroup'])if(!p[f])add(`products.${i}.${f}`,`${f} is required.`);
  });return errors;
}
/** Headers read from supplied workbook T_ templates, not inferred from current APIs. */
export const TEMPLATE_HEADERS = {
  SP:'Product|Entity|Operation|Campaign ID|Ad Group ID|Portfolio ID|Ad ID|Keyword ID|Product Targeting ID|Campaign Name|Ad Group Name|Start Date|End Date|Targeting Type|State|Daily Budget|SKU|ASIN|Ad Group Default Bid|Bid|Keyword Text|Native Language Keyword|Native Language Locale|Match Type|Bidding Strategy|Placement|Percentage|Product Targeting Expression|Audience ID|Shopper Cohort Percentage|Shopper Cohort Type|Sites|Off-Amazon ad serving'.split('|'),
  SB:'Product|Entity|Operation|Campaign ID|Draft Campaign ID|Portfolio ID|Ad Group ID|Keyword ID|Product Targeting ID|Campaign Name|Start Date|End Date|State|Budget Type|Budget|Bid Optimization|Bid Multiplier|Bid|Keyword Text|Match Type|Product Targeting Expression|Ad Format|Landing Page URL|Landing Page ASINs|Brand Entity ID|Brand Name|Brand Logo Asset ID|Custom Image Asset ID|Creative Headline|Creative ASINs|Video Media IDs|Creative Type'.split('|'),
  SD:'Product|Entity|Operation|Campaign ID|Portfolio ID|Ad Group ID|Ad ID|Targeting ID|Campaign Name|Ad Group Name|Start Date|End Date|State|Tactic|Budget Type|Budget|SKU|ASIN|Ad Group Default Bid|Bid|Bid Optimization|Cost Type|Targeting Expression'.split('|')
};
export const TEMPLATE_SHEETS={SP:'Sponsored Products Campaigns',SB:'Sponsored Brands Campaigns',SD:'Sponsored Display Campaigns'};
/** Explicit export-only fixes to source/template offset defects. The literal
 * generate* functions remain unchanged for source parity. This mapping alone is
 * not evidence that Amazon accepted a file (creative requirements still apply).
 */
export function toUploadRows(rows,adType){
  const type=str(adType).toUpperCase(),headers=TEMPLATE_HEADERS[type];if(!headers)throw Error('Unknown ad type');
  return rows.map(r=>{
    const out=Array(headers.length).fill(''),copy=(from,to=from)=>{out[to-1]=r[from-1]??'';};
    if(type==='SP'){r.forEach((v,i)=>{if(i<out.length)out[i]=v;});
      if(r[1]==='Product Targeting'&&r[18]!==''&&r[18]!=null){out[19]=r[18];out[18]='';}return out;
    }
    [1,2,3,4].forEach(c=>copy(c));
    if(type==='SB'){
      if(r[1]==='Campaign'){
        [6,10,11,12,13,14,15].forEach(c=>copy(c));
        for(const [from,to]of [[16,22],[17,23],[18,24],[19,25],[20,26],[25,29],[26,30]])copy(from,to);
      }else if(r[1]==='Keyword')for(const [from,to]of [[13,13],[24,18],[22,19],[23,20]])copy(from,to);
      else throw Error(`Unsupported SB export entity: ${r[1]}`);
    }else{
      copy(10,9);copy(14,13);
      if(r[1]==='Campaign')for(const [from,to]of [[6,5],[12,11],[13,12],[15,14],[16,15],[17,16]])copy(from,to);
      else if(r[1]==='Ad Group')for(const [from,to]of [[5,6],[11,10],[19,19],[20,22]])copy(from,to);
      else if(r[1]==='Product Ad')for(const [from,to]of [[5,6],[11,10],[18,18]])copy(from,to);
      else throw Error(`Unsupported SD export entity: ${r[1]}`);
    }return out;
  });
}
