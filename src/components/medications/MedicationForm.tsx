'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MedicationFormData } from '@/types/medication';

type MedicationFormProps = {
  initialData?: MedicationFormData;
  onSubmit: (data: MedicationFormData) => Promise<void>;
  isEditing?: boolean;
};

export default function MedicationForm({
  initialData,
  onSubmit,
  isEditing = false,
}: MedicationFormProps) {
  const router = useRouter();

  // Initialize form with empty values or initial data
  const [formData, setFormData] = useState<MedicationFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    dosageUnit: initialData?.dosageUnit || '',
    stockLevel: initialData?.stockLevel || 0,
    stockThreshold: initialData?.stockThreshold || 10,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Update form when initialData changes (useful for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        dosageUnit: initialData.dosageUnit,
        stockLevel: initialData.stockLevel,
        stockThreshold: initialData.stockThreshold,
      });
    }
  }, [initialData]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Handle numeric inputs
    if (name === 'stockLevel' || name === 'stockThreshold') {
      const numValue = parseInt(value);
      setFormData((prev) => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simple validation
    if (!formData.name.trim()) {
      setFormError('Medication name is required');
      return;
    }

    if (!formData.dosageUnit.trim()) {
      setFormError('Dosage unit is required');
      return;
    }

    if (formData.stockLevel < 0) {
      setFormError('Stock level cannot be negative');
      return;
    }

    if (formData.stockThreshold < 0) {
      setFormError('Stock threshold cannot be negative');
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
          : 'An error occurred while saving the medication'
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
              <span className='label-text'>Medication Name*</span>
            </label>
            <input
              type='text'
              name='name'
              value={formData.name}
              onChange={handleChange}
              className='input input-bordered w-full'
              placeholder='Enter medication name'
              required
            />
          </div>

          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Description</span>
              <span className='label-text-alt text-opacity-70'>Optional</span>
            </label>
            <textarea
              name='description'
              value={formData.description}
              onChange={handleChange}
              className='textarea textarea-bordered w-full'
              placeholder='Enter medication description'
              rows={3}
            />
          </div>

          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Dosage Unit*</span>
            </label>
            <input
              type='text'
              name='dosageUnit'
              value={formData.dosageUnit}
              onChange={handleChange}
              className='input input-bordered w-full'
              placeholder='e.g., pill, ml, mg'
              required
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
            <div className='form-control w-full'>
              <label className='label'>
                <span className='label-text'>Current Stock Level*</span>
              </label>
              <input
                type='number'
                name='stockLevel'
                value={formData.stockLevel}
                onChange={handleChange}
                className='input input-bordered w-full'
                min='0'
                required
              />
            </div>

            <div className='form-control w-full'>
              <label className='label'>
                <span className='label-text'>Stock Alert Threshold*</span>
              </label>
              <input
                type='number'
                name='stockThreshold'
                value={formData.stockThreshold}
                onChange={handleChange}
                className='input input-bordered w-full'
                min='0'
                required
              />
              <label className='label'>
                <span className='label-text-alt'>
                  Alert will trigger when stock falls below this value
                </span>
              </label>
            </div>
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
                'Update Medication'
              ) : (
                'Create Medication'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
