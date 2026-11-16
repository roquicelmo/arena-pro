import type { Page } from '@playwright/test';

const IGNORED = [/recaptcha/i];

/** Coleta erros de console e de página; retorna uma função que devolve a lista. */
export function trackConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !IGNORED.some((pattern) => pattern.test(message.text()))) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return () => errors;
}

export async function hasNoHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}
