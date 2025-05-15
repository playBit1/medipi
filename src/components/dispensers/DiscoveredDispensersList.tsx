/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/dispensers/DiscoveredDispensersList.tsx
'use client';

import DispenserStatusBadge from './DispenserStatusBadge';

type DiscoveredDispensersListProps = {
  dispensers: any[];
  loading: boolean;
  error: string | null;
  onSelect: (dispenser: any) => void;
  selectedSerialNumber?: string;
};

export default function DiscoveredDispensersList({
  dispensers,
  loading,
  error,
  onSelect,
  selectedSerialNumber,
}: DiscoveredDispensersListProps) {
  if (loading && dispensers.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-8'>
        <div className='loading loading-spinner loading-lg'></div>
        <p className='mt-4 text-sm opacity-70'>Scanning for dispensers...</p>
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

  if (dispensers.length === 0) {
    return (
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
          {'No dispensers discovered. Click "Scan for Dispensers" to search.'}
        </span>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
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
          {dispensers.map((dispenser, index) => (
            <tr
              key={dispenser.serialNumber}
              className={`cursor-pointer ${
                selectedSerialNumber === dispenser.serialNumber
                  ? 'bg-primary bg-opacity-20'
                  : ''
              }`}
              onClick={() => onSelect(dispenser)}>
              <td>
                <input
                  type='radio'
                  name='selected-dispenser'
                  className='radio radio-primary'
                  checked={selectedSerialNumber === dispenser.serialNumber}
                  onChange={() => onSelect(dispenser)}
                />
              </td>
              <td>{dispenser.serialNumber}</td>
              <td>{dispenser.ipAddress}</td>
              <td>
                <DispenserStatusBadge status={dispenser.status || 'OFFLINE'} />
              </td>
              <td>{formatDate(dispenser.lastSeen)}</td>
              <td>{dispenser.version || 'Unknown'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
