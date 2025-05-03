import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST /api/medications/[id]/stock - Adjust medication stock level
export async function POST(
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
    if (typeof data.amount !== 'number' || !data.reason) {
      return NextResponse.json(
        { error: 'Amount and reason are required' },
        { status: 400 }
      );
    }

    // Check if medication exists
    const medication = await prisma.medication.findUnique({
      where: { id: params.id },
    });

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Calculate new stock level
    const newStockLevel = medication.stockLevel + data.amount;

    // Prevent negative stock levels
    if (newStockLevel < 0) {
      return NextResponse.json(
        { error: 'Stock level cannot be negative' },
        { status: 400 }
      );
    }

    // Update medication stock level
    const updatedMedication = await prisma.medication.update({
      where: { id: params.id },
      data: {
        stockLevel: newStockLevel,
      },
    });

    // In a production system, we would also log this stock adjustment
    // This could be implemented with a StockAdjustment model

    return NextResponse.json({
      success: true,
      medication: updatedMedication,
      adjustment: {
        previousStock: medication.stockLevel,
        adjustment: data.amount,
        newStock: newStockLevel,
        reason: data.reason,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error adjusting medication stock:', error);
    return NextResponse.json(
      { error: 'Failed to adjust medication stock' },
      { status: 500 }
    );
  }
}
