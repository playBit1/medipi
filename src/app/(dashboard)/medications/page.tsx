'use client';

import { useState } from 'react';
import Link from 'next/link';
import useMedications from '@/hooks/useMedications';
import { MedicationWithUsage } from '@/types/medication';

export default function MedicationsPage() {
  const {
    medications,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch,
    setLowStockFilter,
    deleteMedication,
  } = useMedications();

  const [searchInput, setSearchInput] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    medicationId: string;
    medicationName: string;
  }>({ show: false, medicationId: '', medicationName: '' });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  const handleLowStockFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setShowLowStock(isChecked);
    setLowStockFilter(isChecked);
    setPage(1); // Reset to first page when filtering
  };

  const confirmDelete = (medication: MedicationWithUsage) => {
    setDeleteConfirmation({
      show: true,
      medicationId: medication.id,
      medicationName: medication.name,
    });
  };

  const handleDelete = async () => {
    if (deleteConfirmation.medicationId) {
      const success = await deleteMedication(deleteConfirmation.medicationId);
      if (success) {
        setDeleteConfirmation({
          show: false,
          medicationId: '',
          medicationName: '',
        });
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({
      show: false,
      medicationId: '',
      medicationName: '',
    });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(e.target.value));
    setPage(1); // Reset to first page when changing page size
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Medications</h1>
        <Link
          href='/medications/new'
          className='btn btn-primary'>
          Add Medication
        </Link>
      </div>

      {/* Search and filters */}
      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <div className='flex flex-col md:flex-row gap-4'>
            <form
              onSubmit={handleSearch}
              className='flex gap-2 flex-1'>
              <input
                type='text'
                placeholder='Search medications...'
                className='input input-bordered flex-1'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button
                type='submit'
                className='btn btn-primary'>
                Search
              </button>
            </form>

            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                className='checkbox'
                checked={showLowStock}
                onChange={handleLowStockFilter}
                id='lowStockFilter'
              />
              <label
                htmlFor='lowStockFilter'
                className='cursor-pointer'>
                Show only low stock
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
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
          <div>
            <span className='font-bold'>Error:</span> {error}
            <div className='text-sm mt-1'>
              Try refreshing the page or contact support if the issue persists.
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className='btn btn-sm'>
            Refresh
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className='flex flex-col gap-4'>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className='skeleton h-20 w-full'></div>
          ))}
        </div>
      ) : (
        <>
          {/* Results summary */}
          <div className='flex justify-between items-center text-sm'>
            <div>
              Showing {medications.length} of {totalCount} medications
            </div>
            <div className='flex items-center gap-2'>
              <span>Items per page:</span>
              <select
                className='select select-bordered select-sm'
                value={pageSize}
                onChange={handlePageSizeChange}>
                <option value='5'>5</option>
                <option value='10'>10</option>
                <option value='20'>20</option>
                <option value='50'>50</option>
              </select>
            </div>
          </div>

          {/* Medications table */}
          <div className='overflow-x-auto'>
            <table className='table table-zebra w-full'>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dosage Unit</th>
                  <th>Stock Level</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='text-center py-4'>
                      No medications found
                    </td>
                  </tr>
                ) : (
                  medications.map((medication) => (
                    <tr key={medication.id}>
                      <td>
                        <Link
                          href={`/medications/${medication.id}`}
                          className='font-medium hover:underline'>
                          {medication.name}
                        </Link>
                        {medication.description && (
                          <p className='text-sm text-gray-500 truncate max-w-xs'>
                            {medication.description}
                          </p>
                        )}
                      </td>
                      <td>{medication.dosageUnit}</td>
                      <td>
                        <div className='flex flex-col'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={`font-bold ${
                                medication.stockLevel <=
                                medication.stockThreshold
                                  ? 'text-error'
                                  : ''
                              }`}>
                              {medication.stockLevel}
                            </span>
                            {medication.stockLevel <=
                              medication.stockThreshold && (
                              <div className='badge badge-error badge-sm'>
                                Low
                              </div>
                            )}
                          </div>
                          <div className='text-xs'>
                            Threshold: {medication.stockThreshold}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className='flex flex-col'>
                          <div>
                            {medication.usageCount > 0 ? (
                              <span>
                                Used in <b>{medication.usageCount}</b> chamber
                                {medication.usageCount !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className='text-gray-500'>Not in use</span>
                            )}
                          </div>
                          {medication.dispenserCount > 0 && (
                            <div className='text-xs'>
                              Across {medication.dispenserCount} dispenser
                              {medication.dispenserCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className='flex space-x-2'>
                          <Link
                            href={`/medications/${medication.id}/edit`}
                            className='btn btn-sm btn-outline'>
                            Edit
                          </Link>
                          <button
                            onClick={() => confirmDelete(medication)}
                            className='btn btn-sm btn-error btn-outline'
                            disabled={medication.usageCount > 0}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex justify-center mt-4'>
              <div className='join'>
                <button
                  className='join-item btn'
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}>
                  «
                </button>
                <button
                  className='join-item btn'
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}>
                  ‹
                </button>

                {/* Page numbers */}
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  // Only show pages close to current page
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`join-item btn ${
                          currentPage === page ? 'btn-active' : ''
                        }`}
                        onClick={() => setPage(page)}>
                        {page}
                      </button>
                    );
                  }
                  // Show ellipsis for gaps
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <button
                        key={page}
                        className='join-item btn'
                        disabled>
                        ...
                      </button>
                    );
                  }
                  return null;
                })}

                <button
                  className='join-item btn'
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}>
                  ›
                </button>
                <button
                  className='join-item btn'
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}>
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmation.show && (
        <div className='modal modal-open'>
          <div className='modal-box'>
            <h3 className='font-bold text-lg'>Confirm Deletion</h3>
            <p className='py-4'>
              Are you sure you want to delete{' '}
              {deleteConfirmation.medicationName}? This action cannot be undone.
            </p>
            <div className='modal-action'>
              <button
                onClick={cancelDelete}
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
            onClick={cancelDelete}></div>
        </div>
      )}
    </div>
  );
}
