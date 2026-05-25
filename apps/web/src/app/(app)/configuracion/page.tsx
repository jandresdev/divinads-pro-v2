// Server wrapper que obtiene el email real del usuario autenticado
import { crearClienteServidor } from '@/lib/supabase/servidor'
import ContenidoConfiguracion from './ContenidoConfiguracion'

export default async function PaginaConfiguracion() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  return <ContenidoConfiguracion emailUsuario={user?.email ?? ''} />
}
