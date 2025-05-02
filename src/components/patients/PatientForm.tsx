'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PatientFormData } from '@/types/patient';

type PatientFormProps = {
  initialData?: PatientFormData;
  onSubmit: (data: PatientFormData) => Promise<void>;
  isEditing?: boolean;
};

export default function PatientForm({
  initialData,
  onSubmit,
  isEditing = false,
}: PatientFormProps) {
  const router = useRouter();

  // Initialize form with empty values or initial data
  const [formData, setFormData] = useState<PatientFormData>({
    name: initialData?.name || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    roomNumber: initialData?.roomNumber || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Update form when initialData changes (useful for edit mode)
  useEffect(() => {
    if (initialData) {
      // Format date for date input (YYYY-MM-DD)
      let formattedDate = '';
      if (initialData.dateOfBirth) {
        const date = new Date(initialData.dateOfBirth);
        formattedDate = date.toISOString().split('T')[0];
      }

      setFormData({
        name: initialData.name,
        dateOfBirth: formattedDate,
        roomNumber: initialData.roomNumber || '',
      });
    }
  }, [initialData]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simple validation
    if (!formData.name.trim()) {
      setFormError('Patient name is required');
      return;
    }

    if (!formData.dateOfBirth) {
      setFormError('Date of birth is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      router.back(); // Return to the previous page on success
    } catch (error) {
      console.error('Form submission error:', error);
      setFormError(
        error instanceof Error
          ? error.message
          : 'An error occurred while saving the patient'
      );
    } finally {
      setIsSubmitting(false);
    }
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

        <form onSubmit={handleSubmit}>
          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Patient Name*</span>
            </label>
            <input
              type='text'
              name='name'
              value={formData.name}
              onChange={handleChange}
              className='input input-bordered w-full'
              placeholder='Enter patient name'
              required
            />
          </div>

          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Date of Birth*</span>
            </label>
            <input
              type='date'
              name='dateOfBirth'
              value={formData.dateOfBirth}
              onChange={handleChange}
              className='input input-bordered w-full'
              required
            />
          </div>

          <div className='form-control w-full mb-6'>
            <label className='label'>
              <span className='label-text'>Room Number</span>
              <span className='label-text-alt text-opacity-70'>Optional</span>
            </label>
            <input
              type='text'
              name='roomNumber'
              value={formData.roomNumber}
              onChange={handleChange}
              className='input input-bordered w-full'
              placeholder='Enter room number'
            />
          </div>

          <div className='flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => router.back()}
              className='btn btn-ghost'
              disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className='loading loading-spinner loading-xs mr-2'></span>
                  Saving...
                </>
              ) : isEditing ? (
                'Update Patient'
              ) : (
                'Create Patient'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
