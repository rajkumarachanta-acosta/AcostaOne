import {runEngine} from './audit-engine.mjs';
import {buildReports} from './audit-reports.mjs';
self.onmessage=({data})=>{try{const audit=runEngine(data.input,data.options);const reports=buildReports(audit);self.postMessage({ok:true,reports,total:audit.total,score:audit.score,coverage:data.coverage,counts:{findings:audit.findings.length,patterns:audit.ranked.length}});}catch(error){self.postMessage({ok:false,error:error.message||'The audit could not be completed.'});}};
