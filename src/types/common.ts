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

export interface Appointment {
  id: string;
  user_id: string;
  phone_number: string;
  patient_name: string;
  appointment_date: string;
  appointment_type: string;
  doctor_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  reminder_sent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}