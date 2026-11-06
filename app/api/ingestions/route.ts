import {env} from "cloudflare:workers";
function db(){if(!env.DB)throw new Error("Database unavailable");return env.DB}
export async function GET(){const rows=await db().prepare("SELECT * FROM ingestion_runs ORDER BY created_at DESC LIMIT 20").all();return Response.json({runs:rows.results})}
export async function POST(req:Request){
 const b=await req.json() as {fileName?:string,rowCount?:number,columnCount?:number,headers?:string[]};
 if(!b.fileName||!Array.isArray(b.headers))return Response.json({error:"Invalid ingestion metadata"},{status:400});
 const h=b.headers.map(x=>x.toLowerCase());
 const type=h.some(x=>x.includes("customer search term"))?"Search term report":h.some(x=>x.includes("placement"))?"Placement report":h.some(x=>x.includes("campaign"))?"Campaign or bulk report":"Unknown report";
 const status=type==="Unknown report"?"needs_mapping":"validated";const now=new Date().toISOString();const id=`ING-${Date.now()}`;
 await db().batch([
  db().prepare("INSERT OR IGNORE INTO advertisers (id,name,marketplace,currency,created_at) VALUES (?,?,?,?,?)").bind("ADV-NORTHSTAR","Northstar Apparel","US","USD",now),
  db().prepare("INSERT INTO ingestion_runs (id,advertiser_id,file_name,file_type,row_count,column_count,detected_report_type,validation_status,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,"ADV-NORTHSTAR",b.fileName,"csv",Math.max(0,b.rowCount??0),Math.max(0,b.columnCount??0),type,status,now)
 ]);
 return Response.json({id,detectedReportType:type,validationStatus:status,rowCount:b.rowCount??0,columnCount:b.columnCount??0});
}
