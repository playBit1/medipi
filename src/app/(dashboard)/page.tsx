import StatusOverview from '@/components/dashboard/StatusOverview';
import AlertsList from '@/components/dashboard/AlertsList';
import RecentLogs from '@/components/dashboard/RecentLogs';

export default function Dashboard() {
  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Dashboard</h1>

      <StatusOverview />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div>
          <AlertsList />
        </div>
        <div>
          <RecentLogs />
        </div>
      </div>
    </div>
  );
}
