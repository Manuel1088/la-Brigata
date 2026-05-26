import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { formatBirthDateForInput, splitFullName } from '@/lib/profile-fields'

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  secondaryEmail: true,
  birthDate: true,
  birthPlace: true,
  maritalStatus: true,
  childrenCount: true,
  education: true,
  languages: true,
  hobbies: true,
  sports: true,
  emergencyContact: true,
  emergencyPhone: true,
  avatar: true,
  role: true,
  department: true,
  position: true,
} as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: profileSelect,
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const { firstName, lastName } = splitFullName(user.name)

    return NextResponse.json({
      profile: {
        id: user.id,
        firstName,
        lastName,
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        secondaryEmail: user.secondaryEmail ?? '',
        birthDate: formatBirthDateForInput(user.birthDate),
        birthPlace: user.birthPlace ?? '',
        maritalStatus: user.maritalStatus ?? '',
        childrenCount: user.childrenCount ?? 0,
        education: user.education ?? '',
        languages: user.languages ?? '',
        hobbies: user.hobbies ?? '',
        sports: user.sports ?? '',
        emergencyContact: user.emergencyContact ?? '',
        emergencyPhone: user.emergencyPhone ?? '',
        avatar: user.avatar ?? '👤',
        role: String(user.role),
        department: user.department ?? '',
        position: user.position ?? '',
      },
    })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
