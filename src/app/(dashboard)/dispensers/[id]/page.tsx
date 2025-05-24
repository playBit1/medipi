/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DispenserDetails, DispensingStatus } from '@/types/dispenser';
import { useNodeRed } from '@/components/providers/NodeRedProvider';

export default function DispenserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispenserId = params.id as string;

  // State for database dispenser data
  const [dispenser, setDispenser] = useState<DispenserDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'general' | 'patient' | 'schedules' | 'logs'
  >('general');

  // State for Node-RED integration
  const {
    dispensers: liveDispensers,
    isLoading: nodeRedLoading,
    syncSchedules,
  } = useNodeRed();
  const [liveDispenser, setLiveDispenser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalState, setModalState] = useState<{
    type: 'delete' | 'unassign' | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  // Fetch dispenser data from database
  useEffect(() => {
    fetchDispenserData();
  }, [dispenserId]);

  // Find and update live dispenser data when liveDispensers changes
  useEffect(() => {
    if (dispenser && liveDispensers && liveDispensers.length > 0) {
      // Find the matching live dispenser by serial number
      const matchingDispenser = liveDispensers.find(
        (d) =>
          d.serialNumber === dispenser.serialNumber ||
          d.id === dispenser.serialNumber
      );

      if (matchingDispenser) {
        setLiveDispenser(matchingDispenser);
      }
    }
  }, [liveDispensers, dispenser]);

  const fetchDispenserData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dispensers/${dispenserId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dispenser');
      }

      const data = await response.json();
      setDispenser(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch dispenser'
      );
    } finally {
      setLoading(false);
    }
  };

  // New function to sync schedules with the physical dispenser via Node-RED
  const formatSyncSchedules = async () => {
    if (!dispenser) return;

    try {
      setIsSyncing(true);

      // We need to fetch full schedule details with chamber/medication information
      const enrichedSchedules = await Promise.all(
        dispenser.schedules.map(async (scheduleBasic) => {
          // Fetch complete schedule details including chamber information
          const response = await fetch(
            `/api/dispensers/${dispenserId}/schedules/${scheduleBasic.id}`
          );
          if (!response.ok) {
            throw new Error(
              `Failed to fetch schedule details for ${scheduleBasic.id}`
            );
          }
          const fullSchedule = await response.json();

          // Extract chamber assignments with medication information
          const chamberAssignments = fullSchedule.chambers.map(
            (chamberContent: {
              chamber: { chamberNumber: any };
              medication: { id: any; name: any; dosageUnit: any };
              dosageAmount: any;
            }) => ({
              chamber: chamberContent.chamber.chamberNumber,
              medication: {
                id: chamberContent.medication.id,
                name: chamberContent.medication.name,
                dosageUnit: chamberContent.medication.dosageUnit,
              },
              dosageAmount: chamberContent.dosageAmount,
            })
          );

          // Return complete schedule data for synchronization
          return {
            id: fullSchedule.id,
            time: fullSchedule.time,
            startDate: fullSchedule.startDate,
            endDate: fullSchedule.endDate,
            isActive: fullSchedule.isActive,

            // Patient information
            patientName: dispenser.patient?.name || 'Unknown Patient',
            patientId: dispenser.patient?.id || '',

            // RFID tag information (if available)
            rfidTag:
              dispenser.rfids.find((r) => r.type === 'PATIENT')?.rfidTag || '',

            // Add chamber assignments with medication details
            chambers: chamberAssignments,

            // Add medication list for easy reference
            medications: chamberAssignments.map(
              (ca: {
                medication: { id: any; name: any; dosageUnit: any };
                dosageAmount: number;
              }) => ({
                id: ca.medication.id,
                name: ca.medication.name,
                dosage: `${ca.dosageAmount} ${ca.medication.dosageUnit}${
                  ca.dosageAmount > 1 ? 's' : ''
                }`,
                amount: ca.dosageAmount,
              })
            ),
          };
        })
      );

      const result = await syncSchedules(
        dispenser.serialNumber,
        enrichedSchedules
      );

      console.log('Schedules synced successfully:', result);

      // Show success notification
      setSuccess('Schedules synchronized successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to sync schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync schedules');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/dispensers/${dispenserId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete dispenser');
      }

      router.push('/dispensers');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete dispenser'
      );
      closeModal();
    }
  };

  const handleUnassignPatient = async () => {
    try {
      const response = await fetch(`/api/dispensers/${dispenserId}/patient`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign patient');
      }

      fetchDispenserData(); // Refresh data
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to unassign patient'
      );
      closeModal();
    }
  };

  const openModal = (type: 'delete' | 'unassign') => {
    setModalState({ type, isOpen: true });
  };

  const closeModal = () => {
    setModalState({ type: null, isOpen: false });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (hour: number) => {
    return `${hour}:00`;
  };

  // Calculate connection status
  const getConnectionStatus = () => {
    if (!liveDispenser) return { status: 'Unknown', class: 'badge-warning' };

    const status = liveDispenser.status || 'UNKNOWN';
    let statusClass = 'badge-warning';

    switch (status) {
      case 'ONLINE':
        statusClass = 'badge-success';
        break;
      case 'OFFLINE':
        statusClass = 'badge-warning';
        break;
      case 'ERROR':
        statusClass = 'badge-error';
        break;
      case 'MAINTENANCE':
        statusClass = 'badge-info';
        break;
      case 'OFFLINE_AUTONOMOUS':
        statusClass = 'badge-primary';
        break;
    }

    return { status, class: statusClass };
  };

  const connectionStatus = getConnectionStatus();

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='loading loading-spinner loading-lg'></div>
      </div>
    );
  }

  if (error) {
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
        <span>{error}</span>
      </div>
    );
  }

  if (!dispenser) {
    return (
      <div className='alert alert-error'>
        <span>Dispenser not found</span>
      </div>
    );
  }

  // Check if dispenser has active schedules (used for disabling unassign button)
  const hasActiveSchedules = dispenser.schedules.length > 0;

  return (
    <div className='space-y-6'>
      {/* Header with actions */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>
            Dispenser: {dispenser.serialNumber}
          </h1>
          <div className='flex items-center gap-2 mt-1'>
            {/* Live connection status from Node-RED */}
            {liveDispenser && (
              <>
                <span className={`badge ${connectionStatus.class}`}>
                  {connectionStatus.status}
                </span>
                <span className='text-sm opacity-70'>
                  Last seen:{' '}
                  {formatDate(
                    liveDispenser.lastSeen || liveDispenser.lastUpdate
                  )}
                </span>
              </>
            )}

            {!liveDispenser && !nodeRedLoading && (
              <span className='badge badge-warning'>Not connected</span>
            )}
          </div>
        </div>
        <div className='flex gap-2'>
          <Link
            href={`/dispensers/${dispenserId}/edit`}
            className='btn btn-outline'>
            Edit
          </Link>
          <button
            onClick={() => openModal('delete')}
            className='btn btn-error btn-outline'
            disabled={!!dispenser.patient}>
            Delete
          </button>
        </div>
      </div>

      {success && (
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
          <span>{success}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className='tabs-boxed bg-base-200 p-1 rounded-lg'>
        <div className='tabs w-full'>
          <button
            className={`tab grow ${
              activeTab === 'general' ? 'tab-active' : ''
            }`}
            onClick={() => setActiveTab('general')}>
            General
          </button>
          <button
            className={`tab grow ${
              activeTab === 'patient' ? 'tab-active' : ''
            }`}
            onClick={() => setActiveTab('patient')}>
            Patient
          </button>
          <button
            className={`tab grow ${
              activeTab === 'schedules' ? 'tab-active' : ''
            }`}
            onClick={() => setActiveTab('schedules')}>
            Schedules
          </button>
          <button
            className={`tab grow ${activeTab === 'logs' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('logs')}>
            Logs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className='bg-base-200 rounded-box p-6'>
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className='space-y-6'>
            <h2 className='text-xl font-semibold'>General Information</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text font-semibold'>
                      Serial Number
                    </span>
                  </label>
                  <input
                    type='text'
                    value={dispenser.serialNumber}
                    className='input input-bordered'
                    readOnly
                  />
                </div>
              </div>
              <div className='space-y-4'>
                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text font-semibold'>Created</span>
                  </label>
                  <input
                    type='text'
                    value={formatDate(dispenser.createdAt)}
                    className='input input-bordered'
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Live Node-RED information */}
            {liveDispenser && (
              <>
                <div className='card bg-base-100 shadow-sm'>
                  <div className='card-body'>
                    <h3 className='font-semibold'>Connection Details</h3>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <span className='font-semibold'>IP Address:</span>
                        <p>{liveDispenser.ipAddress || 'Unknown'}</p>
                      </div>

                      {liveDispenser.model && (
                        <div>
                          <span className='font-semibold'>Model:</span>
                          <p>{liveDispenser.model}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className='form-control'>
              <label className='label'>
                <span className='label-text font-semibold'>
                  Assigned RFID Tags
                </span>
              </label>
              <div className='flex flex-wrap gap-2 p-3 bg-base-100 rounded-lg min-h-12'>
                {dispenser.rfids.map((rfid) => (
                  <div
                    key={rfid.id}
                    className='badge badge-outline'>
                    {rfid.rfidTag}
                    <span className='ml-1'>({rfid.type})</span>
                  </div>
                ))}
                {dispenser.rfids.length === 0 && (
                  <span className='opacity-70'>No RFID tags assigned</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Patient Tab */}
        {activeTab === 'patient' && (
          <div className='space-y-6'>
            <div className='flex justify-between items-center'>
              <h2 className='text-xl font-semibold'>Patient Assignment</h2>
              {dispenser.patient ? (
                <button
                  onClick={() => openModal('unassign')}
                  className='btn btn-warning btn-sm'
                  disabled={hasActiveSchedules}>
                  Unassign Patient
                </button>
              ) : (
                <Link
                  href={`/patients?assignTo=${dispenserId}`}
                  className='btn btn-primary btn-sm'>
                  Assign Patient
                </Link>
              )}
            </div>

            {dispenser.patient ? (
              <div className='card bg-base-100 shadow-sm'>
                <div className='card-body'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='space-y-4'>
                      <div className='form-control'>
                        <label className='label'>
                          <span className='label-text font-semibold'>Name</span>
                        </label>
                        <div className='input input-bordered flex items-center justify-between'>
                          <span>{dispenser.patient.name}</span>
                          <Link
                            href={`/patients/${dispenser.patient.id}`}
                            className='btn btn-xs btn-ghost'>
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {hasActiveSchedules && (
                    <div className='alert alert-warning mt-4'>
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
                      <span>
                        Cannot unassign patient while schedules exist. Please
                        delete all schedules first.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='card bg-base-100 shadow-sm'>
                <div className='card-body flex items-center justify-center p-12'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-12 w-12 opacity-30'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                    />
                  </svg>
                  <p className='text-center mt-4 text-lg'>
                    No patient assigned to this dispenser.
                  </p>
                  <Link
                    href={`/patients?assignTo=${dispenserId}`}
                    className='btn btn-primary mt-4'>
                    Assign Patient
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className='space-y-6'>
            <div className='flex justify-between items-center'>
              <h2 className='text-xl font-semibold'>Medication Schedules</h2>
              <div className='flex gap-2'>
                {/* Sync schedules button */}
                {liveDispenser && dispenser.schedules.length > 0 && (
                  <button
                    onClick={formatSyncSchedules}
                    className='btn btn-secondary btn-sm'
                    disabled={isSyncing || !liveDispenser}>
                    {isSyncing ? (
                      <>
                        <span className='loading loading-spinner loading-xs'></span>
                        Syncing...
                      </>
                    ) : (
                      'Sync Schedules'
                    )}
                  </button>
                )}

                {dispenser.patient && (
                  <Link
                    href={`/dispensers/${dispenserId}/schedules/new`}
                    className='btn btn-primary btn-sm'>
                    Add Schedule
                  </Link>
                )}
              </div>
            </div>

            {dispenser.schedules.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='table table-zebra w-full'>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispenser.schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td>{formatTime(schedule.time)}</td>
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
                            href={`/dispensers/${dispenserId}/schedules/${schedule.id}`}
                            className='btn btn-xs btn-outline'>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='card bg-base-100 shadow-sm'>
                <div className='card-body flex items-center justify-center p-12'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-12 w-12 opacity-30'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                    />
                  </svg>
                  <p className='text-center mt-4 text-lg'>
                    No schedules found for this dispenser.
                  </p>
                  {!dispenser.patient && (
                    <div className='alert alert-info mt-4'>
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
                      <span>
                        Assign a patient to this dispenser to create medication
                        schedules.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className='space-y-6'>
            <div className='flex justify-between items-center'>
              <h2 className='text-xl font-semibold'>Dispenser Logs</h2>
              {dispenser.dispenserLogs.length > 0 && (
                <Link
                  href={`/dispensers/${dispenserId}/logs`}
                  className='btn btn-outline btn-sm'>
                  View All Logs
                </Link>
              )}
            </div>

            {dispenser.dispenserLogs.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='table table-zebra w-full'>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Synced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispenser.dispenserLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{formatTime(log.schedule.time)}</td>
                        <td>
                          <span
                            className={`badge ${
                              log.status === DispensingStatus.COMPLETED
                                ? 'badge-success'
                                : log.status === DispensingStatus.MISSED
                                ? 'badge-error'
                                : log.status === DispensingStatus.LATE
                                ? 'badge-warning'
                                : 'badge-error'
                            }`}>
                            {log.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              log.synced ? 'badge-success' : 'badge-warning'
                            }`}>
                            {log.synced ? 'Synced' : 'Not Synced'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='card bg-base-100 shadow-sm'>
                <div className='card-body flex items-center justify-center p-12'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-12 w-12 opacity-30'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                  <p className='text-center mt-4 text-lg'>
                    No logs found for this dispenser.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalState.isOpen && (
        <div className='modal modal-open'>
          <div className='modal-box'>
            <h3 className='font-bold text-lg'>
              {modalState.type === 'delete'
                ? 'Confirm Deletion'
                : 'Confirm Unassign'}
            </h3>
            <p className='py-4'>
              {modalState.type === 'delete'
                ? `Are you sure you want to delete dispenser ${dispenser.serialNumber}? This action cannot be undone.`
                : `Are you sure you want to unassign ${dispenser.patient?.name} from this dispenser?`}
            </p>
            <div className='modal-action'>
              <button
                onClick={closeModal}
                className='btn'>
                Cancel
              </button>
              <button
                onClick={
                  modalState.type === 'delete'
                    ? handleDelete
                    : handleUnassignPatient
                }
                className={`btn ${
                  modalState.type === 'delete' ? 'btn-error' : 'btn-warning'
                }`}>
                {modalState.type === 'delete' ? 'Delete' : 'Unassign'}
              </button>
            </div>
          </div>
          <div
            className='modal-backdrop'
            onClick={closeModal}></div>
        </div>
      )}
    </div>
  );
}
