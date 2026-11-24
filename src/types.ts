export type PageRoute =
  | { name: 'home' }
  | { name: 'register' }
  | { name: 'login' }
  | { name: 'student-dashboard' }
  | { name: 'report-lost' }
  | { name: 'report-found' }
  | { name: 'search' }
  | { name: 'details'; itemId: string }
  | { name: 'claim'; itemId: string }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-items' }
  | { name: 'admin-claims' };

export interface StudentUser {
  user_id: string;
  student_name: string;
  usn: string;
  email: string;
  phone: string;
  created_at?: string;
}

export interface AdminUser {
  admin_id: string;
  username: string;
  email: string;
}

export interface Category {
  category_id: string;
  category_name: string;
}

export type ReportType = 'lost' | 'found';
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'returned';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ItemRecord {
  item_id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  item_name: string;
  description: string;
  report_type: ReportType;
  item_date: string;
  location: string;
  image: string | null;
  status: ItemStatus;
  created_at: string;
  reporter_name: string;
}

export interface ClaimRecord {
  claim_id: string;
  item_id: string;
  user_id: string;
  item_name: string;
  item_location: string;
  item_report_type: ReportType;
  category_name: string;
  claimant_name: string;
  claimant_usn: string;
  claimant_email: string;
  claimant_phone: string;
  claim_description: string;
  supporting_info: string;
  claim_status: ClaimStatus;
  created_at: string;
}

export interface PublicStats {
  active_lost: number;
  active_found: number;
  returned_count: number;
  category_count: number;
}

export interface AdminDashboardStats {
  total_users: number;
  total_lost: number;
  total_found: number;
  pending_reports: number;
  approved_reports: number;
  returned_items: number;
  pending_claims: number;
}
