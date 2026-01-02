export interface Doctor {
  id: string;
  user_id?: string;
  avatar_url: string | null;
  full_name: string;
  specialty: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}