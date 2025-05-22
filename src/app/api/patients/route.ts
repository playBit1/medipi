import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/patients - Get all patients with optional filtering
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
    const skip = (page - 1) * pageSize;

    const searchTerm = search.toLowerCase();
    const where = search
      ? {
          OR: [
            {
              name: {
                contains: searchTerm,
              },
            },
            {
              roomNumber: {
                contains: searchTerm,
              },
            },
          ],
        }
      : {};

    // Get patients with pagination
    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          dispenser: {
            select: {
              serialNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return NextResponse.json({
      items: patients,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.dateOfBirth) {
      return NextResponse.json(
        { error: 'Name and date of birth are required' },
        { status: 400 }
      );
    }

    // Convert dateOfBirth string to Date object
    const dateOfBirth = new Date(data.dateOfBirth);

    // Create new patient
    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        dateOfBirth,
        roomNumber: data.roomNumber || null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}
