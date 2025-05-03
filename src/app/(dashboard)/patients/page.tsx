'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import usePatients from '@/hooks/usePatients';
import { PatientWithDispenser } from '@/types/patient';

export default function PatientsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assignToDispenserId = searchParams.get('assignTo');

  const {
    patients,
    totalCount,
    currentPage,
    totalPages,
    loading,
    error,
    setPage,
    setSearch,
    deletePatient,
  } = usePatients();

  const [searchInput, setSearchInput] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    patientId: string;
    patientName: string;
  }>({ show: false, patientId: '', patientName: '' });

  // New state for assignment operations
  const [assignmentStatus, setAssignmentStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
  }>({
    loading: false,
    success: false,
    error: null,
  });

  // New state to track dispenser details (if in assignment mode)
  const [dispenserDetails, setDispenserDetails] = useState<{
    id: string;
    serialNumber: string;
  } | null>(null);

  // Fetch dispenser details if in assignment mode
  useEffect(() => {
    const fetchDispenserDetails = async () => {
      if (!assignToDispenserId) return;

      try {
        const response = await fetch(`/api/dispensers/${assignToDispenserId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dispenser details');
        }

        const data = await response.json();
        setDispenserDetails({
          id: data.id,
          serialNumber: data.serialNumber,
        });

        // If dispenser already has a patient, redirect back with a warning
        if (data.patient) {
          router.push(
            `/dispensers/${assignToDispenserId}?error=already_assigned`
          );
        }
      } catch (err) {
        console.error('Error fetching dispenser:', err);
      }
    };

    if (assignToDispenserId) {
      fetchDispenserDetails();
    }
  }, [assignToDispenserId, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  const confirmDelete = (patient: PatientWithDispenser) => {
    setDeleteConfirmation({
      show: true,
      patientId: patient.id,
      patientName: patient.name,
    });
  };

  const handleDelete = async () => {
    if (deleteConfirmation.patientId) {
      const success = await deletePatient(deleteConfirmation.patientId);
      if (success) {
        setDeleteConfirmation({ show: false, patientId: '', patientName: '' });
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, patientId: '', patientName: '' });
  };

  // New function to handle patient assignment
  const handleAssignPatient = async (patientId: string) => {
    if (!assignToDispenserId) return;

    setAssignmentStatus({
      loading: true,
      success: false,
      error: null,
    });

    try {
      const response = await fetch(
        `/api/dispensers/${assignToDispenserId}/patient`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ patientId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign patient');
      }

      setAssignmentStatus({
        loading: false,
        success: true,
        error: null,
      });

      // Delay a bit to show success message
      setTimeout(() => {
        router.push(`/dispensers/${assignToDispenserId}`);
      }, 1000);
    } catch (err) {
      console.error('Error assigning patient:', err);
      setAssignmentStatus({
        loading: false,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to assign patient',
      });
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDispenserStatusClass = (status: string | undefined) => {
    if (!status) return 'badge-secondary';

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
        <h1 className='text-2xl font-bold'>
          {assignToDispenserId && dispenserDetails
            ? `Assign Patient to Dispenser ${dispenserDetails.serialNumber}`
            : 'Patients'}
        </h1>
        {!assignToDispenserId && (
          <Link
            href='/patients/new'
            className='btn btn-primary'>
            Add Patient
          </Link>
        )}
        {assignToDispenserId && (
          <Link
            href={`/dispensers/${assignToDispenserId}`}
            className='btn btn-outline'>
            Cancel
          </Link>
        )}
      </div>

      {/* Assignment mode info banner */}
      {assignToDispenserId && dispenserDetails && (
        <div className='alert alert-info'>
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
          <div>
            <h3 className='font-bold'>Assignment Mode</h3>
            <div className='text-xs'>
              {
                'Click on "Assign" next to a patient to assign them to dispenser'
              }
              {dispenserDetails.serialNumber}
            </div>
          </div>
        </div>
      )}

      {/* Assignment status */}
      {assignmentStatus.error && (
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
          <span>{assignmentStatus.error}</span>
        </div>
      )}

      {assignmentStatus.success && (
        <div className='alert alert-success'>
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
          <span>Patient successfully assigned! Redirecting...</span>
        </div>
      )}

      {/* Search and filters */}
      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <form
            onSubmit={handleSearch}
            className='flex gap-2'>
            <input
              type='text'
              placeholder='Search by name or room number...'
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
      {loading || assignmentStatus.loading ? (
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
          <div className='text-sm'>
            Showing {patients.length} of {totalCount} patients
          </div>

          {/* Patients table */}
          <div className='overflow-x-auto'>
            <table className='table table-zebra w-full'>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date of Birth</th>
                  <th>Room Number</th>
                  <th>Current Dispenser</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='text-center py-4'>
                      No patients found
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <Link
                          href={`/patients/${patient.id}`}
                          className='font-medium hover:underline'>
                          {patient.name}
                        </Link>
                      </td>
                      <td>{formatDate(patient.dateOfBirth)}</td>
                      <td>{patient.roomNumber || '-'}</td>
                      <td>
                        {patient.dispenser ? (
                          <div className='flex flex-col gap-1'>
                            <Link
                              href={`/dispensers/${patient.dispenser.id}`}
                              className='link link-primary'>
                              {patient.dispenser.serialNumber}
                            </Link>
                            <div
                              className={`badge ${getDispenserStatusClass(
                                patient.dispenser.status
                              )}`}>
                              {patient.dispenser.status}
                            </div>
                          </div>
                        ) : (
                          <span className='text-gray-500'>Not assigned</span>
                        )}
                      </td>
                      <td>
                        <div className='flex space-x-2'>
                          {assignToDispenserId ? (
                            // Show assign button in assignment mode
                            <button
                              onClick={() => handleAssignPatient(patient.id)}
                              className='btn btn-sm btn-primary'
                              disabled={!!patient.dispenser}>
                              {!!patient.dispenser
                                ? 'Already Assigned'
                                : 'Assign'}
                            </button>
                          ) : (
                            // Show regular actions outside assignment mode
                            <>
                              <Link
                                href={`/patients/${patient.id}/edit`}
                                className='btn btn-sm btn-outline'>
                                Edit
                              </Link>
                              <button
                                onClick={() => confirmDelete(patient)}
                                className='btn btn-sm btn-error btn-outline'
                                disabled={!!patient.dispenser}>
                                Delete
                              </button>
                            </>
                          )}
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
              Are you sure you want to delete {deleteConfirmation.patientName}?
              This action cannot be undone.
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
