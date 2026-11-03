import { prisma } from '@neup/core/database/prisma';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { LocationsManager } from './locations-manager';
import { Pagination } from '@/components/manage/pagination';

const LOCATIONS_PER_PAGE = 50;

// Loads location records for users with the location management capability.
// Loads a bounded page of locations while retaining the hierarchy for parent selection.
export default async function ManageLocationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission(PERMISSIONS.manage.locationsManage);
  const resolvedSearchParams = await searchParams;
  const requestedPage = Array.isArray(resolvedSearchParams?.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams?.page;
  const searchQuery = Array.isArray(resolvedSearchParams?.area)
    ? resolvedSearchParams.area[0]?.trim() ?? ''
    : resolvedSearchParams?.area?.trim() ?? '';
  const parsedPage = Number(requestedPage ?? '1');
  const locationFilter = {
    ...(searchQuery ? {
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' as const } },
        { type: { contains: searchQuery, mode: 'insensitive' as const } },
        { postalCode: { contains: searchQuery, mode: 'insensitive' as const } },
      ],
    } : {}),
  };
  const totalLocations = await prisma.location.count({ where: locationFilter });
  const totalPages = Math.max(1, Math.ceil(totalLocations / LOCATIONS_PER_PAGE));
  const currentPage = Number.isInteger(parsedPage)
    ? Math.min(Math.max(1, parsedPage), totalPages)
    : 1;
  const [locations, allLocations] = await Promise.all([
    prisma.location.findMany({
      where: locationFilter,
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
      skip: (currentPage - 1) * LOCATIONS_PER_PAGE,
      take: LOCATIONS_PER_PAGE,
      select: { id: true, title: true, type: true, childOf: true, postalCode: true, status: true },
    }),
    prisma.location.findMany({
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, type: true, childOf: true, postalCode: true, status: true },
    }),
  ]);
  return (
    <>
      <LocationsManager locations={locations} allLocations={allLocations} totalLocations={totalLocations} searchQuery={searchQuery} />
      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
    </>
  );
}
