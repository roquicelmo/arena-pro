import { notFound } from 'next/navigation';
import { UiShowcase } from './UiShowcase';

export const metadata = { title: 'Vitrine de componentes | Arena Pro' };

/** Vitrine das primitivas de UI — disponível apenas em desenvolvimento. */
export default function UiShowcasePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiShowcase />;
}
