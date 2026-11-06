import {env} from "cloudflare:workers";
const seed=[
 ["REC-2407","Stop non-converting search-term spend","Search term","Search term","1,842 terms exceeded the configured spend threshold with zero attributed orders.","Prepare exact negatives after conflict and scope checks.","May suppress discovery without human term review.",13304,94,"Immediate","awaiting_approval"],
 ["REC-2411","Test higher budgets on efficient campaigns","Campaign","Budget","ROAS exceeds target and average daily spend is consistently near budget.","Run a guarded +15% budget test after confirming daily caps.","Marginal spend may produce lower returns.",8600,78,"This week","needs_review"],
 ["REC-2418","Harvest converting search terms","Search term","Keyword","386 converting terms have no dedicated exact or phrase keyword.","Create exact targets with negative-exact isolation where required.","Poor isolation can fragment traffic.",6900,88,"This week","prepared"],
 ["REC-2420","Continue observing bid reduction","Keyword","Keyword","The prior 12% bid reduction has only seven days of post-change data.","Wait for the measurement window before changing bids again.","Acting now would confound outcome measurement.",4100,84,"Observe","monitoring"]
];
function db(){if(!env.DB)throw new Error("Database unavailable");return env.DB}
export async function GET(){
 const count=await db().prepare("SELECT COUNT(*) AS n FROM recommendations").first<{n:number}>();
 if(!count?.n){const now=new Date().toISOString();await db().batch([
  db().prepare("INSERT OR IGNORE INTO advertisers (id,name,marketplace,currency,created_at) VALUES (?,?,?,?,?)").bind("ADV-NORTHSTAR","Northstar Apparel","US","USD",now),
  ...seed.map(r=>db().prepare("INSERT OR IGNORE INTO recommendations (id,advertiser_id,title,entity_type,engine,evidence,proposed_action,risk,impact_value,confidence,priority,status,detected_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(r[0],"ADV-NORTHSTAR",...r.slice(1),now,now))
 ])}
 const rows=await db().prepare("SELECT r.*, a.name AS account FROM recommendations r JOIN advertisers a ON a.id=r.advertiser_id ORDER BY impact_value DESC").all();
 return Response.json({recommendations:rows.results});
}
export async function PATCH(req:Request){
 const body=await req.json() as {id?:string,status?:string,reason?:string};
 const allowed=new Set(["reviewed","approved","rejected","deferred","prepared","executed","monitoring","closed"]);
 if(!body.id||!body.status||!allowed.has(body.status))return Response.json({error:"Invalid transition"},{status:400});
 const current=await db().prepare("SELECT status FROM recommendations WHERE id=?").bind(body.id).first<{status:string}>();
 if(!current)return Response.json({error:"Recommendation not found"},{status:404});
 const now=new Date().toISOString();
 await db().batch([
  db().prepare("UPDATE recommendations SET status=?, updated_at=? WHERE id=?").bind(body.status,now,body.id),
  db().prepare("INSERT INTO recommendation_events (recommendation_id,event_type,from_status,to_status,reason,created_at) VALUES (?,?,?,?,?,?)").bind(body.id,"status_changed",current.status,body.status,body.reason??null,now)
 ]);
 return Response.json({id:body.id,status:body.status,updatedAt:now});
}
