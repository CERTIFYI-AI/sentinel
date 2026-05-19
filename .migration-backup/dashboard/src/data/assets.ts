// Auto-generated V1 mock data
import { daysFromNow, daysAgo, fmtDateTime } from "@/lib/dateUtils";

export const MOCK_ASSETS = [
  { id:"ast-001", asset_ref:"AST-001", name:"Credit Risk Scorer v3.2.1", type:"ai_model", criticality:"critical", data_classification:"pii", lifecycle_stage:"active", entity_type:"model", department:"AI Analytics", version:"v3.2.1", vendor:"Internal", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(2)), owner:{full_name:"Maria Santos"}, created_at:fmtDateTime(daysAgo(90)) },
  { id:"ast-002", asset_ref:"AST-002", name:"Fraud Detection Engine v2.1.0", type:"ai_model", criticality:"critical", data_classification:"confidential", lifecycle_stage:"active", entity_type:"model", department:"Security Fraud", version:"v2.1.0", vendor:"Internal", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(1)), owner:{full_name:"Maria Santos"}, created_at:fmtDateTime(daysAgo(120)) },
  { id:"ast-003", asset_ref:"AST-003", name:"Consumer Credit Dataset v4", type:"dataset", criticality:"critical", data_classification:"pii", lifecycle_stage:"active", entity_type:"dataset", department:"Data Engineering", vendor:"Internal", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(7)), owner:{full_name:"James Patel"}, created_at:fmtDateTime(daysAgo(365)) },
  { id:"ast-004", asset_ref:"AST-004", name:"OpenAI-API-Connector", type:"api_endpoint", criticality:"critical", data_classification:"restricted", lifecycle_stage:"active", entity_type:"agent", department:"ML Operations", vendor:"OpenAI", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(3)), owner:{full_name:"Sarah Chen"}, created_at:fmtDateTime(daysAgo(60)) },
  { id:"ast-005", asset_ref:"AST-005", name:"data-warehouse.internal", type:"infrastructure", criticality:"critical", data_classification:"restricted", lifecycle_stage:"active", entity_type:null, hostname:"data-warehouse.internal", department:"Infrastructure", auto_discovered:true, last_scanned_at:fmtDateTime(daysAgo(1)), owner:{full_name:"David Kim"}, created_at:fmtDateTime(daysAgo(730)) },
  { id:"ast-006", asset_ref:"AST-006", name:"mlops-prod.internal", type:"infrastructure", criticality:"critical", data_classification:"confidential", lifecycle_stage:"active", entity_type:null, hostname:"mlops-prod.internal", department:"ML Operations", auto_discovered:true, last_scanned_at:fmtDateTime(daysAgo(1)), owner:{full_name:"Maria Santos"}, created_at:fmtDateTime(daysAgo(365)) },
  { id:"ast-007", asset_ref:"AST-007", name:"LangChain-Marketing Shadow AI", type:"agent", criticality:"critical", data_classification:"restricted", lifecycle_stage:"active", entity_type:"agent", department:"Marketing", vendor:"Unknown", auto_discovered:true, last_scanned_at:fmtDateTime(daysAgo(5)), owner:{full_name:"Unassigned"}, created_at:fmtDateTime(daysAgo(14)) },
  { id:"ast-008", asset_ref:"AST-008", name:"Loan Approval Assistant GPT-4o", type:"ai_model", criticality:"critical", data_classification:"pii", lifecycle_stage:"active", entity_type:"model", department:"AI Analytics", version:"v1.0.0", vendor:"OpenAI", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(7)), owner:{full_name:"Maria Santos"}, created_at:fmtDateTime(daysAgo(45)) },
  { id:"ast-009", asset_ref:"AST-009", name:"AML Transaction Monitor v1.5", type:"ai_model", criticality:"high", data_classification:"confidential", lifecycle_stage:"active", entity_type:"model", department:"Compliance", version:"v1.5", vendor:"Internal", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(4)), owner:{full_name:"Sarah Chen"}, created_at:fmtDateTime(daysAgo(200)) },
  { id:"ast-010", asset_ref:"AST-010", name:"sentinel-grc-api", type:"api_endpoint", criticality:"high", data_classification:"internal", lifecycle_stage:"active", entity_type:null, department:"Platform", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(1)), owner:{full_name:"David Kim"}, created_at:fmtDateTime(daysAgo(180)) },
  { id:"ast-011", asset_ref:"AST-011", name:"Transaction Fraud Labels v2", type:"dataset", criticality:"high", data_classification:"confidential", lifecycle_stage:"active", entity_type:"dataset", department:"Data Engineering", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(10)), owner:{full_name:"James Patel"}, created_at:fmtDateTime(daysAgo(150)) },
  { id:"ast-012", asset_ref:"AST-012", name:"ModelMonitor-Prod", type:"agent", criticality:"high", data_classification:"internal", lifecycle_stage:"decommissioning", entity_type:"agent", department:"ML Operations", vendor:"Internal", auto_discovered:false, last_scanned_at:fmtDateTime(daysAgo(30)), owner:{full_name:"Raj Gupta"}, created_at:fmtDateTime(daysAgo(400)) },
];

export const MOCK_ROPA = [
  { id:"rpa-001", ropa_ref:"RPA-001", processing_activity:"Credit Risk Scoring", purpose:"Automated credit decisioning", legal_basis:"Legitimate Interest", gdpr_article:"Art.6(1)(f)", data_categories:["Financial","Behavioral"], data_subjects:["Loan Applicants"], retention_period:"7 years post-decision", status:"active", dpo_reviewed:true },
  { id:"rpa-002", ropa_ref:"RPA-002", processing_activity:"Fraud Detection Processing", purpose:"Real-time fraud prevention", legal_basis:"Legal Obligation", gdpr_article:"Art.6(1)(c)", data_categories:["Transactional","Behavioral"], data_subjects:["Account Holders"], retention_period:"5 years", status:"active", dpo_reviewed:true },
  { id:"rpa-003", ropa_ref:"RPA-003", processing_activity:"Employee HR Processing", purpose:"HR management and payroll", legal_basis:"Contract", gdpr_article:"Art.6(1)(b)", data_categories:["Employment","Financial","Sensitive"], data_subjects:["Employees"], retention_period:"6 years post-employment", status:"active", dpo_reviewed:false },
  { id:"rpa-004", ropa_ref:"RPA-004", processing_activity:"Customer Churn Analysis", purpose:"Retention targeting", legal_basis:"Consent", gdpr_article:"Art.6(1)(a)", data_categories:["Behavioral","Profile"], data_subjects:["Customers"], retention_period:"3 years", status:"under_review", dpo_reviewed:false },
  { id:"rpa-005", ropa_ref:"RPA-005", processing_activity:"AML Transaction Monitoring", purpose:"Anti-money laundering", legal_basis:"Legal Obligation", gdpr_article:"Art.6(1)(c)", data_categories:["Financial","Identity"], data_subjects:["Account Holders"], retention_period:"10 years", status:"active", dpo_reviewed:true },
];

export const MOCK_ACCESS_REVIEWS = [
  { id:"uar-001", review_ref:"UAR-001", name:"Q1 2026 User Access Review", type:"user_access", status:"in_progress", scope:"All production systems", risk_level:"high", due_date:"2026-05-03" },
  { id:"uar-002", review_ref:"UAR-002", name:"Model Registry Role Certification", type:"role_certification", status:"pending", scope:"AI Governance module", risk_level:"high", due_date:"2026-05-10" },
  { id:"uar-003", review_ref:"UAR-003", name:"Privileged Access Review CISO", type:"privileged", status:"in_progress", scope:"Admin roles only", risk_level:"critical", due_date:"2026-04-26" },
  { id:"uar-004", review_ref:"UAR-004", name:"Data Warehouse Entitlement Review", type:"entitlement", status:"pending", scope:"DS-001 to DS-005", risk_level:"critical", due_date:"2026-04-29" },
  { id:"uar-005", review_ref:"UAR-005", name:"SoD Conflict Resolution Finance", type:"sod_check", status:"pending", scope:"Finance + Risk roles", risk_level:"high", due_date:"2026-05-03" },
];

export const MOCK_ENTITLEMENTS = [
  { id:"ent-001", name:"Model Deploy - Production", type:"permission", system:"MLOps", risk_level:"critical", is_privileged:true, requires_approval:true },
  { id:"ent-002", name:"Data Read - PII Datasets", type:"data_access", system:"Data Warehouse", risk_level:"high", is_privileged:false, requires_approval:true },
  { id:"ent-003", name:"Admin - Sentinel GRC", type:"role", system:"Sentinel", risk_level:"critical", is_privileged:true, requires_approval:true },
];

export const MOCK_SOD_VIOLATIONS = [
  { id:"sod-001", violation_ref:"SOD-001", rule_name:"Model Deploy + Model Approve", severity:"critical", status:"open", detected_at:"2026-04-15T10:00:00Z" },
  { id:"sod-002", violation_ref:"SOD-002", rule_name:"Data Write + Data Approve", severity:"high", status:"mitigated", detected_at:"2026-04-10T14:00:00Z" },
  { id:"sod-003", violation_ref:"SOD-003", rule_name:"Risk Assess + Risk Accept", severity:"high", status:"open", detected_at:"2026-04-18T09:00:00Z" },
];

export const MOCK_TIA = [
  { id:"tia-001", tia_ref:"TIA-001", title:"US Cloud Provider Transfer Assessment", source_country:"EU", destination_country:"US", transfer_mechanism:"DPF", status:"completed", risk_level:"medium", dpo_approved:true },
  { id:"tia-002", tia_ref:"TIA-002", title:"India ML Training Data Transfer", source_country:"EU", destination_country:"India", transfer_mechanism:"SCCs", status:"in_progress", risk_level:"high", dpo_approved:false },
  { id:"tia-003", tia_ref:"TIA-003", title:"Singapore Model Serving Transfer", source_country:"EU", destination_country:"Singapore", transfer_mechanism:"SCCs", status:"draft", risk_level:"high", dpo_approved:false },
];

export const MOCK_TABLETOP = [
  { id:"tte-001", exercise_ref:"TTE-001", name:"AI Bias Incident Response Tabletop", type:"AI-Incident", status:"completed", duration_minutes:180, scheduled_at:"2026-03-15T09:00:00Z" },
  { id:"tte-002", exercise_ref:"TTE-002", name:"Ransomware AI Pipeline BCP", type:"Ransomware", status:"completed", duration_minutes:120, scheduled_at:"2026-03-20T14:00:00Z" },
  { id:"tte-003", exercise_ref:"TTE-003", name:"Shadow AI Data Exfiltration", type:"IR", status:"planned", duration_minutes:150, scheduled_at:"2026-05-01T09:00:00Z" },
  { id:"tte-004", exercise_ref:"TTE-004", name:"EU AI Act Regulator Audit Simulation", type:"Regulatory", status:"planned", duration_minutes:90, scheduled_at:"2026-05-15T10:00:00Z" },
];

export const MOCK_REGULATOR_FILINGS = [
  { id:"fil-001", filing_ref:"FIL-001", title:"Q1 2026 AI Act Art.73 Serious Incident Bias Alert", regulation:"EU-AI-Act-73", type:"incident_report", status:"draft", deadline:new Date(Date.now()+15*86400000).toISOString(), regulator_name:"EU AI Office" },
  { id:"fil-002", filing_ref:"FIL-002", title:"GDPR Art.33 Breach Notification Shadow AI", regulation:"GDPR-33", type:"breach_notification", status:"submitted", deadline:new Date(Date.now()-2*86400000).toISOString(), regulator_name:"ICO UK" },
  { id:"fil-003", filing_ref:"FIL-003", title:"NIS2 Significant Incident ML Pipeline", regulation:"NIS2", type:"incident_report", status:"draft", deadline:new Date(Date.now()+21*3600000).toISOString(), regulator_name:"ENISA National Authority" },
  { id:"fil-004", filing_ref:"FIL-004", title:"DORA Major Incident AML System Outage", regulation:"DORA", type:"incident_report", status:"in_review", deadline:new Date(Date.now()+3*86400000).toISOString(), regulator_name:"EBA" },
  { id:"fil-005", filing_ref:"FIL-005", title:"Annual EU AI Act Compliance Report 2026", regulation:"EU-AI-Act-73", type:"annual_report", status:"draft", deadline:new Date(Date.now()+60*86400000).toISOString(), regulator_name:"EU AI Office" },
];

export const MOCK_BIA = [
  { id:"bia-001", bia_ref:"BIA-001", process_name:"Credit Risk Scoring Pipeline", department:"AI Analytics", criticality:"critical", rto_hours:2, rpo_hours:0.5, mtd_hours:4, financial_impact_per_hour:45000, regulatory_impact:"EU AI Act Art.9 immediate reporting required" },
  { id:"bia-002", bia_ref:"BIA-002", process_name:"Fraud Detection Real-time Feed", department:"Security Fraud", criticality:"critical", rto_hours:0.5, rpo_hours:0.1, mtd_hours:1, financial_impact_per_hour:120000, regulatory_impact:"FCA PRA notification within 4 hours" },
  { id:"bia-003", bia_ref:"BIA-003", process_name:"AML Transaction Monitoring", department:"Compliance", criticality:"critical", rto_hours:4, rpo_hours:1, mtd_hours:8, financial_impact_per_hour:30000, regulatory_impact:"FCA Reg deadline 4 hour notification" },
  { id:"bia-004", bia_ref:"BIA-004", process_name:"Customer Data Platform", department:"Data Engineering", criticality:"high", rto_hours:8, rpo_hours:2, mtd_hours:24, financial_impact_per_hour:15000, regulatory_impact:"GDPR Art.33 breach clock" },
  { id:"bia-005", bia_ref:"BIA-005", process_name:"AI Model Training Pipeline", department:"ML Operations", criticality:"high", rto_hours:24, rpo_hours:4, mtd_hours:48, financial_impact_per_hour:8000, regulatory_impact:"ISO 42001 monitoring gap" },
];
