'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PatientFormData } from '@/types/patient';
import PatientForm from '@/components/patients/PatientForm';

export default function EditPatientPage() {
  const params = useParams();
  const patientId = params.id as string;

  const [patientData, setPatientData] = useState<PatientFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients/${patientId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch patient');
        }

        const patient = await response.json();

        setPatientData({
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          roomNumber: patient.roomNumber || '',
        });
      } catch (err) {
        console.error('Error fetching patient:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch patient'
        );
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const handleSubmit = async (data: PatientFormData) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to update patient');
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

  if (!patientData) {
    return (
      <div className='alert alert-error'>
        <span>Patient not found</span>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Edit Patient</h1>

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <PatientForm
            initialData={patientData}
            onSubmit={handleSubmit}
            isEditing
          />
        </div>
      </div>
    </div>
  );
}
