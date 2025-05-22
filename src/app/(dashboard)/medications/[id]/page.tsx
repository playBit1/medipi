'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MedicationWithDetails } from '@/types/medication';
import StockLevelEditor from '@/components/medications/StockLevelEditor';

export default function MedicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const medicationId = params.id as string;

  const [medication, setMedication] = useState<MedicationWithDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  useEffect(() => {
    const fetchMedication = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/medications/${medicationId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch medication');
        }

        const data = await response.json();
        setMedication(data);
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

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/medications/${medicationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete medication');
      }

      router.push('/medications');
    } catch (err) {
      console.error('Error deleting medication:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete medication'
      );
      setDeleteConfirmation(false);
    }
  };

  const handleStockAdjustment = async (
    id: string,
    amount: number,
    reason: string,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/medications/${id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          reason,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to adjust stock');
      }

      // Refresh medication data
      const updatedMedication = await fetch(`/api/medications/${id}`);
      if (updatedMedication.ok) {
        const data = await updatedMedication.json();
        setMedication(data);
      }

      return true;
    } catch (err) {
      console.error('Error adjusting stock:', err);
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
      return false;
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

  if (!medication) {
    return (
      <div className='alert alert-error'>
        <span>Medication not found</span>
      </div>
    );
  }

  const isInUse = medication.chambers.length > 0;

  const formatTime = (hour: number) => {
    return `${hour}:00`;
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>{medication.name}</h1>
        <div className='flex space-x-2'>
          <Link
            href={`/medications/${medicationId}/edit`}
            className='btn btn-outline'>
            Edit
          </Link>
          <button
            onClick={() => setDeleteConfirmation(true)}
            className='btn btn-error btn-outline'
            disabled={isInUse}>
            Delete
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Medication Info Card */}
        <div className='card bg-base-200 shadow-xl'>
          <div className='card-body'>
            <h2 className='card-title'>Medication Information</h2>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <span className='font-semibold'>Dosage Unit:</span>
                  <p>{medication.dosageUnit}</p>
                </div>
                <div>
                  <span className='font-semibold'>Last Updated:</span>
                  <p>{new Date(medication.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {medication.description && (
                <div>
                  <span className='font-semibold'>Description:</span>
                  <p className='mt-1'>{medication.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stock Information Card */}
        <div className='card bg-base-200 shadow-xl'>
          <div className='card-body'>
            <h2 className='card-title'>Stock Information</h2>
            <div className='flex justify-between items-center'>
              <div>
                <span className='font-semibold'>Current Stock:</span>
                <p
                  className={`text-2xl font-bold ${
                    medication.stockLevel <= medication.stockThreshold
                      ? 'text-error'
                      : ''
                  }`}>
                  {medication.stockLevel} {medication.dosageUnit}
                  {medication.stockLevel !== 1 &&
                  medication.dosageUnit !== 'mg' &&
                  medication.dosageUnit !== 'ml'
                    ? 's'
                    : ''}
                </p>
              </div>
              <div>
                <span className='font-semibold'>Alert Threshold:</span>
                <p className='text-xl'>{medication.stockThreshold}</p>
              </div>
            </div>

            {medication.stockLevel <= medication.stockThreshold && (
              <div className='alert alert-warning mt-4'>
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
                <span>Stock level is below the alert threshold!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Level Editor */}
      <StockLevelEditor
        medicationId={medication.id}
        medicationName={medication.name}
        currentStock={medication.stockLevel}
        onAdjust={handleStockAdjustment}
      />

      {/* Usage Information */}
      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <h2 className='card-title'>Usage Information</h2>

          {medication.chambers.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='table table-zebra w-full'>
                <thead>
                  <tr>
                    <th>Dispenser</th>
                    <th>Chamber</th>
                    <th>Patient</th>
                    <th>Schedule</th>
                    <th>Dosage</th>
                    <th>Amount Left</th>
                  </tr>
                </thead>
                <tbody>
                  {medication.chambers.map((chamberContent) => (
                    <tr key={chamberContent.id}>
                      <td>
                        <Link
                          href={`/dispensers/${chamberContent.dispenser.id}`}
                          className='link link-primary'>
                          {chamberContent.dispenser.serialNumber}
                        </Link>
                      </td>
                      <td>{chamberContent.chamberNumber}</td>
                      <td>
                        {chamberContent.dispenser.patient ? (
                          <Link
                            href={`/patients/${chamberContent.dispenser.patient.id}`}
                            className='link link-primary'>
                            {chamberContent.dispenser.patient.name}
                          </Link>
                        ) : (
                          <span className='text-gray-500'>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <div className='flex flex-col'>
                          <Link
                            href={`/dispensers/${chamberContent.dispenser.id}/schedules/${chamberContent.schedule.id}`}
                            className='link link-primary'>
                            {formatTime(chamberContent.schedule.time)}
                          </Link>
                          <span
                            className={`badge ${
                              chamberContent.schedule.isActive
                                ? 'badge-success'
                                : 'badge-warning'
                            } badge-sm`}>
                            {chamberContent.schedule.isActive
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {chamberContent.dosageAmount} {medication.dosageUnit}
                        {chamberContent.dosageAmount !== 1 &&
                        medication.dosageUnit !== 'mg' &&
                        medication.dosageUnit !== 'ml'
                          ? 's'
                          : ''}
                      </td>
                      <td>
                        <div className='flex items-center gap-2'>
                          <span
                            className={
                              chamberContent.currentAmount <
                              chamberContent.dosageAmount * 3
                                ? 'text-error font-bold'
                                : ''
                            }>
                            {chamberContent.currentAmount}
                          </span>
                          {chamberContent.currentAmount <
                            chamberContent.dosageAmount * 3 && (
                            <span className='badge badge-error badge-sm'>
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='alert'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                className='stroke-info shrink-0 w-6 h-6'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'></path>
              </svg>
              <span>
                This medication is not currently used in any dispenser.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmation && (
        <div className='modal modal-open'>
          <div className='modal-box'>
            <h3 className='font-bold text-lg'>Confirm Deletion</h3>
            <p className='py-4'>
              Are you sure you want to delete {medication.name}? This action
              cannot be undone.
            </p>
            <div className='modal-action'>
              <button
                onClick={() => setDeleteConfirmation(false)}
                className='btn'>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className='btn btn-error'>
                Delete
              </button>
            </div>
          </div>
          <div
            className='modal-backdrop'
            onClick={() => setDeleteConfirmation(false)}></div>
        </div>
      )}
    </div>
  );
}
