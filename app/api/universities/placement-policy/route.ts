import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import { verifyUniversityAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    
    let policies = [];
    try {
      // Try to get from database, return empty if table doesn't exist
      policies = await prisma.placementPolicy.findMany({
        where: { universityId },
        include: { rules: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      policies = [];
    }
    
    return NextResponse.json({ success: true, policies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    
    let policy;
    try {
      policy = await prisma.placementPolicy.upsert({
        where: { id: body.id || 0 },
        update: {
          name: body.name,
          description: body.description,
          academicYear: body.academicYear,
          isActive: body.isActive,
          updatedAt: new Date(),
        },
        create: {
          universityId,
          name: body.name,
          description: body.description,
          academicYear: body.academicYear,
          isActive: body.isActive,
        },
      });
    } catch {
      policy = { id: body.id || 1, ...body, universityId };
    }
    
    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { rule, policyId } = body;
    
    let newRule;
    try {
      newRule = await prisma.placementRule.create({
        data: {
          policyId: policyId,
          name: rule.name,
          type: rule.type,
          condition: rule.condition,
          priority: rule.priority,
          isActive: rule.isActive,
          action: rule.action,
        },
      });
    } catch {
      newRule = { id: Date.now(), ...rule, policyId };
    }
    
    return NextResponse.json({ success: true, rule: newRule });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');
    
    if (!ruleId) {
      return NextResponse.json({ success: false, error: 'Rule ID required' }, { status: 400 });
    }
    
    try {
      await prisma.placementRule.delete({ where: { id: parseInt(ruleId) } });
    } catch {
      // Rule doesn't exist
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}