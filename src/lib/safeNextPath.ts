/** Destino pós-login: só caminhos relativos do próprio app; qualquer outra coisa vira `/`. */
export function safeNextPath(input: string | null | undefined): string {
  if (!input || !input.startsWith('/')) return '/';
  if (input.startsWith('//') || input.includes('\\') || /\p{Cc}/u.test(input)) return '/';
  if (input === '/login' || input.startsWith('/login?') || input.startsWith('/login/')) return '/';
  return input;
}
