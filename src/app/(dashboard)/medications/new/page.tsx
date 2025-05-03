'use client';

import { useState } from 'react';
import { MedicationFormData } from '@/types/medication';
import MedicationForm from '@/components/medications/MedicationForm';

export default function NewMedicationPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: MedicationFormData) => {
    try {
      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create medication');
      }
    } catch (err) {
      console.error('Error creating medication:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create medication'
      );
      throw err;
    }
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Add New Medication</h1>

      {error && (
        <div className='alert alert-error'>
          <span>{error}</span>
        </div>
      )}

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <MedicationForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
