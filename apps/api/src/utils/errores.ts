// Error base de la aplicación
export class ErrorApp extends Error {
  public readonly codigo: number
  public readonly esOperacional: boolean

  constructor(mensaje: string, codigo: number, esOperacional = true) {
    super(mensaje)
    this.codigo = codigo
    this.esOperacional = esOperacional
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ErrorNoEncontrado extends ErrorApp {
  constructor(recurso: string) {
    super(`${recurso} no encontrado`, 404)
  }
}

export class ErrorNoAutorizado extends ErrorApp {
  constructor(mensaje = 'No autorizado') {
    super(mensaje, 401)
  }
}

export class ErrorValidacion extends ErrorApp {
  public readonly campos: Record<string, string>

  constructor(campos: Record<string, string>) {
    super('Error de validación', 422)
    this.campos = campos
  }
}
