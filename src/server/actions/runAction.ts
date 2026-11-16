import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '../../lib/actionResult';
import type { AuthenticatedUser } from '../auth';
import { DomainError } from '../services/errors';
import { ActionAuthError, requireActionUser } from '../session';

export type RevalidateTarget = string | { path: string; type: 'layout' | 'page' };

interface RunActionOptions<S extends z.ZodType, T> {
  schema: S;
  input: unknown;
  revalidate: RevalidateTarget[] | ((data: T) => RevalidateTarget[]);
  roles?: readonly string[];
}

/**
 * Casca comum das Server Actions: autentica, valida, executa e revalida.
 * Nunca lança: todo erro vira `{ ok: false }` para o cliente.
 */
export async function runAction<S extends z.ZodType, T>(
  options: RunActionOptions<S, T>,
  handler: (user: AuthenticatedUser, data: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await requireActionUser(options.roles);

    const parsed = options.schema.safeParse(options.input);
    if (!parsed.success) {
      return {
        ok: false,
        message: 'Revise os campos destacados.',
        fieldErrors: z.flattenError(parsed.error as z.ZodError).fieldErrors,
      };
    }

    const data = await handler(user, parsed.data);

    const targets = typeof options.revalidate === 'function' ? options.revalidate(data) : options.revalidate;
    for (const target of targets) {
      if (typeof target === 'string') revalidatePath(target);
      else revalidatePath(target.path, target.type);
    }
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ActionAuthError) {
      return error.code === 'UNAUTHENTICATED'
        ? { ok: false, code: 'UNAUTHENTICATED', message: error.message }
        : { ok: false, message: error.message };
    }
    if (error instanceof DomainError) {
      return error.field
        ? { ok: false, message: error.message, fieldErrors: { [error.field]: [error.message] } }
        : { ok: false, message: error.message };
    }
    console.error('Falha inesperada em Server Action:', error);
    return { ok: false, message: 'Não foi possível concluir a ação. Tente novamente.' };
  }
}
