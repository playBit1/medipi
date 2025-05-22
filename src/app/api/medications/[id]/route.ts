import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/medications/[id] - Get a specific medication by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const medication = await prisma.medication.findUnique({
      where: { id: (await params).id },
      include: {
        chambers: {
          include: {
            chamber: {
              include: {
                dispenser: {
                  include: {
                    patient: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            schedule: {
              select: {
                id: true,
                time: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Transform the data to match our expected output shape
    const formattedMedication = {
      ...medication,
      chambers: medication.chambers.map((cc) => ({
        id: cc.id,
        chamberNumber: cc.chamber.chamberNumber,
        dispenser: {
          id: cc.chamber.dispenser.id,
          serialNumber: cc.chamber.dispenser.serialNumber,
          patient: cc.chamber.dispenser.patient,
        },
        schedule: cc.schedule,
        dosageAmount: cc.dosageAmount,
        currentAmount: cc.currentAmount,
      })),
    };

    return NextResponse.json(formattedMedication);
  } catch (error) {
    console.error('Error fetching medication:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medication' },
      { status: 500 }
    );
  }
}

// PUT /api/medications/[id] - Update a medication
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

    // Check if medication exists
    const existingMedication = await prisma.medication.findUnique({
      where: { id: (await params).id },
    });

    if (!existingMedication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Check if name is already taken by another medication
    if (data.name !== existingMedication.name) {
      const duplicateName = await prisma.medication.findUnique({
        where: { name: data.name },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A medication with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update medication
    const updatedMedication = await prisma.medication.update({
      where: { id: (await params).id },
      data: {
        name: data.name,
        description: data.description || null,
        dosageUnit: data.dosageUnit,
        stockLevel: data.stockLevel,
        stockThreshold: data.stockThreshold,
      },
    });

    return NextResponse.json(updatedMedication);
  } catch (error) {
    console.error('Error updating medication:', error);
    return NextResponse.json(
      { error: 'Failed to update medication' },
      { status: 500 }
    );
  }
}

// DELETE /api/medications/[id] - Delete a medication
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if medication exists
    const medication = await prisma.medication.findUnique({
      where: { id: (await params).id },
      include: {
        chambers: true,
      },
    });

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Check if medication is in use
    if (medication.chambers.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete medication that is in use. Remove from all dispensers first.',
        },
        { status: 400 }
      );
    }

    // Delete medication
    await prisma.medication.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting medication:', error);
    return NextResponse.json(
      { error: 'Failed to delete medication' },
      { status: 500 }
    );
  }
}
