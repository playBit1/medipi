'use client';

import { useState } from 'react';
import { StockAdjustmentReason } from '@/types/medication';

type StockLevelEditorProps = {
  medicationId: string;
  medicationName: string;
  currentStock: number;
  onAdjust: (
    id: string,
    amount: number,
    reason: string,
    notes?: string
  ) => Promise<boolean>;
};

export default function StockLevelEditor({
  medicationId,
  medicationName,
  currentStock,
  onAdjust,
}: StockLevelEditorProps) {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<StockAdjustmentReason>(
    StockAdjustmentReason.RESTOCK
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setAmount(isNaN(value) ? 0 : value);
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReason(e.target.value as StockAdjustmentReason);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validate amount
    if (amount === 0) {
      setError('Amount cannot be zero');
      setIsSubmitting(false);
      return;
    }

    // Validate that we don't go below zero
    if (currentStock + amount < 0) {
      setError(
        `Cannot reduce stock below zero. Maximum reduction: ${currentStock}`
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await onAdjust(medicationId, amount, reason, notes);
      if (result) {
        setSuccess(true);
        // Reset form
        setAmount(0);
        setNotes('');
      } else {
        setError('Failed to adjust stock');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='card bg-base-100 shadow-lg'>
      <div className='card-body'>
        <h2 className='card-title'>Adjust Stock Level</h2>
        <p className='text-sm mb-4'>
          Current stock of {medicationName}:{' '}
          <span className='font-bold'>{currentStock}</span>
        </p>

        {error && (
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
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className='alert alert-success mb-4'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='stroke-current shrink-0 h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>Stock level successfully adjusted</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Amount to Adjust</span>
              <span className='label-text-alt'>
                (Use negative values to decrease stock)
              </span>
            </label>
            <div className='flex gap-2'>
              <button
                type='button'
                className='btn btn-outline'
                onClick={() => setAmount(amount - 1)}
                disabled={isSubmitting}>
                -
              </button>
              <input
                type='number'
                value={amount}
                onChange={handleAmountChange}
                className='input input-bordered flex-1'
                placeholder='Enter amount'
                required
                disabled={isSubmitting}
              />
              <button
                type='button'
                className='btn btn-outline'
                onClick={() => setAmount(amount + 1)}
                disabled={isSubmitting}>
                +
              </button>
            </div>
          </div>

          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Reason</span>
            </label>
            <select
              className='select select-bordered w-full'
              value={reason}
              onChange={handleReasonChange}
              disabled={isSubmitting}
              required>
              <option value={StockAdjustmentReason.RESTOCK}>Restock</option>
              <option value={StockAdjustmentReason.MANUAL_ADJUSTMENT}>
                Manual Adjustment
              </option>
              <option value={StockAdjustmentReason.DISPENSED}>Dispensed</option>
              <option value={StockAdjustmentReason.EXPIRED}>Expired</option>
              <option value={StockAdjustmentReason.DAMAGED}>Damaged</option>
              <option value={StockAdjustmentReason.OTHER}>Other</option>
            </select>
          </div>

          <div className='form-control w-full mb-4'>
            <label className='label'>
              <span className='label-text'>Notes</span>
              <span className='label-text-alt text-opacity-70'>Optional</span>
            </label>
            <textarea
              className='textarea textarea-bordered w-full'
              value={notes}
              onChange={handleNotesChange}
              placeholder='Enter notes about this adjustment'
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <div className='card-actions justify-end'>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className='loading loading-spinner loading-xs mr-2'></span>
                  Processing...
                </>
              ) : (
                'Adjust Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
