import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/patients/[id] - Get a specific patient by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: (await params).id },
      include: {
        dispenser: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
        schedules: {
          select: {
            id: true,
            time: true,
            isActive: true,
            startDate: true,
            endDate: true,
            dispenser: {
              select: {
                serialNumber: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

// PUT /api/patients/[id] - Update a patient
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

    // Validate required fields
    if (!data.name || !data.dateOfBirth) {
      return NextResponse.json(
        { error: 'Name and date of birth are required' },
        { status: 400 }
      );
    }

    // Convert dateOfBirth string to Date object
    const dateOfBirth = new Date(data.dateOfBirth);

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: (await params).id },
    });

    if (!existingPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Update patient
    const updatedPatient = await prisma.patient.update({
      where: { id: (await params).id },
      data: {
        name: data.name,
        dateOfBirth,
        roomNumber: data.roomNumber || null,
      },
    });

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

// DELETE /api/patients/[id] - Delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: (await params).id },
      include: {
        dispenser: true,
        schedules: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if patient has an assigned dispenser
    if (patient.dispenser) {
      return NextResponse.json(
        {
          error:
            'Cannot delete patient with assigned dispenser. Unassign dispenser first.',
        },
        { status: 400 }
      );
    }

    // Check if patient has schedules
    if (patient.schedules.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete patient with active schedules. Delete schedules first.',
        },
        { status: 400 }
      );
    }

    // Delete patient
    await prisma.patient.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
