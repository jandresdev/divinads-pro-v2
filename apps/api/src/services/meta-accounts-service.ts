import { supabaseAdmin } from '../db/supabase'
import { ClienteMetaAds } from './meta-ads-cliente'
import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Servicio para gestionar las cuentas Meta almacenadas en Supabase
// Tabla: meta_accounts — columnas relevantes:
//   tenant_id, access_token, ad_account_id, token_expiry, activa
// ---------------------------------------------------------------------------

// Obtiene un cliente Meta listo para usar dado un tenant_id
// Retorna null si no hay cuenta configurada o el token expiró
export async function obtenerClienteMeta(tenantId: string): Promise<ClienteMetaAds | null> {
  try {
    const { data: cuenta, error } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token, ad_account_id, token_expiry')
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .single()

    if (error || !cuenta) {
      logger.warn({ tenantId }, 'No hay cuenta Meta configurada y activa para este tenant')
      return null
    }

    // Verificar que el token no haya expirado según la fecha almacenada
    if (cuenta.token_expiry && new Date(cuenta.token_expiry) < new Date()) {
      logger.warn({ tenantId }, 'El token de Meta ha expirado para este tenant')
      return null
    }

    return new ClienteMetaAds(cuenta.access_token, cuenta.ad_account_id)
  } catch (error) {
    logger.error({ error, tenantId }, 'Error inesperado al obtener cliente Meta de Supabase')
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
