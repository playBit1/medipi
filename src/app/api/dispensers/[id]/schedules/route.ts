import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/dispensers/[id]/schedules - Get all schedules for a dispenser
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if dispenser exists
    const dispenser = await prisma.dispenser.findUnique({
      where: { id: (await params).id },
    });

    if (!dispenser) {
      return NextResponse.json(
        { error: 'Dispenser not found' },
        { status: 404 }
      );
    }

    // Get schedules
    const schedules = await prisma.schedule.findMany({
      where: { dispenserId: (await params).id },
      include: {
        chambers: {
          include: {
            chamber: true,
            medication: true,
          },
        },
      },
      orderBy: { time: 'asc' },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/dispensers/[id]/schedules - Create a new schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check if dispenser exists
    const dispenser = await prisma.dispenser.findUnique({
      where: { id: (await params).id },
      include: {
        patient: true,
      },
    });

    if (!dispenser) {
      return NextResponse.json(
        { error: 'Dispenser not found' },
        { status: 404 }
      );
    }

    if (!dispenser.patient) {
      return NextResponse.json(
        { error: 'Dispenser has no patient assigned' },
        { status: 400 }
      );
    }

    // Validate data
    if (typeof data.time !== 'number' || data.time < 0 || data.time > 23) {
      return NextResponse.json(
        { error: 'Time must be an integer between 0 and 23' },
        { status: 400 }
      );
    }

    if (!data.startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    if (!data.chamberAssignments || data.chamberAssignments.length === 0) {
      return NextResponse.json(
        { error: 'At least one chamber assignment is required' },
        { status: 400 }
      );
    }

    // Check for existing schedules at the same time
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        dispenserId: (await params).id,
        time: data.time,
      },
    });

    if (existingSchedule) {
      return NextResponse.json(
        {
          error:
            'A schedule already exists for this dispenser at the specified time',
        },
        { status: 409 }
      );
    }

    // Create schedule
    const schedule = await prisma.schedule.create({
      data: {
        dispenserId: (await params).id,
        patientId: dispenser.patient.id,
        time: data.time,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
    });

    // Create chamber content entries
    for (const assignment of data.chamberAssignments) {
      if (assignment.medicationId) {
        await prisma.chamberContent.create({
          data: {
            chamberId: assignment.chamberId,
            medicationId: assignment.medicationId,
            scheduleId: schedule.id,
            dosageAmount: assignment.dosageAmount || 1,
            currentAmount: 30, // Default initial amount
          },
        });
      }
    }

    // Fetch the created schedule with related data
    const createdSchedule = await prisma.schedule.findUnique({
      where: { id: schedule.id },
      include: {
        chambers: {
          include: {
            chamber: true,
            medication: true,
          },
        },
      },
    });

    return NextResponse.json(createdSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
