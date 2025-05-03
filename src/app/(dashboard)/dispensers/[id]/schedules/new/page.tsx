'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ScheduleForm from '@/components/dispensers/ScheduleForm';
import { Chamber } from '@/types/dispenser';

type DispenserWithDetails = {
  id: string;
  serialNumber: string;
  patient: {
    id: string;
    name: string;
  } | null;
  chambers: Chamber[];
};

type ScheduleFormData = {
  time: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  chamberAssignments: Array<{
    chamberId: string;
    chamberNumber: number;
    medicationId: string;
    dosageAmount: number;
  }>;
};

export default function NewSchedulePage() {
  const params = useParams();
  const dispenserId = params.id as string;

  const [dispenser, setDispenser] = useState<DispenserWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDispenser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/dispensers/${dispenserId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch dispenser');
        }

        const data = await response.json();
        setDispenser(data);

        // Redirect if dispenser has no patient
        if (!data.patient) {
          setError(
            'Dispenser must have a patient assigned to create a schedule'
          );
        }
      } catch (err) {
        console.error('Error fetching dispenser:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch dispenser'
        );
      } finally {
        setLoading(false);
      }
    };

    if (dispenserId) {
      fetchDispenser();
    }
  }, [dispenserId]);

  const handleSubmit = async (data: ScheduleFormData) => {
    try {
      const response = await fetch(`/api/dispensers/${dispenserId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create schedule'
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

  if (!dispenser || !dispenser.patient) {
    return (
      <div className='alert alert-warning'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='stroke-current shrink-0 h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
          />
        </svg>
        <div>
          <h3 className='font-bold'>Cannot Create Schedule</h3>
          <div className='text-xs'>
            This dispenser must have a patient assigned first
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Create New Schedule</h1>
      </div>

      <div className='card bg-base-200 p-4 shadow-sm'>
        <div className='flex flex-col md:flex-row md:justify-between md:items-center gap-2'>
          <div>
            <p>
              <span className='font-semibold'>Dispenser:</span>{' '}
              {dispenser.serialNumber}
            </p>
            <p>
              <span className='font-semibold'>Patient:</span>{' '}
              {dispenser.patient.name}
            </p>
          </div>
          <div className='badge badge-lg'>
            {dispenser.chambers.length} Chambers Available
          </div>
        </div>
      </div>

      <ScheduleForm
        dispenserId={dispenserId}
        patientId={dispenser.patient.id}
        chambers={dispenser.chambers}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
