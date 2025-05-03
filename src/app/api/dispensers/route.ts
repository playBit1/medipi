import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/dispensers - Get all dispensers with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const where: {
      OR?: Array<{
        serialNumber?: { contains: string };
      }>;
      patientId?: { not: null } | null;
    } = {};

    if (search) {
      where.OR = [{ serialNumber: { contains: search } }];
    }

    if (status === 'assigned') {
      where.patientId = { not: null };
    } else if (status === 'unassigned') {
      where.patientId = null;
    }

    // Get dispensers with pagination
    const [dispensers, totalCount] = await Promise.all([
      prisma.dispenser.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.dispenser.count({ where }),
    ]);

    return NextResponse.json({
      items: dispensers,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error('Error fetching dispensers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispensers' },
      { status: 500 }
    );
  }
}

// POST /api/dispensers - Create a new dispenser
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Check if dispenser with the same serial number already exists
    const existingDispenser = await prisma.dispenser.findUnique({
      where: { serialNumber: data.serialNumber },
    });

    if (existingDispenser) {
      return NextResponse.json(
        { error: 'A dispenser with this serial number already exists' },
        { status: 409 }
      );
    }

    // Create new dispenser
    const dispenser = await prisma.dispenser.create({
      data: {
        serialNumber: data.serialNumber,
        status: data.status || 'OFFLINE',
      },
    });

    // Create 6 chambers for this dispenser
    for (let i = 1; i <= 6; i++) {
      await prisma.chamber.create({
        data: {
          dispenserId: dispenser.id,
          chamberNumber: i,
        },
      });
    }

    // Create RFID tags (only for admin initially)
    await prisma.dispenserRfid.create({
      data: {
        dispenserId: dispenser.id,
        rfidTag: `ADMIN-${data.serialNumber}`,
        type: 'ADMIN',
      },
    });

    return NextResponse.json(dispenser, { status: 201 });
  } catch (error) {
    console.error('Error creating dispenser:', error);
    return NextResponse.json(
      { error: 'Failed to create dispenser' },
      { status: 500 }
    );
  }
}
