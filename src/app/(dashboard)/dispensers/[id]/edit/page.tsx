'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DispenserForm from '@/components/dispensers/DispenserForm';
import { DispenserFormData } from '@/types/dispenser';

export default function EditDispenserPage() {
  const params = useParams();
  const dispenserId = params.id as string;

  const [dispenserData, setDispenserData] = useState<DispenserFormData | null>(
    null
  );
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

        const dispenser = await response.json();

        setDispenserData({
          serialNumber: dispenser.serialNumber,
          status: dispenser.status,
        });
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

  const handleSubmit = async (data: DispenserFormData) => {
    try {
      const response = await fetch(`/api/dispensers/${dispenserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update dispenser');
      }
    } catch (err) {
      console.error('Error updating dispenser:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update dispenser'
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

  if (!dispenserData) {
    return (
      <div className='alert alert-error'>
        <span>Dispenser not found</span>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Edit Dispenser</h1>

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <DispenserForm
            initialData={dispenserData}
            onSubmit={handleSubmit}
            isEditing
          />
        </div>
      </div>
    </div>
  );
}
