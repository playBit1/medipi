import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/dispensers/[id] - Get a specific dispenser by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dispenser = await prisma.dispenser.findUnique({
      where: { id: (await params).id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            roomNumber: true,
          },
        },
        chambers: {
          select: {
            id: true,
            chamberNumber: true,
          },
        },
        schedules: {
          select: {
            id: true,
            time: true,
            isActive: true,
            startDate: true,
            endDate: true,
          },
        },
        rfids: {
          select: {
            id: true,
            rfidTag: true,
            type: true,
          },
        },
        dispenserLogs: {
          take: 5,
          orderBy: {
            timestamp: 'desc',
          },
          include: {
            schedule: true,
          },
        },
      },
    });

    if (!dispenser) {
      return NextResponse.json(
        { error: 'Dispenser not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(dispenser);
  } catch (error) {
    console.error('Error fetching dispenser:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispenser' },
      { status: 500 }
    );
  }
}

// PUT /api/dispensers/[id] - Update a dispenser
export async function PUT(
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
    const existingDispenser = await prisma.dispenser.findUnique({
      where: { id: (await params).id },
    });

    if (!existingDispenser) {
      return NextResponse.json(
        { error: 'Dispenser not found' },
        { status: 404 }
      );
    }

    // Update dispenser
    const updatedDispenser = await prisma.dispenser.update({
      where: { id: (await params).id },
      data: {
        status: data.status,
        lastSeen:
          data.status === 'ONLINE' ? new Date() : existingDispenser.lastSeen,
      },
    });

    return NextResponse.json(updatedDispenser);
  } catch (error) {
    console.error('Error updating dispenser:', error);
    return NextResponse.json(
      { error: 'Failed to update dispenser' },
      { status: 500 }
    );
  }
}

// DELETE /api/dispensers/[id] - Delete a dispenser
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if dispenser exists with related data
    const dispenser = await prisma.dispenser.findUnique({
      where: { id: (await params).id },
      include: {
        patient: true,
        schedules: true,
        chambers: {
          include: {
            chamberContent: true,
          },
        },
        dispenserLogs: true,
        rfids: true,
      },
    });

    if (!dispenser) {
      return NextResponse.json(
        { error: 'Dispenser not found' },
        { status: 404 }
      );
    }

    // Check if dispenser has an assigned patient
    if (dispenser.patient) {
      return NextResponse.json(
        {
          error:
            'Cannot delete dispenser with assigned patient. Unassign patient first.',
        },
        { status: 400 }
      );
    }

    // Check if dispenser has schedules
    if (dispenser.schedules.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete dispenser with active schedules. Delete schedules first.',
        },
        { status: 400 }
      );
    }

    // Check if dispenser has chamber content
    const hasChamberContent = dispenser.chambers.some(
      (chamber) => chamber.chamberContent.length > 0
    );

    if (hasChamberContent) {
      return NextResponse.json(
        {
          error:
            'Cannot delete dispenser with chamber content. Remove content first.',
        },
        { status: 400 }
      );
    }

    // Delete related data and then dispenser
    // Using a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Delete RFID tags
      if (dispenser.rfids.length > 0) {
        await tx.dispenserRfid.deleteMany({
          where: { dispenserId: (await params).id },
        });
      }

      // Delete logs
      if (dispenser.dispenserLogs.length > 0) {
        await tx.dispenserLog.deleteMany({
          where: { dispenserId: (await params).id },
        });
      }

      // Delete chambers
      if (dispenser.chambers.length > 0) {
        await tx.chamber.deleteMany({
          where: { dispenserId: (await params).id },
        });
      }

      // Finally delete the dispenser itself
      await tx.dispenser.delete({
        where: { id: (await params).id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dispenser:', error);
    return NextResponse.json(
      { error: 'Failed to delete dispenser' },
      { status: 500 }
    );
  }
}
