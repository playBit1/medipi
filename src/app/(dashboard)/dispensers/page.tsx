// src/app/(dashboard)/dispensers/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import useDispensers from '@/hooks/useDispensers';
import DispenserStatusBadge from '@/components/dispensers/DispenserStatusBadge';
import {
  DispenserFilterStatus,
  DispenserStatus,
  DispenserWithPatient,
} from '@/types/dispenser';
import { useNodeRed } from '@/components/providers/NodeRedProvider';

export default function DispensersPage() {
  const {
    dispensers: dbDispensers,
    totalCount,
    currentPage,
    totalPages,
    loading: dbLoading,
    error: dbError,
    setPage,
    setSearch,
    setStatusFilter,
    deleteDispenser,
  } = useDispensers();

  // Get live dispenser data from Node-RED
  const { dispensers: liveDispensers } = useNodeRed();

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilterLocal] =
    useState<DispenserFilterStatus>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    dispenserId: string;
    serialNumber: string;
  }>({ show: false, dispenserId: '', serialNumber: '' });

  // Combine database dispensers with live status info
  const enhancedDispensers = dbDispensers.map((dispenser) => {
    // Find matching live dispenser by serial number
    const liveDispenser = liveDispensers.find(
      (live) =>
        live.serialNumber === dispenser.serialNumber ||
        live.id === dispenser.serialNumber
    );

    // Return enhanced dispenser with live data when available
    return {
      ...dispenser,
      liveStatus: liveDispenser?.status || null,
      lastSeen:
        liveDispenser?.lastSeen ||
        liveDispenser?.lastUpdate ||
        dispenser.lastSeen,
      isOnline: !!liveDispenser && liveDispenser.status === 'ONLINE',
    };
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (status: 'all' | 'assigned' | 'unassigned') => {
    setStatusFilterLocal(status);
    setStatusFilter(status);
    setPage(1); // Reset to first page when filtering
  };

  const confirmDelete = (dispenser: DispenserWithPatient) => {
    setDeleteConfirmation({
      show: true,
      dispenserId: dispenser.id,
      serialNumber: dispenser.serialNumber,
    });
  };

  const handleDelete = async () => {
    if (deleteConfirmation.dispenserId) {
      const success = await deleteDispenser(deleteConfirmation.dispenserId);
      if (success) {
        setDeleteConfirmation({
          show: false,
          dispenserId: '',
          serialNumber: '',
        });
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, dispenserId: '', serialNumber: '' });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Dispensers</h1>
        <Link
          href='/dispensers/new'
          className='btn btn-primary'>
          Add Dispenser
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
                placeholder='Search by serial number...'
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
              <div className='join'>
                <button
                  className={`btn join-item ${
                    statusFilter === 'all' ? 'btn-active' : ''
                  }`}
                  onClick={() => handleStatusFilter('all')}>
                  All
                </button>
                <button
                  className={`btn join-item ${
                    statusFilter === 'assigned' ? 'btn-active' : ''
                  }`}
                  onClick={() => handleStatusFilter('assigned')}>
                  Assigned
                </button>
                <button
                  className={`btn join-item ${
                    statusFilter === 'unassigned' ? 'btn-active' : ''
                  }`}
                  onClick={() => handleStatusFilter('unassigned')}>
                  Unassigned
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {dbError && (
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
            <span className='font-bold'>Error:</span> {dbError}
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
      {dbLoading ? (
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
              Showing {enhancedDispensers.length} of {totalCount} dispensers
            </div>
          </div>

          {/* Dispensers table */}
          <div className='overflow-x-auto'>
            <table className='table table-zebra w-full'>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th>Patient</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enhancedDispensers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='text-center py-4'>
                      No dispensers found
                    </td>
                  </tr>
                ) : (
                  enhancedDispensers.map((dispenser) => (
                    <tr key={dispenser.id}>
                      <td>
                        <Link
                          href={`/dispensers/${dispenser.id}`}
                          className='font-medium hover:underline'>
                          {dispenser.serialNumber}
                        </Link>
                      </td>
                      <td>
                        <div className='flex flex-col gap-1'>
                          <DispenserStatusBadge
                            status={
                              dispenser.liveStatus
                                ? dispenser.liveStatus
                                : DispenserStatus.OFFLINE
                            }
                          />
                        </div>
                      </td>
                      <td>{formatDate(dispenser.lastSeen)}</td>
                      <td>
                        {dispenser.patient ? (
                          <Link
                            href={`/patients/${dispenser.patient.id}`}
                            className='link link-hover link-primary'>
                            {dispenser.patient.name}
                          </Link>
                        ) : (
                          <span className='text-gray-500'>Not assigned</span>
                        )}
                      </td>
                      <td>
                        <div className='flex space-x-2'>
                          <Link
                            href={`/dispensers/${dispenser.id}`}
                            className='btn btn-sm btn-outline'>
                            View
                          </Link>
                          <button
                            onClick={() => confirmDelete(dispenser)}
                            className='btn btn-sm btn-error btn-outline'
                            disabled={!!dispenser.patient}>
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
              Are you sure you want to delete dispenser{' '}
              {deleteConfirmation.serialNumber}? This action cannot be undone.
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
