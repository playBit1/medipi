/*The AlertsList component shows recent system alerts for missed medications, low stock levels, and offline dispensers. 
It fetches data from the API, categorizes alerts by type with appropriate color coding, and formats timestamps for readability. 
This helps administrators quickly identify and address issues in the medication dispensing system. */
'use client';

import { useEffect, useState } from 'react';
import { StatusCount } from '@/types/dashboard';

export default function StatusOverview() {
  const [counts, setCounts] = useState<StatusCount>({
    totalPatients: 0,
    totalDispensers: 0,
    onlineDispensers: 0,
    totalMedications: 0,
    lowStockMedications: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const data = await response.json();
        setCounts(data);
      } catch (error) {
        console.error('Failed to fetch counts:', error);
        setError('Could not load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  if (loading) {
    return (
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className='skeleton h-28 rounded-box'></div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className='alert alert-error'>{error}</div>;
  }

  const statusItems = [
    {
      label: 'Total Patients',
      value: counts.totalPatients,
      color: 'bg-info',
    },
    {
      label: 'Total Dispensers',
      value: counts.totalDispensers,
      color: 'bg-primary',
    },
    {
      label: 'Online Dispensers',
      value: counts.onlineDispensers,
      color: 'bg-success',
    },
    {
      label: 'Total Medications',
      value: counts.totalMedications,
      color: 'bg-secondary',
    },
    {
      label: 'Low Stock Alerts',
      value: counts.lowStockMedications,
      color: 'bg-error',
    },
  ];

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4'>
      {statusItems.map((item) => (
        <div
          key={item.label}
          className={`stat shadow ${item.color} rounded-box`}>
          <div className='stat-title'>{item.label}</div>
          <div className='stat-value'>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
