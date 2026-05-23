import { isPlatformAdmin, isPlatformAdminScope } from '@/lib/platform-admin'

/** @deprecated Usa `isPlatformAdmin` da `@/lib/platform-admin`. */
export const isSystemAdmin = isPlatformAdmin

export { isPlatformAdminScope }
