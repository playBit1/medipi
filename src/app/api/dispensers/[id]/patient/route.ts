import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// PUT /api/dispensers/[id]/patient - Assign patient to dispenser
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Check if dispenser exists
    const dispenser = await prisma.dispenser.findUnique({
      where: { id: params.id },
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

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: {
        dispenser: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if patient is already assigned to a different dispenser
    if (patient.dispenser && patient.dispenser.id !== params.id) {
      return NextResponse.json(
        {
          error: 'Patient is already assigned to a different dispenser',
        },
        { status: 400 }
      );
    }

    // Check if dispenser already has a different patient
    if (dispenser.patient && dispenser.patient.id !== data.patientId) {
      return NextResponse.json(
        {
          error: 'Dispenser already has a different patient assigned',
        },
        { status: 400 }
      );
    }

    // Assign patient to dispenser
    const updatedDispenser = await prisma.dispenser.update({
      where: { id: params.id },
      data: {
        patientId: data.patientId,
      },
      include: {
        patient: true,
      },
    });

    // Create RFID tag for patient if it doesn't exist
    const existingPatientRfid = await prisma.dispenserRfid.findFirst({
      where: {
        dispenserId: params.id,
        type: 'PATIENT',
      },
    });

    if (!existingPatientRfid) {
      await prisma.dispenserRfid.create({
        data: {
          dispenserId: params.id,
          rfidTag: `PATIENT-${dispenser.serialNumber}`,
          type: 'PATIENT',
        },
      });
    }

    return NextResponse.json(updatedDispenser);
  } catch (error) {
    console.error('Error assigning patient to dispenser:', error);
    return NextResponse.json(
      { error: 'Failed to assign patient to dispenser' },
      { status: 500 }
    );
  }
}

// DELETE /api/dispensers/[id]/patient - Unassign patient from dispenser
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if dispenser exists
    const dispenser = await prisma.dispenser.findUnique({
      where: { id: params.id },
      include: {
        patient: true,
        schedules: true,
      },
    });

    if (!dispenser) {
      return NextResponse.json(
        { error: 'Dispenser not found' },
        { status: 404 }
      );
    }

    // Check if dispenser has a patient assigned
    if (!dispenser.patient) {
      return NextResponse.json(
        { error: 'Dispenser does not have a patient assigned' },
        { status: 400 }
      );
    }

    // Check if dispenser has active schedules
    if (dispenser.schedules.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot unassign patient from dispenser with active schedules. Delete schedules first.',
        },
        { status: 400 }
      );
    }

    // Unassign patient from dispenser
    const updatedDispenser = await prisma.dispenser.update({
      where: { id: params.id },
      data: {
        patientId: null,
      },
    });

    // Remove patient RFID tag
    await prisma.dispenserRfid.deleteMany({
      where: {
        dispenserId: params.id,
        type: 'PATIENT',
      },
    });

    return NextResponse.json(updatedDispenser);
  } catch (error) {
    console.error('Error unassigning patient from dispenser:', error);
    return NextResponse.json(
      { error: 'Failed to unassign patient from dispenser' },
      { status: 500 }
    );
  }
}
