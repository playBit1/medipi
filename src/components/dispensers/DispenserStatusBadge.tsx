import { DispenserStatus } from '@/types/dispenser';

type DispenserStatusBadgeProps = {
  status: DispenserStatus;
};

export default function DispenserStatusBadge({
  status,
}: DispenserStatusBadgeProps) {
  const getStatusClass = () => {
    switch (status) {
      case DispenserStatus.ONLINE:
        return 'badge-success';
      case DispenserStatus.OFFLINE:
        return 'badge-warning';
      case DispenserStatus.MAINTENANCE:
        return 'badge-info';
      case DispenserStatus.ERROR:
        return 'badge-error';
      case DispenserStatus.OFFLINE_AUTONOMOUS:
        return 'badge-primary';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <span className={`badge ${getStatusClass()}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
