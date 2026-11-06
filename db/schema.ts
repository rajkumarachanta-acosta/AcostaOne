import {integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const advertisers=sqliteTable("advertisers",{
 id:text("id").primaryKey(), name:text("name").notNull(), marketplace:text("marketplace").notNull(), currency:text("currency").notNull(), createdAt:text("created_at").notNull()
});
export const recommendations=sqliteTable("recommendations",{
 id:text("id").primaryKey(), advertiserId:text("advertiser_id").notNull().references(()=>advertisers.id), title:text("title").notNull(), entityType:text("entity_type").notNull(), engine:text("engine").notNull(), evidence:text("evidence").notNull(), proposedAction:text("proposed_action").notNull(), risk:text("risk").notNull(), impactValue:real("impact_value").notNull(), confidence:integer("confidence").notNull(), priority:text("priority").notNull(), status:text("status").notNull(), detectedAt:text("detected_at").notNull(), updatedAt:text("updated_at").notNull()
});
export const recommendationEvents=sqliteTable("recommendation_events",{
 id:integer("id").primaryKey({autoIncrement:true}), recommendationId:text("recommendation_id").notNull().references(()=>recommendations.id), eventType:text("event_type").notNull(), fromStatus:text("from_status"), toStatus:text("to_status"), reason:text("reason"), createdAt:text("created_at").notNull()
});
export const ingestionRuns=sqliteTable("ingestion_runs",{
 id:text("id").primaryKey(), advertiserId:text("advertiser_id").notNull().references(()=>advertisers.id), fileName:text("file_name").notNull(), fileType:text("file_type").notNull(), rowCount:integer("row_count").notNull(), columnCount:integer("column_count").notNull(), detectedReportType:text("detected_report_type").notNull(), validationStatus:text("validation_status").notNull(), createdAt:text("created_at").notNull()
});
export const auditRuns=sqliteTable("audit_runs",{
 id:text("id").primaryKey(), advertiserId:text("advertiser_id").notNull().references(()=>advertisers.id), ingestionId:text("ingestion_id"), reportType:text("report_type").notNull(), fileName:text("file_name").notNull(), rowCount:integer("row_count").notNull(), ruleVersion:text("rule_version").notNull(), thresholdsJson:text("thresholds_json").notNull(), summaryJson:text("summary_json").notNull(), createdAt:text("created_at").notNull()
});
export const auditFindings=sqliteTable("audit_findings",{
 id:text("id").primaryKey(), auditRunId:text("audit_run_id").notNull().references(()=>auditRuns.id), advertiserId:text("advertiser_id").notNull().references(()=>advertisers.id), engine:text("engine").notNull(), classification:text("classification").notNull(), severity:text("severity").notNull(), entityType:text("entity_type").notNull(), entityKey:text("entity_key").notNull(), campaign:text("campaign"), adGroup:text("ad_group"), target:text("target"), evidenceJson:text("evidence_json").notNull(), proposedAction:text("proposed_action").notNull(), confidence:integer("confidence").notNull(), createdAt:text("created_at").notNull()
});
