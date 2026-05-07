import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

export async function GET(request: Request) {
  try {
    await verifyAdmin(request)

    const universities = await prisma.university.findMany({
      where: { isActive: true },
      select: {
        name: true,
        code: true,
        lastAdmissionInfoUpdate: true,
        lastCapacityDeclaration: true,
        lastPlacementSubmission: true,
        complianceStatus: true,
        complianceNotes: true,
        _count: { select: { programs: true, placements: true } }
      },
      orderBy: { name: 'asc' }
    })

    const headers = ['University', 'Code', 'Programs', 'Last Program Update', 'Last Capacity', 'Last Placement', 'Placements Count', 'Status', 'Notes']
    const rows = universities.map(uni => [
      uni.name,
      uni.code,
      uni._count.programs,
      uni.lastAdmissionInfoUpdate?.toISOString() || 'Never',
      uni.lastCapacityDeclaration?.toISOString() || 'Never',
      uni.lastPlacementSubmission?.toISOString() || 'Never',
      uni._count.placements,
      uni.complianceStatus || 'unknown',
      uni.complianceNotes || ''
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="compliance-report.csv"'
      }
    })
  } catch (error) {
    // error handling
  }
}