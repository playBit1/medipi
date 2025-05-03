import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/dispensers/[id]/schedules/[scheduleId] - Get a specific schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if schedule exists and belongs to the dispenser
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.scheduleId,
        dispenserId: params.id,
      },
      include: {
        patient: true,
        dispenser: {
          include: {
            chambers: true,
          },
        },
        chambers: {
          include: {
            chamber: true,
            medication: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/dispensers/[id]/schedules/[scheduleId] - Update a schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check if schedule exists and belongs to the dispenser
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: params.scheduleId,
        dispenserId: params.id,
      },
      include: {
        chambers: true,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Validate data
    if (
      data.time !== undefined &&
      (typeof data.time !== 'number' || data.time < 0 || data.time > 23)
    ) {
      return NextResponse.json(
        { error: 'Time must be an integer between 0 and 23' },
        { status: 400 }
      );
    }

    if (data.startDate === '') {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    // Check for time conflicts with other schedules
    if (data.time !== undefined && data.time !== existingSchedule.time) {
      const conflictingSchedule = await prisma.schedule.findFirst({
        where: {
          dispenserId: params.id,
          time: data.time,
          id: { not: params.scheduleId },
        },
      });

      if (conflictingSchedule) {
        return NextResponse.json(
          {
            error:
              'A schedule already exists for this dispenser at the specified time',
          },
          { status: 409 }
        );
      }
    }

    // Update schedule
    await prisma.schedule.update({
      where: { id: params.scheduleId },
      data: {
        time: data.time,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive,
      },
    });

    // Update chamber assignments if provided
    if (data.chamberAssignments && data.chamberAssignments.length > 0) {
      // Delete existing chamber contents
      await prisma.chamberContent.deleteMany({
        where: { scheduleId: params.scheduleId },
      });

      // Create new chamber contents
      for (const assignment of data.chamberAssignments) {
        if (assignment.medicationId) {
          await prisma.chamberContent.create({
            data: {
              chamberId: assignment.chamberId,
              medicationId: assignment.medicationId,
              scheduleId: params.scheduleId,
              dosageAmount: assignment.dosageAmount || 1,
              currentAmount: 30, // Default amount for new assignments
            },
          });
        }
      }
    }

    // Fetch the updated schedule with related data
    const finalSchedule = await prisma.schedule.findUnique({
      where: { id: params.scheduleId },
      include: {
        chambers: {
          include: {
            chamber: true,
            medication: true,
          },
        },
      },
    });

    return NextResponse.json(finalSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/dispensers/[id]/schedules/[scheduleId] - Delete a schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if schedule exists and belongs to the dispenser
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.scheduleId,
        dispenserId: params.id,
      },
      include: {
        chambers: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Delete related chamber contents first
    await prisma.chamberContent.deleteMany({
      where: { scheduleId: params.scheduleId },
    });

    // Delete the schedule
    await prisma.schedule.delete({
      where: { id: params.scheduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
