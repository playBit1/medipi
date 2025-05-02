'use client';

import { useState } from 'react';
import { PatientFormData } from '@/types/patient';
import PatientForm from '@/components/patients/PatientForm';

export default function NewPatientPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: PatientFormData) => {
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      throw err;
    }
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Add New Patient</h1>

      {error && (
        <div className='alert alert-error'>
          <span>{error}</span>
        </div>
      )}

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <PatientForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
