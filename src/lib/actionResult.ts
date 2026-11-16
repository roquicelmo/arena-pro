export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors; code?: 'UNAUTHENTICATED' };

/** Texto do aviso do formulário; null quando o mesmo texto já aparece junto de um campo. */
export function formBannerMessage(message: string | null, fieldErrors: FieldErrors): string | null {
  if (!message) return null;
  const duplicated = Object.values(fieldErrors).some((list) => list?.includes(message));
  return duplicated ? null : message;
}
