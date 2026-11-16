'use client';

import { RouteError } from '../../src/components/shell/RouteError';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />;
}
