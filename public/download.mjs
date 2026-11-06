// Keep a normal download link available if the browser suppresses an automatic save.
let pendingUrl=null;
export function downloadBlob(blob,filename){
 clearDownload();pendingUrl=URL.createObjectURL(blob);
 const notice=document.createElement('p');notice.id='downloadNotice';notice.setAttribute('role','status');
 notice.style.cssText='position:fixed;bottom:20px;right:20px;z-index:10000;background:white;border:1px solid #ccd1d6;border-radius:8px;padding:16px;box-shadow:0 4px 20px #0002;max-width:90vw';
 const a=document.createElement('a');a.href=pendingUrl;a.download=filename;a.textContent=`Save ${filename}`;a.style.color='#00467f';notice.append('Your file is ready. ',a);document.body.append(notice);a.click();
}
export function downloadWorkbook(XLSX,wb,filename){downloadBlob(new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx',compression:true})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);}
export function clearDownload(){document.getElementById('downloadNotice')?.remove();if(pendingUrl)URL.revokeObjectURL(pendingUrl);pendingUrl=null;}
