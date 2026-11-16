/** Erro de regra de negócio: a mensagem é segura para mostrar ao usuário. */
export class DomainError extends Error {
  readonly status: 400 | 403 | 404 | 409;
  readonly field?: string;

  constructor(message: string, options: { status?: 400 | 403 | 404 | 409; field?: string } = {}) {
    super(message);
    this.name = 'DomainError';
    this.status = options.status ?? 400;
    this.field = options.field;
  }
}

const NOT_FOUND_MESSAGES = {
  Atleta: 'Atleta não encontrado.',
  Arena: 'Arena não encontrada.',
  Prova: 'Prova não encontrada.',
} as const;

export function notFound(entity: keyof typeof NOT_FOUND_MESSAGES): DomainError {
  return new DomainError(NOT_FOUND_MESSAGES[entity], { status: 404 });
}
