// Pure import validation, shared by browser and regression tests.
const key=v=>String(v??'').trim().toLowerCase();
export const bulkSheets={sp:'Sponsored Products Campaigns',terms:'SP Search Term Report',sb:'Sponsored Brands Campaigns',sbmag:'SB Multi Ad Group Campaigns',sd:'Sponsored Display Campaigns'};
const requirements={sp:['entity','spend','sales','orders','clicks','impressions','acos','conversion rate','keyword text'],terms:['customer search term','spend','sales','orders','clicks','impressions','conversion rate','match type'],sales:['asin','ordered revenue','ordered units'],traffic:['asin','featured offer page views'],benchmark:['ad product','ctr (p50)','cpc (p50)','cpm (p50)']};
export function rowsFromGrid(grid,kind,sheetName='Report'){
 const required=requirements[kind]||['spend','sales'];
 // Accept metadata before headers, but require an unambiguous complete schema.
 const index=grid.slice(0,10).findIndex(row=>required.every(h=>row.some(v=>key(v)===h)));
 if(index<0)throw new Error(`${sheetName}: required headers not found: ${required.join(', ')}. Use the original Amazon export.`);
 const headers=grid[index].map(key);
 const rows=grid.slice(index+1).filter(row=>row.some(v=>v!==''&&v!=null)).map((row,i)=>{
  const out={__sheet:sheetName,__row:index+i+2};headers.forEach((h,j)=>{if(h&&!(h in out))out[h]=row[j]??''});
  out._resolvedcampaignname=String(out['campaign name']||out['campaign name (informational only)']||'').trim();
  out._resolvedadgroupname=String(out['ad group name']||out['ad group name (informational only)']||'').trim();
  out._rowexcluded=false;return out;
 });
 if(!rows.length)throw new Error(`${sheetName}: the header is present, but there are no data rows.`);
 const numeric=required.filter(h=>['spend','sales','orders','clicks','impressions','acos','conversion rate','ordered revenue','ordered units','featured offer page views'].includes(h));
 for(const r of rows)for(const h of numeric){const v=r[h];if(v!==''&&v!=null&&!Number.isFinite(Number(v)))throw new Error(`${sheetName}, row ${r.__row}: “${h}” contains a nonnumeric value. Export numeric report values before auditing.`);}
 return {rows,headerRow:index+1,headers,sheetName};
}
export function parseReport(grids,kind){
 if(kind==='bulk'){
  const result={},coverage=[];
  for(const [id,name] of Object.entries(bulkSheets)){
   const found=Object.keys(grids).find(k=>key(k)===key(name));
   if(!found){if(id==='sp'||id==='terms')throw new Error(`Bulk Campaign Report is missing the “${name}” worksheet. Include search-term data in the bulk export.`);result[id]=[];coverage.push({sheet:name,status:'Not present',rows:0});continue;}
   // Optional empty ad-product sheets are valid when the account has no activity.
   const nonblank=grids[found].filter(r=>r.some(v=>v!==''&&v!=null));
   if(!['sp','terms'].includes(id)&&nonblank.length<=1){result[id]=[];coverage.push({sheet:name,status:'Empty',rows:0});continue;}
   const parsed=rowsFromGrid(grids[found],id,found);result[id]=parsed.rows;coverage.push({sheet:found,status:'Loaded',rows:parsed.rows.length,headerRow:parsed.headerRow});
  }
  if(!result.sp.some(r=>r.entity==='Campaign'))throw new Error('Sponsored Products Campaigns contains no Campaign records.');
  return {...result,coverage};
 }
 const first=Object.keys(grids)[0];if(!first)throw new Error('The workbook has no worksheets.');
 return rowsFromGrid(grids[first],kind,first);
}
