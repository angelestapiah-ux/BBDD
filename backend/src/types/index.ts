export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'agent' | 'viewer';
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_id?: string;
  position?: string;
  status: 'active' | 'inactive' | 'lead' | 'prospect' | 'customer';
  source?: string;
  notes?: string;
  assigned_to?: string;
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
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date?: string;
  contact_id?: string;
  company_id?: string;
  assigned_to?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}
