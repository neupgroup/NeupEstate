import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

async function getWorkingProfile(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.workingProfile;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

export default async function ManageSwitchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const selectedAgency = await getWorkingProfile(searchParams);
  redirect(selectedAgency ? `/accounts?workingProfile=${encodeURIComponent(selectedAgency)}` : '/accounts');
}
