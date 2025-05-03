'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DispenserStatus, DispenserFormData } from '@/types/dispenser';

type DispenserFormProps = {
  initialData?: DispenserFormData;
  onSubmit: (data: DispenserFormData) => Promise<void>;
  isEditing?: boolean;
};

export default function DispenserForm({
  initialData,
  onSubmit,
  isEditing = false,
}: DispenserFormProps) {
  const router = useRouter();

  // Initialize form with empty values or initial data
  const [formData, setFormData] = useState<DispenserFormData>({
    serialNumber: initialData?.serialNumber || '',
    status: initialData?.status || DispenserStatus.OFFLINE,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Update form when initialData changes (useful for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        serialNumber: initialData.serialNumber,
        status: initialData.status,
      });
    }
  }, [initialData]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simple validation
    if (!formData.serialNumber.trim()) {
      setFormError('Serial number is required');
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
          : 'An error occurred while saving the dispenser'
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
              <span className='label-text'>Serial Number*</span>
            </label>
            <input
              type='text'
              name='serialNumber'
              value={formData.serialNumber}
              onChange={handleChange}
              className='input input-bordered w-full'
              placeholder='Enter dispenser serial number'
              required
              disabled={isEditing} // Serial number shouldn't be editable once created
            />
          </div>

          <div className='form-control w-full mb-6'>
            <label className='label'>
              <span className='label-text'>Status*</span>
            </label>
            <select
              name='status'
              value={formData.status}
              onChange={handleChange}
              className='select select-bordered w-full'
              required>
              <option value={DispenserStatus.ONLINE}>Online</option>
              <option value={DispenserStatus.OFFLINE}>Offline</option>
              <option value={DispenserStatus.MAINTENANCE}>Maintenance</option>
              <option value={DispenserStatus.ERROR}>Error</option>
              <option value={DispenserStatus.OFFLINE_AUTONOMOUS}>
                Offline Autonomous
              </option>
            </select>
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
                'Update Dispenser'
              ) : (
                'Create Dispenser'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
