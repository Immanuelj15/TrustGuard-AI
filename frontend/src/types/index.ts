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
  total_evidence?: number;
  open_cases: number;
  open_investigations?: number;
  cases_awaiting_review: number;
  evidence_analyzed: number;
  high_risk_findings: number;
  iocs_found?: number;
  active_investigators: number;
}

export interface DashboardCharts {
  cases_by_status: Record<string, number>;
  cases_by_priority: Record<string, number>;
  evidence_by_type: Record<string, number>;
  risk_distribution: Record<string, number>;
  ioc_frequency?: Record<string, number>;
  recent_activity: AuditLog[];
}

export interface SyntheticSample {
  sample_id: string;
  modality: 'text' | 'audio' | 'video' | 'multimodal';
  label: string;
  title: string;
  summary: string;
  category: string;
  risk_score?: number;
  risk_level?: string;
  duration_seconds?: number;
  sample_rate?: number;
  resolution?: string;
  transformation?: string;
  generation_method?: string;
  synthetic_data: boolean;
  filename?: string;
  file_path?: string;
}

export interface SyntheticManifest {
  dataset_name: string;
  version: string;
  created_timestamp: string;
  counts: {
    audio_samples: number;
    video_samples: number;
    multimodal_pairs: number;
    text_samples: number;
  };
  synthetic_data: boolean;
  warning: string;
}

export interface OpenRouterStatus {
  enabled: boolean;
  configured: boolean;
  status: string;
  model?: string;
  base_url: string;
  site_url?: string;
  app_name: string;
  disclaimer: string;
}

export interface SuspiciousIndicator {
  indicator: string;
  reason: string;
  supporting_text?: string;
}

export interface EvidenceExplanation {
  summary: string;
  suspicious_indicators: SuspiciousIndicator[];
  possible_social_engineering_tactics: string[];
  recommended_investigation_steps: string[];
  limitations: string[];
  overall_assessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'INCONCLUSIVE';
  provider: string;
  model_id?: string;
  generated_at: string;
  is_live_inference: boolean;
  was_redacted: boolean;
  redaction_notice?: string;
  evidence_id?: string;
  case_id?: string;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  evidence_id?: string;
  user_id?: string;
  event_type: string;
  title: string;
  description: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface IntegrityCheckResult {
  evidence_id: string;
  filename: string;
  stored_hash: string;
  computed_hash: string;
  algorithm: string;
  status: 'VERIFIED' | 'HASH_MISMATCH' | 'UNAVAILABLE';
  checked_at: string;
  disclaimer: string;
}

export interface IOCItem {
  id: string;
  case_id: string;
  evidence_id?: string;
  ioc_type: 'PHONE' | 'EMAIL' | 'URL' | 'DOMAIN' | 'IPV4' | 'UPI';
  value: string;
  normalized_value: string;
  context_snippet?: string;
  created_at: string;
}

export interface IOCCorrelation {
  ioc_type: string;
  normalized_value: string;
  count: number;
  evidence_ids: string[];
  evidence_filenames: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'case' | 'evidence' | 'ioc';
  subType?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface CorrelationGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface EvidenceSimilarity {
  evidence_1_id: string;
  evidence_1_name: string;
  evidence_2_id: string;
  evidence_2_name: string;
  similarity_score: number;
  relation_label: 'Very Similar' | 'Related' | 'Possibly Related' | 'Low Similarity';
  is_exact_duplicate: boolean;
  comparison_method: string;
  disclaimer: string;
}

export interface CopilotResponse {
  answer: string;
  provider: string;
  references: string[];
  pii_redacted: boolean;
  redaction_count?: number;
  disclaimer: string;
}

export interface ModelMetric {
  model_name: string;
  model_id: string;
  task: string;
  evaluation_status: 'EVALUATED' | 'LIVE MODEL' | 'DEMO' | 'NOT EVALUATED';
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  confusion_matrix?: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
  inference_latency_ms?: number;
  dataset_description: string;
  disclaimer: string;
}

export interface ModelEvaluationDashboardData {
  timestamp: string;
  models: ModelMetric[];
  notes: string;
}
