'use client';

import { useState } from 'react';
import DispenserForm from '@/components/dispensers/DispenserForm';
import { DispenserFormData } from '@/types/dispenser';

export default function NewDispenserPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: DispenserFormData) => {
    try {
      const response = await fetch('/api/dispensers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dispenser');
      }
    } catch (err) {
      console.error('Error creating dispenser:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create dispenser'
      );
      throw err;
    }
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Add New Dispenser</h1>

      {error && (
        <div className='alert alert-error'>
          <span>{error}</span>
        </div>
      )}

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <DispenserForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
