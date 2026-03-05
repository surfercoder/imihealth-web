export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      informes: {
        Row: {
          audio_path: string | null
          created_at: string
          doctor_id: string
          id: string
          informe_doctor: string | null
          informe_paciente: string | null
          patient_id: string
          pdf_path: string | null
          status: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          informe_doctor?: string | null
          informe_paciente?: string | null
          patient_id: string
          pdf_path?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          informe_doctor?: string | null
          informe_paciente?: string | null
          patient_id?: string
          pdf_path?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
        }
      }
      patients: {
        Row: {
          created_at: string
          dob: string
          doctor_id: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dob: string
          doctor_id: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dob?: string
          doctor_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Patient = Database["public"]["Tables"]["patients"]["Row"]
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"]
export type Informe = Database["public"]["Tables"]["informes"]["Row"]
export type InformeInsert = Database["public"]["Tables"]["informes"]["Insert"]
export type InformeStatus = "recording" | "processing" | "completed" | "error"
