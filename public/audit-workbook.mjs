// Client-side report export. The same report model drives the web views and Excel.
export function createAuditWorkbook(XLSX,reports,options={}){
 const wb=XLSX.utils.book_new();
 const colors={navy:'0F2341',blue:'00467F',red:'C83933',pale:'F0F4F9',white:'FFFFFF',ink:'18263D'};
 const style=(fill,bold=false,color=colors.ink)=>({font:{name:'Calibri',sz:11,bold,color:{rgb:color}},fill:{fgColor:{rgb:fill}},alignment:{vertical:'top',wrapText:true},border:{bottom:{style:'hair',color:{rgb:'DDE3EB'}}}});
 const widthsByReport=[[27,24,24,27,24,35,18],[14,15,24,55,55,18,18],[20,38,30,36,13,13,17,17,13,12,13,38],[20,36,38,30,14,17,15,17,36],[20,44,14,18,18,18,14,12,20,44],[12,24,55,55,18,18],[18,48,20,20,20,18,12,15,14,18,22],[18,20,20,20,20,25],[38,28,28,18,18,18,18,14,14,14,48]];
 for(const [reportIndex,report] of reports.entries()){const width=Math.max(...report.sections.map(s=>s.headers.length)),rows=[],merges=[],styles=[],heights=[],formats=[],columnWidths=widthsByReport[reportIndex];
  const add=(values,kind='data',fmt=[])=>{const r=rows.length;rows.push(values);styles.push(kind);formats.push(fmt);heights.push({hpt:kind==='title'?32:kind==='note'?40:kind==='header'?32:kind==='section'?26:42});return r;};
  const merged=(value,kind)=>{const r=add([value],kind);merges.push({s:{r,c:0},e:{r,c:width-1}});};
  merged(`ACOSTA ONE — ${report.title.toUpperCase()}`,'title');
  merged(`${options.accountName||'Campaign audit'} · ${options.period||'Uploaded reporting period'}`,'note');
  for(const s of report.sections){add([],'blank');merged(s.title,'section');if(s.note)merged(s.note,'note');add(s.headers,'header');if(!s.rows.length)merged('No matching rows.','note');for(const row of s.rows){const fmt=s.formats.map(f=>f==='metric'?(row[0]==='CTR'?'percent':'decimal'):f==='goal'?(String(row[0]).includes('Target')?(String(row[0]).startsWith('ROAS')?'decimal':'percent'):'money'):f);add(row,'data',fmt);}}
  const ws=XLSX.utils.aoa_to_sheet(rows);
  for(let r=0;r<rows.length;r++)for(let c=0;c<width;c++){const addr=XLSX.utils.encode_cell({r,c});if(!ws[addr])ws[addr]={t:'s',v:''};const cell=ws[addr],kind=styles[r];cell.s=kind==='title'?style(colors.navy,true,colors.white):kind==='section'?style(colors.blue,true,colors.white):kind==='header'?style('DCE7F2',true):style(r%2?colors.white:colors.pale);if(kind==='title')cell.s.font.sz=16;if(kind==='note')cell.s.font.sz=10;
   if(cell.t==='n'){cell.z={money:'"$"#,##0.00;("$"#,##0.00)',percent:'0.00%',number:'#,##0',decimal:'0.00'}[formats[r][c]]||'0.00';cell.s.numFmt=cell.z;cell.s.alignment.horizontal='right';}
   // All external text is a string, never an executable formula.
   if(cell.t==='s')delete cell.f;
  }
  for(let r=0;r<rows.length;r++)if(styles[r]==='data'||styles[r]==='header'){const lines=Math.max(1,...rows[r].map((v,c)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/Math.max(8,(columnWidths[c]||20)-3))),0)));heights[r]={hpt:Math.max(styles[r]==='header'?32:24,lines*14+10)};}
  ws['!merges']=merges;ws['!rows']=heights;ws['!cols']=Array.from({length:width},(_,c)=>({wch:columnWidths[c]||20}));
  ws['!margins']={left:.3,right:.3,top:.5,bottom:.5,header:.2,footer:.2};
  XLSX.utils.book_append_sheet(wb,ws,report.name);
 }
 wb.Props={Title:'Acosta One Campaign Audit',Subject:'Nine-report campaign audit',Author:'Acosta One'};
 return wb;
}
