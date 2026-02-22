import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { AppointmentDetailsDrawer } from '@/components/dashboard/AppointmentDetailsDrawer';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { appointmentService } from '@/services/api';
import type { Appointment } from '@/types';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await appointmentService.getAll();
        setAppointments(response.data);
      } catch (error) { console.error('Failed:', error); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = appointments.filter(a => {
    const matchesSearch = `${a.patient?.firstName} ${a.patient?.lastName} ${a.doctor?.firstName} ${a.doctor?.lastName} ${a.service?.name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-foreground">Appointments Monitoring</h1>
          <p className="text-muted-foreground text-sm">Overview of all appointments across the center</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by patient, doctor, or service..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <LoadingCard /> : (
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Patient</th>
                    <th className="pb-3 font-medium text-muted-foreground">Doctor</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Service</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(apt => (
                    <tr key={apt.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => { setSelectedAppointment(apt); setDrawerOpen(true); }}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarImage src={apt.patient?.avatar} /><AvatarFallback className="text-xs">{apt.patient?.firstName[0]}{apt.patient?.lastName[0]}</AvatarFallback></Avatar>
                          <span className="text-foreground font-medium">{apt.patient?.firstName} {apt.patient?.lastName}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">Dr. {apt.doctor?.lastName}</td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell">{apt.service?.name}</td>
                      <td className="py-3 text-muted-foreground hidden lg:table-cell">{new Date(apt.date).toLocaleDateString()} {apt.time}</td>
                      <td className="py-3"><StatusBadge status={apt.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No appointments found</p>}
            </CardContent>
          </Card>
        )}

        <AppointmentDetailsDrawer appointment={selectedAppointment} open={drawerOpen} onClose={() => setDrawerOpen(false)} role="admin" />
      </div>
    </DashboardLayout>
  );
}
