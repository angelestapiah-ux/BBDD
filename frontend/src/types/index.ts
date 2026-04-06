export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'viewer';
  avatar?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_id?: string;
  company_name?: string;
  position?: string;
  status: 'active' | 'inactive' | 'lead' | 'prospect' | 'customer';
  source?: string;
  notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  status: 'active' | 'inactive' | 'prospect' | 'customer';
  notes?: string;
  contacts_count?: number;
  deals_count?: number;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date?: string;
  contact_id?: string;
  contact_name?: string;
  company_id?: string;
  company_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note';
export type ActivityStatus = 'pending' | 'completed' | 'cancelled';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  status: ActivityStatus;
  due_date?: string;
  completed_at?: string;
  contact_id?: string;
  contact_name?: string;
  company_id?: string;
  company_name?: string;
  deal_id?: string;
  deal_title?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  totalDeals: number;
  pendingActivities: number;
  wonValue: number;
  pipelineValue: number;
  newContactsMonth: number;
  wonDeals: number;
}

export interface DashboardData {
  stats: DashboardStats;
  dealsByStage: Array<{ stage: string; count: number; total_value: number }>;
  recentActivities: Activity[];
  upcomingActivities: Activity[];
  topDeals: Deal[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
