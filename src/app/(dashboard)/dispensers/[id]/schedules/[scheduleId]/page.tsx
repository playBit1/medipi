'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Schedule, Chamber } from '@/types/dispenser';
import ChamberAssignment from '@/components/dispensers/ChamberAssignment';

// Define the ChamberAssignment type
type ChamberAssignment = {
  chamberId: string;
  chamberNumber: number;
  medicationId: string;
  dosageAmount: number;
};

type ScheduleDetails = Schedule & {
  dispenser: {
    serialNumber: string;
    chambers: Chamber[];
  };
  patient: {
    id: string;
    name: string;
  };
  chambers: {
    id: string;
    chamberId: string;
    medicationId: string;
    dosageAmount: number;
    currentAmount: number;
    chamber: {
      id: string;
      chamberNumber: number;
    };
    medication: {
      id: string;
      name: string;
      dosageUnit: string;
      stockLevel: number;
      stockThreshold: number;
    };
  }[];
  // Add createdAt property
  createdAt: string | Date;
  updatedAt: string | Date;
};

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispenserId = params.id as string;
  const scheduleId = params.scheduleId as string;

  // State
  const [schedule, setSchedule] = useState<ScheduleDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    time: 8,
    startDate: '',
    endDate: '',
    isActive: true,
    chamberAssignments: [] as ChamberAssignment[],
  });
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'delete' | null;
  }>({ isOpen: false, type: null });

  // Hours for selection
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Fetch schedule data
  const fetchSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/dispensers/${dispenserId}/schedules/${scheduleId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch schedule details');
      }

      const data = await response.json();
      setSchedule(data);

      // Initialize form data
      setFormData({
        time: data.time,
        startDate: new Date(data.startDate).toISOString().split('T')[0],
        endDate: data.endDate
          ? new Date(data.endDate).toISOString().split('T')[0]
          : '',
        isActive: data.isActive,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chamberAssignments: data.chambers.map((c: any) => ({
          chamberId: c.chamberId,
          chamberNumber: c.chamber.chamberNumber,
          medicationId: c.medicationId,
          dosageAmount: c.dosageAmount,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
      console.error('Error fetching schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispenserId, scheduleId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Format time for display (e.g. 14 -> "2:00 PM")
  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  // Format date for display - fixed type issues
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'None';
    return new Date(dateString).toLocaleDateString();
  };

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'time') {
      // Explicitly convert time to a number
      setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle chamber assignments change
  const handleAssignmentsChange = useCallback(
    (assignments: ChamberAssignment[]) => {
      setFormData((prev) => ({ ...prev, chamberAssignments: assignments }));
    },
    []
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate assignments
    if (formData.chamberAssignments.length === 0) {
      setError('At least one medication must be assigned');
      return;
    }

    // Create submission data with explicit type conversions
    const submissionData = {
      time: parseInt(formData.time.toString(), 10), // Ensure time is a number
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      chamberAssignments: formData.chamberAssignments,
    };

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/dispensers/${dispenserId}/schedules/${scheduleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update schedule');
      }

      // Refresh data and exit edit mode
      await fetchSchedule();
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update schedule'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle schedule deletion
  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/dispensers/${dispenserId}/schedules/${scheduleId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }

      // Redirect back to dispenser details
      router.push(`/dispensers/${dispenserId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete schedule'
      );
      setModalState({ isOpen: false, type: null });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading && !schedule) {
    return (
      <div className='flex flex-col items-center justify-center h-64 space-y-4'>
        <div className='loading loading-spinner loading-lg'></div>
        <p className='text-sm opacity-70'>Loading schedule details...</p>
      </div>
    );
  }

  // Error state
  if (error && !schedule) {
    return (
      <div className='alert alert-error'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='stroke-current shrink-0 h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <div>
          <h3 className='font-bold'>Error</h3>
          <div className='text-sm'>{error}</div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!schedule) {
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
          <h3 className='font-bold'>Schedule Not Found</h3>
          <div className='text-sm'>
            The requested schedule could not be found.
          </div>
        </div>
        <Link
          href={`/dispensers/${dispenserId}`}
          className='btn btn-sm'>
          Back to Dispenser
        </Link>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>
          {isEditing
            ? 'Edit Schedule'
            : `Schedule at ${formatTime(schedule.time)}`}
        </h1>
        <div className='flex gap-2'>
          {isEditing ? (
            <button
              onClick={() => setIsEditing(false)}
              className='btn btn-ghost'
              disabled={isLoading}>
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className='btn btn-outline'>
                Edit
              </button>
              <button
                onClick={() => setModalState({ isOpen: true, type: 'delete' })}
                className='btn btn-error btn-outline'>
                Delete
              </button>
            </>
          )}
          <Link
            href={`/dispensers/${dispenserId}`}
            className='btn'>
            Back
          </Link>
        </div>
      </div>

      {/* Status Bar */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-base-200 p-4 rounded-box'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold'>Dispenser:</span>
            <Link
              href={`/dispensers/${dispenserId}`}
              className='link link-primary'>
              {schedule.dispenser.serialNumber}
            </Link>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-semibold'>Patient:</span>
            <Link
              href={`/patients/${schedule.patient?.id}`}
              className='link link-primary'>
              {schedule.patient?.name}
            </Link>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-semibold'>Status:</span>
          <span
            className={`badge ${
              schedule.isActive ? 'badge-success' : 'badge-warning'
            }`}>
            {schedule.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className='alert alert-error'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='stroke-current shrink-0 h-6 w-6'
            fill='none'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Content - Edit Mode or View Mode */}
      <div className='card bg-base-100 shadow-sm'>
        <div className='card-body'>
          {isEditing ? (
            /* Edit Form */
            <form
              onSubmit={handleSubmit}
              className='space-y-6'>
              <h2 className='text-xl font-semibold'>Edit Schedule</h2>

              {/* Time Selection */}
              <div className='form-control'>
                <label className='label'>
                  <span className='label-text'>Time</span>
                </label>
                <select
                  name='time'
                  value={formData.time}
                  onChange={handleChange}
                  className='select select-bordered w-full max-w-xs'
                  disabled={isLoading}>
                  {hours.map((hour) => (
                    <option
                      key={hour}
                      value={hour}>
                      {formatTime(hour)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text'>Start Date</span>
                  </label>
                  <input
                    type='date'
                    name='startDate'
                    value={formData.startDate}
                    onChange={handleChange}
                    className='input input-bordered'
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text'>End Date</span>
                    <span className='label-text-alt'>Optional</span>
                  </label>
                  <input
                    type='date'
                    name='endDate'
                    value={formData.endDate}
                    onChange={handleChange}
                    className='input input-bordered'
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className='form-control'>
                <label className='label cursor-pointer justify-start'>
                  <input
                    type='checkbox'
                    name='isActive'
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className='checkbox checkbox-primary mr-2'
                    disabled={isLoading}
                  />
                  <span className='label-text'>Schedule is active</span>
                </label>
              </div>

              {/* Medication Assignments */}
              <div className='divider'></div>

              {/* Use the ChamberAssignment component */}
              <ChamberAssignment
                chambers={schedule.dispenser.chambers}
                initialAssignments={formData.chamberAssignments}
                onChange={handleAssignmentsChange}
              />

              {/* Submit Button */}
              <div className='flex justify-end gap-2 mt-6'>
                <button
                  type='button'
                  onClick={() => setIsEditing(false)}
                  className='btn btn-ghost'
                  disabled={isLoading}>
                  Cancel
                </button>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={
                    isLoading || formData.chamberAssignments.length === 0
                  }>
                  {isLoading ? (
                    <>
                      <span className='loading loading-spinner loading-xs mr-2'></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className='space-y-5'>
              <h2 className='text-xl font-semibold'>Schedule Details</h2>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div className='space-y-4'>
                  <div>
                    <span className='font-semibold'>Time:</span>
                    <p className='text-lg'>{formatTime(schedule.time)}</p>
                  </div>
                  <div>
                    <span className='font-semibold'>Start Date:</span>
                    <p>{formatDate(schedule.startDate)}</p>
                  </div>
                </div>
                <div className='space-y-4'>
                  <div>
                    <span className='font-semibold'>End Date:</span>
                    <p>
                      {schedule.endDate
                        ? formatDate(schedule.endDate)
                        : 'No end date (continuous)'}
                    </p>
                  </div>
                  <div>
                    <span className='font-semibold'>Created on:</span>
                    <p>{formatDate(schedule.createdAt)}</p>
                  </div>
                </div>
                <div className='space-y-2'>
                  <div>
                    <span className='font-semibold'>Updated on:</span>
                    <p>{formatDate(schedule.updatedAt)}</p>
                  </div>
                </div>
              </div>

              <div className='divider'></div>
              <h3 className='font-semibold'>Assigned Medications</h3>

              {schedule.chambers.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='table w-full'>
                    <thead>
                      <tr>
                        <th>Chamber</th>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Remaining</th>
                        <th>Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.chambers
                        .sort(
                          (a, b) =>
                            a.chamber.chamberNumber - b.chamber.chamberNumber
                        )
                        .map((chamber) => (
                          <tr key={chamber.id}>
                            <td>{chamber.chamber.chamberNumber}</td>
                            <td>
                              <Link
                                href={`/medications/${chamber.medicationId}`}
                                className='link link-hover link-primary'>
                                {chamber.medication.name}
                              </Link>
                            </td>
                            <td>
                              {chamber.dosageAmount}{' '}
                              {chamber.medication.dosageUnit}
                              {chamber.dosageAmount !== 1 &&
                              chamber.medication.dosageUnit !== 'mg' &&
                              chamber.medication.dosageUnit !== 'ml'
                                ? 's'
                                : ''}
                            </td>
                            <td>{chamber.currentAmount} / 30</td>
                            <td>
                              {chamber.currentAmount <
                              chamber.dosageAmount * 2 ? (
                                <span className='badge badge-error'>
                                  Critical
                                </span>
                              ) : chamber.currentAmount <
                                chamber.dosageAmount * 5 ? (
                                <span className='badge badge-warning'>Low</span>
                              ) : (
                                <span className='badge badge-success'>OK</span>
                              )}
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
                  <span>No medications assigned to this schedule.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {modalState.isOpen && modalState.type === 'delete' && (
        <div className='modal modal-open'>
          <div className='modal-box'>
            <h3 className='font-bold text-lg'>Confirm Deletion</h3>
            <p className='py-4'>
              Are you sure you want to delete this schedule at{' '}
              {formatTime(schedule.time)}? This action cannot be undone.
            </p>
            <div className='modal-action'>
              <button
                onClick={() => setModalState({ isOpen: false, type: null })}
                className='btn'
                disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className='btn btn-error'
                disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className='loading loading-spinner loading-xs mr-2'></span>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
          <div
            className='modal-backdrop'
            onClick={() => setModalState({ isOpen: false, type: null })}></div>
        </div>
      )}
    </div>
  );
}
