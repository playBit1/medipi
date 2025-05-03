'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MedicationFormData } from '@/types/medication';
import MedicationForm from '@/components/medications/MedicationForm';

export default function EditMedicationPage() {
  const params = useParams();
  const medicationId = params.id as string;

  const [medicationData, setMedicationData] =
    useState<MedicationFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedication = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/medications/${medicationId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch medication');
        }

        const medication = await response.json();

        setMedicationData({
          name: medication.name,
          description: medication.description || '',
          dosageUnit: medication.dosageUnit,
          stockLevel: medication.stockLevel,
          stockThreshold: medication.stockThreshold,
        });
      } catch (err) {
        console.error('Error fetching medication:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch medication'
        );
      } finally {
        setLoading(false);
      }
    };

    if (medicationId) {
      fetchMedication();
    }
  }, [medicationId]);

  const handleSubmit = async (data: MedicationFormData) => {
    try {
      const response = await fetch(`/api/medications/${medicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update medication');
      }
    } catch (err) {
      console.error('Error updating medication:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update medication'
      );
      throw err;
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <span className='loading loading-spinner loading-lg'></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='alert alert-error'>
        <span>{error}</span>
      </div>
    );
  }

  if (!medicationData) {
    return (
      <div className='alert alert-error'>
        <span>Medication not found</span>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Edit Medication</h1>

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <MedicationForm
            initialData={medicationData}
            onSubmit={handleSubmit}
            isEditing
          />
        </div>
      </div>
    </div>
  );
}
