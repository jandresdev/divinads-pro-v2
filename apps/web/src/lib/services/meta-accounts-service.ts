import { supabaseAdmin } from '@/lib/api/autenticar'
import { ClienteMetaAds } from './meta-ads-cliente'

// ---------------------------------------------------------------------------
// Servicio para gestionar las cuentas Meta almacenadas en Supabase
// Tabla: meta_accounts — columnas relevantes:
//   tenant_id, access_token, meta_account_id, activa
// ---------------------------------------------------------------------------

// Obtiene un cliente Meta listo para usar dado un tenant_id
// Retorna null si no hay cuenta configurada o activa
export async function obtenerClienteMeta(tenantId: string): Promise<ClienteMetaAds | null> {
  try {
    const { data: cuenta, error } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token, meta_account_id')
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .limit(1)
      .single()

    if (error || !cuenta) {
      console.warn(`[meta-accounts-service] No hay cuenta Meta configurada y activa para tenant=${tenantId}`)
      return null
    }

    return new ClienteMetaAds(cuenta.access_token, cuenta.meta_account_id)
  } catch (error) {
    console.error(`[meta-accounts-service] Error inesperado al obtener cliente Meta de Supabase: tenant=${tenantId}`, error)
    return null
  }
}

// Verifica si un tenant tiene al menos una cuenta Meta activa configurada
export async function tieneCuentaMeta(tenantId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('meta_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('activa', true)

  return (count ?? 0) > 0
}
