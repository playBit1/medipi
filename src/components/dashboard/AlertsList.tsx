/* The AlertsList component shows recent system alerts for missed medications, low stock levels, and offline dispensers. 
It fetches data from the API, categorizes alerts by type with appropriate color coding, and formats timestamps for readability. 
This helps administrators quickly identify and address issues in the medication dispensing system. */
'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/types/dashboard';

export default function AlertsList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/dashboard/alerts');

        if (!response.ok) {
          throw new Error('Failed to fetch alerts');
        }

        const data = await response.json();
        setAlerts(data);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
        setError('Could not load alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return <div className='skeleton h-48 w-full'></div>;
  }

  if (error) {
    return <div className='alert alert-error'>{error}</div>;
  }

  const alertColor = (type: Alert['type']) => {
    switch (type) {
      case 'missed':
        return 'alert-error';
      case 'lowStock':
        return 'alert-warning';
      case 'offline':
        return 'alert-info';
      case 'error':
        return 'alert-error';
      default:
        return 'alert-info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-bold'>Recent Alerts</h2>

      {alerts.length === 0 ? (
        <div className='alert alert-success'>
          <span>No active alerts. System operating normally.</span>
        </div>
      ) : (
        <div className='space-y-2'>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert ${alertColor(alert.type)}`}>
              <div>
                <div className='font-bold'>{alert.entity.name}</div>
                <div className='text-sm'>{alert.message}</div>
              </div>
              <div className='text-xs opacity-70'>
                {formatDate(alert.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
