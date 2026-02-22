import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus } from '@/types';

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' },
  'in-progress': { label: 'In Progress', className: 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20' },
  'no-show': { label: 'No Show', className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80' },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: 'sm' | 'default';
}

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : ''}`}
    >
      {config.label}
    </Badge>
  );
}
