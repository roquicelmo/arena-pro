/** Chama a API e devolve o JSON; em falha lança Error com a mensagem do servidor (ou o fallback). */
export async function apiRequest<T = unknown>(url: string, init: RequestInit | undefined, fallbackMessage: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error(fallbackMessage);
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!response.ok) {
    const body = isJson ? await response.json().catch(() => null) as { message?: string } | null : null;
    throw new Error(body?.message ?? fallbackMessage);
  }
  return isJson ? await response.json() as T : null;
}
