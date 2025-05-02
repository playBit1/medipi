'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PatientWithDetails } from '@/types/patient';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients/${patientId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch patient');
        }

        const data = await response.json();
        setPatient(data);
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

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete patient');
      }

      router.push('/patients');
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      setDeleteConfirmation(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (hour: number) => {
    return `${hour}:00`;
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

  if (!patient) {
    return (
      <div className='alert alert-error'>
        <span>Patient not found</span>
      </div>
    );
  }

  const getDispenserStatusClass = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'badge-success';
      case 'OFFLINE':
        return 'badge-warning';
      case 'MAINTENANCE':
        return 'badge-info';
      case 'ERROR':
        return 'badge-error';
      case 'OFFLINE_AUTONOMOUS':
        return 'badge-primary';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>{patient.name}</h1>
        <div className='flex space-x-2'>
          <Link
            href={`/patients/${patientId}/edit`}
            className='btn btn-outline'>
            Edit
          </Link>
          <button
            onClick={() => setDeleteConfirmation(true)}
            className='btn btn-error btn-outline'
            disabled={!!patient.dispenser}>
            Delete
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Patient Info Card */}
        <div className='card bg-base-200 shadow-xl'>
          <div className='card-body'>
            <h2 className='card-title'>Patient Information</h2>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='font-semibold'>Date of Birth:</span>
                <span>{formatDate(patient.dateOfBirth)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-semibold'>Room Number:</span>
                <span>{patient.roomNumber || 'Not assigned'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-semibold'>Created:</span>
                <span>{formatDate(patient.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dispenser Card */}
        <div className='card bg-base-200 shadow-xl'>
          <div className='card-body'>
            <h2 className='card-title'>Assigned Dispenser</h2>
            {patient.dispenser ? (
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='font-semibold'>Serial Number:</span>
                  <Link
                    href={`/dispensers/${patient.dispenser.id}`}
                    className='link link-primary'>
                    {patient.dispenser.serialNumber}
                  </Link>
                </div>
                <div className='flex justify-between'>
                  <span className='font-semibold'>Status:</span>
                  <span
                    className={`badge ${getDispenserStatusClass(
                      patient.dispenser.status
                    )}`}>
                    {patient.dispenser.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className='text-center py-4'>No dispenser assigned</p>
            )}
            <div className='card-actions justify-end mt-2'>
              {patient.dispenser ? (
                <button className='btn btn-sm btn-warning btn-outline'>
                  Unassign
                </button>
              ) : (
                <Link
                  href={`/dispensers?patientId=${patientId}`}
                  className='btn btn-sm btn-primary'>
                  Assign Dispenser
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medication Schedules */}
      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <div className='flex justify-between items-center'>
            <h2 className='card-title'>Medication Schedules</h2>
            {patient.dispenser && (
              <Link
                href={`/dispensers/${patient.dispenser.id}/schedules/new`}
                className='btn btn-sm btn-primary'>
                Add Schedule
              </Link>
            )}
          </div>

          {patient.schedules.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='table table-zebra w-full'>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Dispenser</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>{formatTime(schedule.time)}</td>
                      <td>{schedule.dispenser.serialNumber}</td>
                      <td>
                        <span
                          className={`badge ${
                            schedule.isActive
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(schedule.startDate)}</td>
                      <td>
                        {schedule.endDate
                          ? formatDate(schedule.endDate)
                          : 'No end date'}
                      </td>
                      <td>
                        <Link
                          href={`/dispensers/${patient.dispenser?.id}/schedules/${schedule.id}`}
                          className='btn btn-sm btn-outline'>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='text-center py-4'>No schedules found</p>
          )}

          {!patient.dispenser && (
            <div className='alert alert-info'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                className='stroke-current shrink-0 w-6 h-6'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'></path>
              </svg>
              <span>Assign a dispenser to create medication schedules</span>
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
              Are you sure you want to delete {patient.name}? This action cannot
              be undone.
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
