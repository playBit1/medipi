'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chamber } from '@/types/dispenser';
import ChamberAssignment from './ChamberAssignment';

type ChamberAssignment = {
  chamberId: string;
  chamberNumber: number;
  medicationId: string;
  dosageAmount: number;
};

type ScheduleFormData = {
  time: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  chamberAssignments: ChamberAssignment[];
};

type ScheduleFormProps = {
  dispenserId: string;
  patientId: string;
  chambers: Chamber[];
  initialData?: ScheduleFormData;
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  isEditing?: boolean;
};

export default function ScheduleForm({
  dispenserId,
  chambers,
  initialData,
  onSubmit,
  isEditing = false,
}: ScheduleFormProps) {
  const router = useRouter();

  // Format date strings for date inputs (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Initialize form with default values or initial data
  const [formData, setFormData] = useState<ScheduleFormData>({
    time: initialData?.time || 8, // Default to 8:00 AM
    startDate:
      initialData?.startDate || formatDateForInput(new Date().toISOString()),
    endDate: initialData?.endDate
      ? formatDateForInput(initialData.endDate)
      : '',
    isActive: initialData?.isActive ?? true,
    chamberAssignments: initialData?.chamberAssignments || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create array of hours for time selection
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Handle form input changes
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

  // Handle chamber assignments changes
  const handleAssignmentsChange = useCallback(
    (newAssignments: ChamberAssignment[]) => {
      setFormData((prev) => ({
        ...prev,
        chamberAssignments: newAssignments,
      }));
    },
    []
  );

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Create a data object that explicitly converts types
    const submissionData = {
      time: parseInt(formData.time.toString(), 10), // Ensure time is a number
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      chamberAssignments: formData.chamberAssignments.filter(
        (a) => a.medicationId !== ''
      ),
    };

    // Validation
    if (!submissionData.startDate) {
      setFormError('Start date is required');
      return;
    }

    if (submissionData.chamberAssignments.length === 0) {
      setFormError('At least one medication must be assigned to a chamber');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(submissionData);
      router.push(`/dispensers/${dispenserId}`);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormError(
        error instanceof Error
          ? error.message
          : 'An error occurred while saving the schedule'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time for display
  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className='card bg-base-100'>
      <div className='card-body'>
        {formError && (
          <div className='alert alert-error mb-4'>
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
            <span>{formError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className='space-y-6'>
          {/* Schedule Time */}
          <div className='form-control w-full'>
            <label className='label'>
              <span className='label-text'>Schedule Time*</span>
            </label>
            <select
              name='time'
              value={formData.time}
              onChange={handleChange}
              className='select select-bordered w-full'
              required>
              {hours.map((hour) => (
                <option
                  key={hour}
                  value={hour}>
                  {formatTime(hour)}
                </option>
              ))}
            </select>
            <label className='label'>
              <span className='label-text-alt'>
                The time when medication will be dispensed
              </span>
            </label>
          </div>

          {/* Date Range */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='form-control w-full'>
              <label className='label'>
                <span className='label-text'>Start Date*</span>
              </label>
              <input
                type='date'
                name='startDate'
                value={formData.startDate}
                onChange={handleChange}
                className='input input-bordered w-full'
                required
              />
            </div>

            <div className='form-control w-full'>
              <label className='label'>
                <span className='label-text'>End Date</span>
                <span className='label-text-alt text-opacity-70'>Optional</span>
              </label>
              <input
                type='date'
                name='endDate'
                value={formData.endDate}
                onChange={handleChange}
                className='input input-bordered w-full'
              />
              <label className='label'>
                <span className='label-text-alt'>
                  Leave empty for indefinite schedule
                </span>
              </label>
            </div>
          </div>

          {/* Active Status */}
          <div className='form-control'>
            <label className='label cursor-pointer justify-start gap-2'>
              <input
                type='checkbox'
                name='isActive'
                checked={formData.isActive}
                onChange={handleChange}
                className='checkbox checkbox-primary'
              />
              <span className='label-text'>Schedule is active</span>
            </label>
            <label className='label'>
              <span className='label-text-alt'>
                {"Inactive schedules won't trigger medication dispensing"}
              </span>
            </label>
          </div>

          {/* Chamber Assignments */}
          <div className='divider'></div>
          <ChamberAssignment
            chambers={chambers}
            initialAssignments={formData.chamberAssignments}
            onChange={handleAssignmentsChange}
          />

          {/* Form Actions */}
          <div className='flex justify-end gap-2 mt-6'>
            <button
              type='button'
              onClick={() => router.push(`/dispensers/${dispenserId}`)}
              className='btn btn-ghost'
              disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={
                isSubmitting || formData.chamberAssignments.length === 0
              }>
              {isSubmitting ? (
                <>
                  <span className='loading loading-spinner loading-xs mr-2'></span>
                  Saving...
                </>
              ) : isEditing ? (
                'Update Schedule'
              ) : (
                'Create Schedule'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
