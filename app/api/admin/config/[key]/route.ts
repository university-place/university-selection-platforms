import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyAdmin(request: Request) {
  // same as above
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await verifyAdmin(request)
    const { key } = await params

    const config = await prisma.systemConfig.findUnique({
      where: { key }
    })

    if (!config) {
      return NextResponse.json({ error: 'Config key not found' }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}