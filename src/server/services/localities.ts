import { prisma } from '../prisma';

// Sem 'server-only': os handlers do Pages API importam commands que usam este serviço.

export const DEFAULT_UF = 'GO';
export const DEFAULT_CITY_NAME = 'Caiapônia';

export type MunicipalityRef = { code: number; name: string; uf: string };

export async function listStates(): Promise<Array<{ uf: string; name: string }>> {
  return prisma.brState.findMany({ select: { uf: true, name: true }, orderBy: { name: 'asc' } });
}

export async function listMunicipalities(uf: string): Promise<Array<{ code: number; name: string }>> {
  return prisma.municipality.findMany({
    where: { uf: uf.trim().toUpperCase() },
    select: { code: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function findMunicipality(code: number): Promise<MunicipalityRef | null> {
  return prisma.municipality.findUnique({ where: { code }, select: { code: true, name: true, uf: true } });
}

export async function getDefaultCity(): Promise<MunicipalityRef> {
  const city = await prisma.municipality.findFirst({
    where: { name: DEFAULT_CITY_NAME, uf: DEFAULT_UF },
    select: { code: true, name: true, uf: true },
  });
  if (!city) throw new Error(`Município padrão ${DEFAULT_CITY_NAME}/${DEFAULT_UF} não encontrado na tabela de localidades.`);
  return city;
}
