'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNodeRed } from '@/components/providers/NodeRedProvider';
import DispenserStatusBadge from '@/components/dispensers/DispenserStatusBadge';
import { DispenserFormData, DispenserStatus } from '@/types/dispenser';

export default function NewDispenserPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedDispenser, setSelectedDispenser] =
    useState<DispenserFormData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Use our Node-RED context
  const {
    dispensers: discoveredDispensers,
    isLoading,
    scanForDispensers,
    error: nodeRedError,
  } = useNodeRed();

  // Handle registration of selected dispenser
  const handleRegister = async () => {
    if (!selectedDispenser) {
      setError('Please select a dispenser to register');
      return;
    }

    try {
      setIsRegistering(true);
      setError(null);

      const response = await fetch('/api/dispensers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedDispenser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register dispenser');
      }

      // Registration successful, redirect to dispensers list
      router.push('/dispensers');
    } catch (err) {
      console.error('Error registering dispenser:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to register dispenser'
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle scan button click
  const handleScan = async () => {
    try {
      setError(null);
      scanForDispensers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to scan for dispensers'
      );
    }
  };

  // Handle selection of a dispenser
  const handleSelectDispenser = (dispenser: DispenserFormData) => {
    // Convert Node-RED dispenser to DispenserFormData format
    let dispenserStatus: DispenserStatus = DispenserStatus.OFFLINE;

    // Map the string status to enum value
    if (dispenser.status) {
      switch (dispenser.status.toUpperCase()) {
        case 'ONLINE':
          dispenserStatus = DispenserStatus.ONLINE;
          break;
        case 'OFFLINE':
          dispenserStatus = DispenserStatus.OFFLINE;
          break;
        case 'MAINTENANCE':
          dispenserStatus = DispenserStatus.MAINTENANCE;
          break;
        case 'ERROR':
          dispenserStatus = DispenserStatus.ERROR;
          break;
        case 'OFFLINE_AUTONOMOUS':
          dispenserStatus = DispenserStatus.OFFLINE_AUTONOMOUS;
          break;
      }
    }

    setSelectedDispenser({
      serialNumber: dispenser.serialNumber,
      status: dispenserStatus,
    });
  };

  // Format date for display
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Register New Dispenser</h1>

      {/* Error display */}
      {(error || nodeRedError) && (
        <div className='alert alert-error'>
          <span>{error || nodeRedError}</span>
        </div>
      )}

      {/* Scan section */}
      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <div className='flex justify-between items-center'>
            <h2 className='card-title'>Discovered Dispensers</h2>
            <button
              className='btn btn-primary'
              onClick={handleScan}
              disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className='loading loading-spinner loading-xs'></span>
                  Scanning...
                </>
              ) : (
                'Scan for Dispensers'
              )}
            </button>
          </div>

          {/* Discovered dispensers table */}
          {discoveredDispensers.length === 0 ? (
            <div className='alert alert-info'>
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
                {
                  'No dispensers discovered. Click "Scan for Dispensers" to search for available dispensers.'
                }
              </span>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='table table-zebra w-full'>
                <thead>
                  <tr>
                    <th></th>
                    <th>Serial Number</th>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveredDispensers
                    .filter(
                      (dispenser) =>
                        (dispenser.status || DispenserStatus.OFFLINE) ===
                        'ONLINE'
                    )
                    .map((dispenser) => (
                      <tr
                        key={dispenser.id || dispenser.serialNumber}
                        className={`cursor-pointer hover:bg-base-300 ${
                          selectedDispenser?.serialNumber ===
                          (dispenser.serialNumber || dispenser.id)
                            ? 'bg-primary bg-opacity-20'
                            : ''
                        }`}
                        onClick={() => handleSelectDispenser(dispenser)}>
                        <td>
                          <input
                            type='radio'
                            name='selected-dispenser'
                            className='radio radio-primary'
                            checked={
                              selectedDispenser?.serialNumber ===
                              (dispenser.serialNumber || dispenser.id)
                            }
                            onChange={() => handleSelectDispenser(dispenser)}
                          />
                        </td>
                        <td>{dispenser.serialNumber || dispenser.id}</td>
                        <td>{dispenser.ipAddress || 'Unknown'}</td>
                        <td>
                          <DispenserStatusBadge
                            status={dispenser.status || DispenserStatus.OFFLINE}
                          />
                        </td>
                        <td>
                          {formatDate(
                            dispenser.lastSeen || dispenser.lastUpdate
                          )}
                        </td>
                        <td>{dispenser.version || 'Unknown'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Registration section */}
      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <h2 className='card-title'>Registration</h2>

          {selectedDispenser ? (
            <div className='space-y-4'>
              <div className='alert alert-info'>
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
                  Selected dispenser:{' '}
                  <strong>{selectedDispenser.serialNumber}</strong>
                </span>
              </div>

              <p>
                Registering this dispenser will add it to the system and allow
                you to assign patients and medication schedules.
              </p>

              <div className='flex justify-end gap-2'>
                <button
                  onClick={() => setSelectedDispenser(null)}
                  className='btn btn-ghost'
                  disabled={isRegistering}>
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  className='btn btn-primary'
                  disabled={isRegistering}>
                  {isRegistering ? (
                    <>
                      <span className='loading loading-spinner loading-xs mr-2'></span>
                      Registering...
                    </>
                  ) : (
                    'Register Dispenser'
                  )}
                </button>
              </div>
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
              <span>
                Please select a dispenser from the discovered list above.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
