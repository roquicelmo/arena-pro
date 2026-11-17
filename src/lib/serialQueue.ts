/**
 * Fila em série por chave: tarefas da mesma chave rodam na ordem em que entraram,
 * uma depois da outra (o banco termina com o último valor digitado).
 */
export function createSerialQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    tails.set(key, next);
    void next.finally(() => {
      if (tails.get(key) === next) tails.delete(key);
    }).catch(() => undefined);
    return next;
  };
}
