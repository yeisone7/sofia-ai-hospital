export interface Appointment {
  id: string;
  user_id?: string; // Added user_id for RLS
  phone_number: string; // Added phone_number
  patient_name: string; // Added patient_name
  appointment_type: string; // Added appointment_type
  doctor_id: string | null;
  appointment_date: string; // Or Date, depending on how you handle dates
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  notes?: string | null; // Added notes
  reminder_sent?: boolean;
  created_at?: string;
  updated_at?: string;
  // Fields for joined data from other tables
  patient_avatar_url?: string | null;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_avatar_url?: string | null;
}

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