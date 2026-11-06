import {env} from "cloudflare:workers";
type Finding={classification:string;severity:string;entityType:string;entityKey:string;campaign?:string;adGroup?:string;target?:string;evidence:Record<string,unknown>;proposedAction:string;confidence:number};
function db(){if(!env.DB)throw new Error("Database unavailable");return env.DB}
export async function POST(req:Request){
 const b=await req.json() as {fileName?:string;reportType?:string;rowCount?:number;ruleVersion?:string;thresholds?:Record<string,number>;summary?:Record<string,unknown>;findings?:Finding[]};
 if(!b.fileName||!b.reportType||!Array.isArray(b.findings)||b.findings.length>500)return Response.json({error:"Invalid audit payload"},{status:400});
 const now=new Date().toISOString(),stamp=Date.now(),id=`AUD-${stamp}`,advertiser="ADV-NORTHSTAR";
 const statements=[
  db().prepare("INSERT OR IGNORE INTO advertisers (id,name,marketplace,currency,created_at) VALUES (?,?,?,?,?)").bind(advertiser,"Northstar Apparel","US","USD",now),
  db().prepare("INSERT INTO audit_runs (id,advertiser_id,ingestion_id,report_type,file_name,row_count,rule_version,thresholds_json,summary_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,advertiser,null,b.reportType,b.fileName,Math.max(0,b.rowCount??0),b.ruleVersion??"audit-rules/1.0.0",JSON.stringify(b.thresholds??{}),JSON.stringify(b.summary??{}),now)
 ];
 b.findings.forEach((f,i)=>{
  const fid=`FND-${stamp}-${i+1}`;
  statements.push(db().prepare("INSERT INTO audit_findings (id,audit_run_id,advertiser_id,engine,classification,severity,entity_type,entity_key,campaign,ad_group,target,evidence_json,proposed_action,confidence,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(fid,id,advertiser,"Deterministic audit",f.classification,f.severity,f.entityType,f.entityKey,f.campaign??null,f.adGroup??null,f.target??null,JSON.stringify(f.evidence),f.proposedAction,Math.max(0,Math.min(100,f.confidence)),now));
  if(f.classification==="confirmed_waste"||f.classification==="budget_opportunity")statements.push(db().prepare("INSERT INTO recommendations (id,advertiser_id,title,entity_type,engine,evidence,proposed_action,risk,impact_value,confidence,priority,status,detected_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`REC-AUD-${stamp}-${i+1}`,advertiser,f.classification==="confirmed_waste"?"Review confirmed non-converting spend":"Review efficient budget opportunity",f.entityType,"Deterministic audit",JSON.stringify(f.evidence),f.proposedAction,f.classification==="confirmed_waste"?"A negative can suppress future discovery; review scope and conflicts.":"Incremental spend can be less efficient than historical spend.",Number(f.evidence.spend??0),f.confidence,f.severity==="high"?"Immediate":"This week","needs_review",now,now));
 });
 await db().batch(statements);
 return Response.json({id,savedFindings:b.findings.length,generatedRecommendations:b.findings.filter(f=>f.classification==="confirmed_waste"||f.classification==="budget_opportunity").length});
}
