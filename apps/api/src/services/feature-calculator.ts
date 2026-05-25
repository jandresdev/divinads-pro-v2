// ---------------------------------------------------------------------------
// Módulo de cálculo matemático para feature engineering de DivinADS
// Funciones puras sin efectos secundarios para facilitar testing
// ---------------------------------------------------------------------------

/**
 * Calcular la media aritmética de un array de números.
 * Retorna 0 si el array está vacío.
 */
export function calcularMedia(valores: number[]): number {
  if (!valores.length) return 0
  return valores.reduce((sum, v) => sum + v, 0) / valores.length
}

/**
 * Calcular la desviación estándar poblacional de un array de números.
 * Retorna 0 si hay menos de 2 valores (varianza indefinida para muestras únicas).
 */
export function calcularDesviacionEstandar(valores: number[]): number {
  if (valores.length < 2) return 0
  const media = calcularMedia(valores)
  const varianza = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valores.length
  return Math.sqrt(varianza)
}

/**
 * Calcular el coeficiente de variación (volatilidad relativa) de un array.
 * Equivale a desviacionEstandar / media — indica dispersión normalizada.
 * Retorna 0 si la media es 0 para evitar división por cero.
 */
export function calcularVolatilidad(valores: number[]): number {
  const media = calcularMedia(valores)
  if (media === 0) return 0
  return calcularDesviacionEstandar(valores) / media
}

/**
 * Calcular la tendencia porcentual entre dos períodos consecutivos.
 * Fórmula: ((actual - anterior) / anterior) * 100
 * Retorna 0 si el período anterior es 0 para evitar división por cero.
 */
export function calcularTendencia(actual: number, anterior: number): number {
  if (anterior === 0) return 0
  return ((actual - anterior) / anterior) * 100
}

/**
 * Calcular el percentil de un valor dentro de un conjunto de referencia.
 * Usa el método de rango: porcentaje de valores del conjunto menores al valor dado.
 * Retorna 0 si el conjunto está vacío.
 */
export function calcularPercentil(valor: number, conjunto: number[]): number {
  if (!conjunto.length) return 0
  const menores = conjunto.filter(v => v < valor).length
  return Math.round((menores / conjunto.length) * 100)
}

/**
 * Filtrar un array de objetos con fecha (YYYY-MM-DD) a los últimos N días.
 * Compara fechas como strings ISO para eficiencia sin instanciar Date por cada elemento.
 */
export function filtrarPorVentana<T extends { fecha: string }>(
  datos: T[],
  diasAtras: number
): T[] {
  const limite = new Date()
  limite.setDate(limite.getDate() - diasAtras)
  // Comparar como string YYYY-MM-DD es seguro y evita problemas de zona horaria
  const limiteStr = limite.toISOString().split('T')[0]
  return datos.filter(d => d.fecha >= limiteStr)
}
