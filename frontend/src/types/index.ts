export interface User {
  id: str;
  full_name: string;
  email: string;
  role: 'admin' | 'investigator' | 'reviewer' | 'demo_user';
  is_active: boolean;
  created_at: string;
}

export type str = string;

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  complaint_category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'under_investigation' | 'awaiting_review' | 'resolved' | 'closed';
  assigned_investigator_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
}

export interface CaseDetail extends Case {
  assigned_investigator_name?: string;
  creator_name?: string;
  evidence_items: EvidenceItem[];
  notes: InvestigatorNote[];
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  evidence_type: 'audio' | 'video' | 'text' | 'image' | 'document';
  uploaded_by: string;
  uploaded_at: string;
  processing_status: string;
}

export interface AnalysisResult {
  id: string;
  analysis_job_id: string;
  risk_level: string;
  risk_score: number;
  model_confidence?: number;
  findings_json: any;
  limitations_json: string[];
  created_at: string;
}

export interface AnalysisJob {
  id: string;
  evidence_id: string;
  analysis_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model_name: string;
  model_version: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  result?: AnalysisResult;
}

export interface InvestigatorNote {
  id: string;
  case_id: string;
  evidence_id?: string;
  user_id: string;
  author_name?: string;
  note: string;
  created_at: string;
}

export interface CallerReport {
  id: string;
  normalised_number: string;
  report_category: string;
  description: string;
  verification_status: string;
  created_at: string;
}

export interface CallerCheckResponse {
  normalised_number: string;
  is_valid_format: boolean;
  country_code?: string;
  carrier?: string;
  number_type?: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
  report_count: number;
  reports: CallerReport[];
  disclaimer: string;
  checked_at: string;
  data_sources: string[];
}

export interface GeneratedReport {
  id: string;
  case_id: string;
  generated_by: string;
  file_name: string;
  created_at: string;
  report_metadata_json?: any;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  case_id?: string;
  evidence_id?: string;
  metadata_json?: any;
  outcome: string;
  created_at: string;
}

export interface DashboardSummary {
  total_cases: number;
  open_cases: number;
  cases_awaiting_review: number;
  evidence_analyzed: number;
  high_risk_findings: number;
  active_investigators: number;
}

export interface DashboardCharts {
  cases_by_status: Record<string, number>;
  cases_by_priority: Record<string, number>;
  evidence_by_type: Record<string, number>;
  risk_distribution: Record<string, number>;
  recent_activity: AuditLog[];
}
