// src/components/dashboard/RecentLogs.tsx
/*This component displays a table of recent medication dispensing events, including time, patient, dispenser, medications, and status information. 
It fetches log data from the API and shows dispensing status with color-coded badges. 
This provides administrators with insight into recent system activity and medication adherence. */
'use client';

import { useEffect, useState } from 'react';
import { DispenserLog } from '@/types/dashboard';

export default function RecentLogs() {
  const [logs, setLogs] = useState<DispenserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/dashboard/recent-logs');

        if (!response.ok) {
          throw new Error('Failed to fetch recent logs');
        }

        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setError('Could not load recent logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return <div className='skeleton h-64 w-full'></div>;
  }

  if (error) {
    return <div className='alert alert-error'>{error}</div>;
  }

  const statusBadge = (status: DispenserLog['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className='badge badge-success'>Completed</span>;
      case 'MISSED':
        return <span className='badge badge-error'>Missed</span>;
      case 'LATE':
        return <span className='badge badge-warning'>Late</span>;
      case 'ERROR':
        return <span className='badge badge-error'>Error</span>;
    }
  };

  const formatTime = (hour: number) => {
    return `${hour}:00`;
  };

  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-bold'>Recent Dispensing Events</h2>

      {logs.length === 0 ? (
        <div className='alert'>
          <span>No recent dispensing events.</span>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='table table-zebra w-full'>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Dispenser</th>
                <th>Medications</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className='font-bold'>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className='text-sm opacity-70'>
                      Scheduled: {formatTime(log.scheduleTime)}
                    </div>
                  </td>
                  <td>{log.patient}</td>
                  <td>{log.dispenserSerial}</td>
                  <td>
                    {log.medications.map((med, i) => (
                      <div
                        key={i}
                        className='text-sm'>
                        {med.name} ({med.amount})
                      </div>
                    ))}
                  </td>
                  <td>{statusBadge(log.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
