import { prisma } from '@neup/core/database/prisma';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { LocationsManager } from './locations-manager';

// Loads location records for users with the location management capability.
export default async function ManageLocationsPage() {
  await requirePagePermission(PERMISSIONS.manage.locationsManage);
  const locations = await prisma.location.findMany({
    orderBy: [{ type: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, type: true, childOf: true, postalCode: true, status: true },
  });
  return <LocationsManager locations={locations} />;
}
