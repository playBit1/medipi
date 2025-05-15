/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(dashboard)/dispensers/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DispenserForm from '@/components/dispensers/DispenserForm';
import DiscoveredDispensersList from '@/components/dispensers/DiscoveredDispensersList';
import { DispenserFormData, DispenserStatus } from '@/types/dispenser';
import { useMqtt } from '@/components/providers/MqttProvider';

export default function NewDispenserPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isScanningForDispensers, setScanningForDispensers] = useState(false);
  const [selectedDispenser, setSelectedDispenser] =
    useState<DispenserFormData | null>(null);

  // Use our MQTT context
  const {
    isConnected: mqttConnected,
    discoveredDispensers,
    scanForDispensers,
  } = useMqtt();

  const handleSubmit = async (data: DispenserFormData) => {
    try {
      const response = await fetch('/api/dispensers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dispenser');
      }

      router.push('/dispensers');
    } catch (err) {
      console.error('Error creating dispenser:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create dispenser'
      );
      throw err;
    }
  };

  const handleScanForDispensers = async () => {
    try {
      setScanningForDispensers(true);
      await scanForDispensers();

      // Set a timeout to ensure the scan has time to complete
      setTimeout(() => {
        setScanningForDispensers(false);
      }, 3000);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError('Failed to scan for dispensers');
      setScanningForDispensers(false);
    }
  };

  const handleSelectDispenser = (dispenser: any) => {
    // Convert string status to DispenserStatus enum
    let dispenserStatus: DispenserStatus = DispenserStatus.OFFLINE;

    // Map the string status to the enum value
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

    // Create a proper DispenserFormData object
    setSelectedDispenser({
      serialNumber: dispenser.serialNumber,
      status: dispenserStatus,
    });
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Add New Dispenser</h1>

      {error && (
        <div className='alert alert-error'>
          <span>{error}</span>
        </div>
      )}

      {/* MQTT Connection Status */}
      <div
        className={`alert ${
          mqttConnected ? 'alert-success' : 'alert-warning'
        }`}>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='stroke-current shrink-0 h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d={
              mqttConnected
                ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            }
          />
        </svg>
        <div>
          <h3 className='font-bold'>
            {mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}
          </h3>
          <div className='text-xs'>
            {mqttConnected
              ? 'Automatic discovery of dispensers is enabled'
              : 'Cannot discover dispensers automatically - check MQTT broker'}
          </div>
        </div>
      </div>

      {/* Discovered Dispensers Section */}
      <div className='card bg-base-200 shadow-xl mb-6'>
        <div className='card-body'>
          <div className='flex justify-between items-center'>
            <h2 className='card-title'>Discovered Dispensers</h2>
            <button
              className='btn btn-primary'
              onClick={handleScanForDispensers}
              disabled={!mqttConnected || isScanningForDispensers}>
              {isScanningForDispensers ? (
                <>
                  <span className='loading loading-spinner loading-xs'></span>
                  Scanning...
                </>
              ) : (
                'Scan for Dispensers'
              )}
            </button>
          </div>

          <DiscoveredDispensersList
            dispensers={discoveredDispensers}
            loading={isScanningForDispensers}
            error={null}
            onSelect={handleSelectDispenser}
            selectedSerialNumber={selectedDispenser?.serialNumber}
          />
        </div>
      </div>

      <div className='card bg-base-200 shadow-xl'>
        <div className='card-body'>
          <h2 className='card-title mb-4'>Dispenser Details</h2>
          <DispenserForm
            onSubmit={handleSubmit}
            initialData={selectedDispenser || undefined}
          />
        </div>
      </div>
    </div>
  );
}
