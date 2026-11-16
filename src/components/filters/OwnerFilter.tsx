'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select } from '../ui/Select';

export interface OwnerFilterProps {
  owners: Array<{ id: string; name: string | null; email: string }>;
  value: string;
}

export function OwnerFilter({ owners, value }: OwnerFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const change = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('dono', next);
    else params.delete('dono');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Select label="Proprietário" value={value} onChange={(event) => change(event.target.value)}>
      <option value="">Todos os proprietários</option>
      {owners.map((owner) => (
        <option key={owner.id} value={owner.id}>
          {owner.name ?? owner.email}
        </option>
      ))}
    </Select>
  );
}
