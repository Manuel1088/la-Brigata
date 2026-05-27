import type { LocationType, Prisma, RestaurantLocation } from '@prisma/client'
import type { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { getDefaultOpeningHours, normalizeOpeningHours, type OpeningHours } from '@/lib/location-hours'
import { hasPermission } from '@/lib/permissions'
import { assertRestaurantAccess } from '@/lib/restaurantLocations'

export type LocationDto = {
  id: string
  name: string
  outletName: string
  type: LocationType
  capacity: number | null
  tables: number | null
  icon: string | null
  isActive: boolean
  sortOrder: number
  openingHours: OpeningHours
  address: string | null
  restaurantId: string
  createdAt: string
  updatedAt: string
}

export function serializeLocation(row: RestaurantLocation): LocationDto {
  return {
    id: row.id,
    name: row.name,
    outletName: row.outletName,
    type: row.type,
    capacity: row.capacity,
    tables: row.tables,
    icon: row.icon,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    openingHours: normalizeOpeningHours(row.openingHours as OpeningHours | null),
    address: row.address,
    restaurantId: row.restaurantId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function requireManageCompanySession(): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non autorizzato' }, { status: 401 }),
    }
  }

  const role = String(session.user.role ?? '')
  const ccnlLevel = session.user.ccnlLevel ?? null
  const dbGranted = session.user.dbGrantedPermissionIds ?? []

  if (!hasPermission(role, 'manage_company_settings', ccnlLevel, dbGranted)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Permesso negato' }, { status: 403 }),
    }
  }

  return { ok: true, session }
}

export async function requireRestaurantManageAccess(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  return assertRestaurantAccess(prisma, userId, restaurantId)
}

export async function nextSortOrder(restaurantId: string): Promise<number> {
  const agg = await prisma.restaurantLocation.aggregate({
    where: { restaurantId },
    _max: { sortOrder: true },
  })
  return (agg._max.sortOrder ?? -1) + 1
}

export function buildLocationCreateData(
  restaurantId: string,
  input: {
    name: string
    outletName: string
    type: LocationType
    capacity?: number | null
    tables?: number | null
    icon?: string | null
    isActive?: boolean
    sortOrder?: number
    openingHours?: OpeningHours
    address?: string | null
  },
  sortOrder: number
): Prisma.RestaurantLocationUncheckedCreateInput {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    outletName: input.outletName.trim(),
    type: input.type,
    capacity: input.capacity ?? null,
    tables: input.tables ?? null,
    icon: input.icon?.trim() || '🍽️',
    isActive: input.isActive ?? true,
    sortOrder,
    openingHours: (input.openingHours ?? getDefaultOpeningHours()) as Prisma.InputJsonValue,
    address: input.address?.trim() || null,
    restaurantId,
  }
}
