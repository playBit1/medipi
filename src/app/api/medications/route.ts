import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/medications - Get all medications with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const lowStock = searchParams.get('lowStock') === 'true';
    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const where: {
      OR?: Array<{
        name?: { contains: string };
        description?: { contains: string };
        dosageUnit?: { contains: string };
      }>;
      stockLevel?: {
        lt: typeof prisma.medication.fields.stockThreshold;
      };
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { dosageUnit: { contains: search } },
      ];
    }

    if (lowStock) {
      where.stockLevel = {
        lt: prisma.medication.fields.stockThreshold,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { dosageUnit: { contains: search } },
      ];
    }

    if (lowStock) {
      where.stockLevel = {
        lt: prisma.medication.fields.stockThreshold,
      };
    }

    // Get medications with pagination and usage counts
    const [medications, totalCount] = await Promise.all([
      prisma.medication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              chambers: true,
            },
          },
        },
      }),
      prisma.medication.count({ where }),
    ]);

    // For each medication, count the number of unique dispensers using it
    const medicationsWithUsage = await Promise.all(
      medications.map(async (med) => {
        // Count unique dispensers by fetching all chambers with this medication
        // and then counting unique dispenser IDs in JavaScript
        const chamberContents = await prisma.chamberContent.findMany({
          where: { medicationId: med.id },
          select: {
            chamber: {
              select: {
                dispenserId: true,
              },
            },
          },
        });

        // Extract dispenser IDs and get unique count using a Set
        const uniqueDispenserIds = new Set(
          chamberContents.map((cc) => cc.chamber.dispenserId)
        );

        return {
          ...med,
          usageCount: med._count.chambers,
          dispenserCount: uniqueDispenserIds.size,
        };
      })
    );

    return NextResponse.json({
      items: medicationsWithUsage.map((med) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _count, ...rest } = med;
        return rest;
      }),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

// POST /api/medications - Create a new medication
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.dosageUnit) {
      return NextResponse.json(
        { error: 'Name and dosage unit are required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (
      typeof data.stockLevel !== 'number' ||
      typeof data.stockThreshold !== 'number' ||
      data.stockLevel < 0 ||
      data.stockThreshold < 0
    ) {
      return NextResponse.json(
        { error: 'Stock level and threshold must be non-negative numbers' },
        { status: 400 }
      );
    }

    // Check if medication with the same name already exists
    const existingMedication = await prisma.medication.findUnique({
      where: { name: data.name },
    });

    if (existingMedication) {
      return NextResponse.json(
        { error: 'A medication with this name already exists' },
        { status: 409 }
      );
    }

    // Create new medication
    const medication = await prisma.medication.create({
      data: {
        name: data.name,
        description: data.description || null,
        dosageUnit: data.dosageUnit,
        stockLevel: data.stockLevel,
        stockThreshold: data.stockThreshold,
      },
    });

    return NextResponse.json(medication, { status: 201 });
  } catch (error) {
    console.error('Error creating medication:', error);
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: 500 }
    );
  }
}
