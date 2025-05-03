/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DispenserStatusBadge from '@/components/dispensers/DispenserStatusBadge';

type Schedule = {
  id: string;
  time: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  chambers: {
    id: string;
    medication: {
      id: string;
      name: string;
      dosageUnit: string;
    };
    dosageAmount: number;
  }[];
};

type DispenserWithSchedules = {
  id: string;
  serialNumber: string;
  status: string;
  patient: {
    id: string;
    name: string;
  } | null;
  schedules: Schedule[];
};

export default function SchedulesPage() {
  const params = useParams();
  const dispenserId = params.id as string;

  const [dispenser, setDispenser] = useState<DispenserWithSchedules | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    const fetchDispenser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/dispensers/${dispenserId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch dispenser data');
        }

        const data = await response.json();
        setDispenser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching dispenser:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDispenser();
  }, [dispenserId]);

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No end date';
    return new Date(dateString).toLocaleDateString();
  };

  // Filter schedules based on active/inactive toggle
  const filteredSchedules =
    dispenser?.schedules.filter((schedule) =>
      showInactive ? true : schedule.isActive
    ) || [];

  // Group schedules by time for calendar view
  const schedulesByHour: Record<number, Schedule[]> = {};

  filteredSchedules.forEach((schedule) => {
    if (!schedulesByHour[schedule.time]) {
      schedulesByHour[schedule.time] = [];
    }
    schedulesByHour[schedule.time].push(schedule);
  });

  // Hours for the day (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

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
      <div className='alert alert-warning'>
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
        <span>Dispenser not found</span>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Medication Schedules</h1>
        <div className='flex gap-2'>
          {dispenser.patient && (
            <Link
              href={`/dispensers/${dispenserId}/schedules/new`}
              className='btn btn-primary'>
              Add Schedule
            </Link>
          )}
          <Link
            href={`/dispensers/${dispenserId}`}
            className='btn'>
            Back to Dispenser
          </Link>
        </div>
      </div>

      {/* Dispenser Info */}
      <div className='card bg-base-200 p-4 rounded-box'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <div className='text-lg font-semibold'>
              {dispenser.serialNumber}
            </div>
            <div className='flex items-center gap-2 mt-1'>
              <DispenserStatusBadge status={dispenser.status as any} />
              {dispenser.patient ? (
                <Link
                  href={`/patients/${dispenser.patient.id}`}
                  className='link link-hover'>
                  Patient: {dispenser.patient.name}
                </Link>
              ) : (
                <span className='text-error'>No patient assigned</span>
              )}
            </div>
          </div>
          <div className='form-control'>
            <label className='cursor-pointer label flex justify-start gap-2'>
              <input
                type='checkbox'
                className='toggle toggle-primary'
                checked={showInactive}
                onChange={() => setShowInactive(!showInactive)}
              />
              <span className='label-text'>Show inactive schedules</span>
            </label>
          </div>
        </div>
      </div>

      {!dispenser.patient && (
        <div className='alert alert-warning'>
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
          <div>
            <h3 className='font-bold'>No Patient Assigned</h3>
            <div className='text-sm'>
              Assign a patient to this dispenser to create medication schedules
            </div>
          </div>
        </div>
      )}

      {dispenser.schedules.length === 0 ? (
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
          <span>No medication schedules found for this dispenser.</span>
        </div>
      ) : (
        <>
          {/* Calendar View */}
          <div className='card bg-base-100 shadow-sm'>
            <div className='card-body'>
              <h2 className='card-title'>Daily Schedule Calendar</h2>
              <div className='overflow-x-auto'>
                <table className='table table-zebra'>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Schedules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => (
                      <tr
                        key={hour}
                        className={
                          schedulesByHour[hour]?.length ? 'bg-base-200' : ''
                        }>
                        <td className='font-medium'>{formatTime(hour)}</td>
                        <td>
                          {schedulesByHour[hour]?.map((schedule) => (
                            <Link
                              key={schedule.id}
                              href={`/dispensers/${dispenserId}/schedules/${schedule.id}`}
                              className='block p-2 mb-2 rounded-lg hover:bg-base-300 transition-colors'>
                              <div className='flex items-center justify-between'>
                                <div>
                                  <span
                                    className={`badge ${
                                      schedule.isActive
                                        ? 'badge-success'
                                        : 'badge-warning'
                                    } mr-2`}>
                                    {schedule.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  {schedule.chambers.map((chamber) => (
                                    <span
                                      key={chamber.id}
                                      className='badge badge-outline mr-1'>
                                      {chamber.medication.name} (
                                      {chamber.dosageAmount})
                                    </span>
                                  ))}
                                </div>
                                <div className='text-xs opacity-70'>
                                  {formatDate(schedule.startDate)} -{' '}
                                  {formatDate(schedule.endDate)}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* List View */}
          <div className='card bg-base-100 shadow-sm'>
            <div className='card-body'>
              <h2 className='card-title'>Schedules List</h2>
              <div className='overflow-x-auto'>
                <table className='table'>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Medications</th>
                      <th>Date Range</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedules
                      .sort((a, b) => a.time - b.time)
                      .map((schedule) => (
                        <tr key={schedule.id}>
                          <td className='font-medium'>
                            {formatTime(schedule.time)}
                          </td>
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
                          <td>
                            <div className='flex flex-wrap gap-1'>
                              {schedule.chambers.map((chamber) => (
                                <span
                                  key={chamber.id}
                                  className='badge badge-outline'>
                                  {chamber.medication.name} (
                                  {chamber.dosageAmount})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div>{formatDate(schedule.startDate)}</div>
                            <div>
                              {schedule.endDate
                                ? `to ${formatDate(schedule.endDate)}`
                                : 'No end date'}
                            </div>
                          </td>
                          <td>
                            <div className='flex gap-2'>
                              <Link
                                href={`/dispensers/${dispenserId}/schedules/${schedule.id}`}
                                className='btn btn-sm'>
                                View
                              </Link>
                              <Link
                                href={`/dispensers/${dispenserId}/schedules/${schedule.id}?edit=true`}
                                className='btn btn-sm btn-outline'>
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
