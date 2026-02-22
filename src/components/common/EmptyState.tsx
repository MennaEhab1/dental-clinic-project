import { motion } from 'framer-motion';
import { LucideIcon, FileQuestion, Users, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon: Icon = FileQuestion, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="gradient-bg border-0">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

export function NoPatients({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No patients found"
      description="There are no patients matching your criteria. Try adjusting your filters or add a new patient."
      action={onAdd ? { label: 'Add Patient', onClick: onAdd } : undefined}
    />
  );
}

export function NoAppointments({ onBook }: { onBook?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No appointments"
      description="You don't have any appointments scheduled. Book your first appointment today."
      action={onBook ? { label: 'Book Appointment', onClick: onBook } : undefined}
    />
  );
}

export function NoMedicines() {
  return (
    <EmptyState
      icon={Package}
      title="No medicines found"
      description="No medicines match your search. Try a different search term."
    />
  );
}
