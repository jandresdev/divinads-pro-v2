// Tipos de base de datos de Supabase para DivinADS
// Este archivo se puede regenerar con: supabase gen types typescript

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          stripe_customer_id: string | null
          subscription_plan: 'gratuito' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          stripe_customer_id?: string | null
          subscription_plan?: 'gratuito' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      campaigns: {
        Row: {
          id: string
          tenant_id: string
          meta_account_id: string
          meta_campaign_id: string
          nombre: string
          objetivo: string | null
          estado: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
          tipo: 'PROSPECCIÓN' | 'REMARKETING' | 'RETARGETING' | 'CONVERSIONES' | 'AWARENESS' | 'OTRO'
          presupuesto_diario_centavos: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
      }
      daily_metrics: {
        Row: {
          id: string
          tenant_id: string
          campaign_id: string
          fecha: string
          gasto_centavos: number
          impresiones: number
          clics: number
          conversiones: number
          ingresos_centavos: number
          alcance: number
          frecuencia: number
          roas: number
          cpc: number
          ctr: number
          cpa: number
          cpm: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_metrics']['Row'], 'id' | 'roas' | 'cpc' | 'ctr' | 'cpa' | 'cpm' | 'created_at'>
        Update: Partial<Database['public']['Tables']['daily_metrics']['Insert']>
      }
      anomalies: {
        Row: {
          id: string
          tenant_id: string
          campaign_id: string
          tipo: 'caida_roas' | 'subida_cpc' | 'frecuencia_alta' | 'caida_ctr' | 'subida_cpm' | 'bajo_alcance'
          severidad: number
          nombre_metrica: string
          valor_actual: number | null
          valor_base: number | null
          cambio_porcentual: number | null
          estado: 'abierta' | 'investigando' | 'resuelta' | 'ignorada'
          causa_detectada: string | null
          confianza_causa: number | null
          detectada_en: string
          resuelta_en: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['anomalies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['anomalies']['Insert']>
      }
      agent_actions: {
        Row: {
          id: string
          tenant_id: string
          campaign_id: string | null
          anomaly_id: string | null
          tipo_accion: 'pausa_campaña' | 'escalar_presupuesto' | 'reducir_presupuesto' | 'reasignar_presupuesto' | 'ajustar_puja' | 'monitorear'
          estado: 'pendiente' | 'aprobada' | 'ejecutada' | 'fallida' | 'revertida' | 'investigando'
          causa_detectada: string | null
          confianza_causa: number | null
          detalles_accion: Json
          opciones: Json
          puntaje_confianza: number | null
          impacto_estimado_centavos: number | null
          requiere_aprobacion: boolean
          aprobado_por: string | null
          aprobado_en: string | null
          ejecutado_en: string | null
          ejecutado_por: string
          explicacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['agent_actions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['agent_actions']['Insert']>
      }
    }
  }
}
