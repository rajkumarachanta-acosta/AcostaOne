const clean=v=>String(v??'').trim();
const key=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={asin:['asin','asinmandate'],brand:['brand','brandname','brandnamemandate'],category:['category','categorymandate'],subcategory:['subcategory','subcategoryoptional'],adGroup:['adgroup','adgroupname','adgroupnamemandate'],title:['title','producttitle','producttitleoptionalforekeywordextraction','producttitleoptional'],portfolio:['portfolio','portfolioid','portfolioidoptional'],skus:['skus','sku','skusoptional'],uniqueId:['uniqueid2','uniqueid2optional'],keywords:['keywords','keyword']};
function field(h){const k=key(h);for(const [name,a] of Object.entries(aliases))if(a.includes(k))return name;if(k.startsWith('producttitleoptional'))return'title';if(k.startsWith('skusoptional'))return'skus';return null;}
export function importProducts(grids){
 for(const grid of Object.values(grids)){const i=grid.slice(0,20).findIndex(r=>r.some(h=>field(h)==='asin')&&r.some(h=>field(h)==='category')&&r.some(h=>field(h)==='brand'));if(i<0)continue;
  const headers=grid[i].map(field),rows=[];for(const row of grid.slice(i+1)){const p={};headers.forEach((h,j)=>{if(h&&!(h in p))p[h]=clean(row[j])});if(!p.asin)continue;if(/keyword|asin/i.test(p.asin)&&!/^B[A-Z0-9]{9}$/i.test(p.asin))break;rows.push(p);}
  if(!rows.length)throw Error('The product table has no ASIN rows.');return rows;
 }
 throw Error('Product headers not found. Include ASIN, Brand, Category and Ad Group. The macro’s ASIN table is also supported.');
}
export function importKeywords(grids){
 for(const grid of Object.values(grids)){const i=grid.findIndex(r=>r.some(h=>key(h).startsWith('asin'))&&r.some(h=>['keyword','keywords','keywordtext'].includes(key(h))));if(i<0)continue;
  const h=grid[i].map(key),a=h.findIndex(k=>k.startsWith('asin')),k=h.findIndex(k=>['keyword','keywords','keywordtext'].includes(k)),c=h.findIndex(k=>k.startsWith('campaigntype'));
  return grid.slice(i+1).filter(r=>clean(r[a])&&clean(r[k])).map(r=>({asin:clean(r[a]),keyword:clean(r[k]).replaceAll(';','|'),campaignType:c<0?'':clean(r[c])}));
 }
 throw Error('Keyword headers not found. Include ASIN and Keyword; Campaign Type is optional.');
}
