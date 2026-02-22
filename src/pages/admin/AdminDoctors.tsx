import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, Star, Filter } from 'lucide-react';
import { doctorService } from '@/services/api';
import type { Doctor } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await doctorService.getAll();
        setDoctors(response.data);
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = `${d.firstName} ${d.lastName} ${d.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = specialtyFilter === 'all' || d.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  const handleDelete = (id: string) => {
    setDoctors(prev => prev.filter(d => d.id !== id));
    toast({ title: 'Doctor Removed', description: 'The doctor has been removed from the system.' });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Doctor Management</h1>
            <p className="text-muted-foreground text-sm">Manage doctors, specialties, and schedules</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg border-0"><Plus className="w-4 h-4 mr-2" /> Add Doctor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">Add New Doctor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>First Name</Label><Input placeholder="First name" /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input placeholder="Last name" /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="doctor@dentalcare.com" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1 555-0000" /></div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>
                      {['general','orthodontics','cosmetic','oral-surgery','pediatric','endodontics','periodontics','prosthodontics'].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace('-',' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Experience (years)</Label><Input type="number" placeholder="10" /></div>
                  <div className="space-y-2"><Label>Consultation Fee ($)</Label><Input type="number" placeholder="150" /></div>
                </div>
                <div className="space-y-2"><Label>Bio</Label><Textarea placeholder="Doctor's biography..." /></div>
                <Button className="w-full gradient-bg border-0" onClick={() => { setDialogOpen(false); toast({ title: 'Doctor Added', description: 'New doctor has been added.' }); }}>
                  Save Doctor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search doctors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Specialty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {['general','orthodontics','cosmetic','oral-surgery','pediatric','endodontics'].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace('-',' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <LoadingCard /> : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredDoctors.map((doctor, i) => (
              <motion.div key={doctor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-card transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback>{doctor.firstName[0]}{doctor.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">Dr. {doctor.firstName} {doctor.lastName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{doctor.specialty.replace('-', ' ')}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doctor.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-warning" /> {doctor.rating}</span>
                          <span>{doctor.experience} yrs exp</span>
                          <span>${doctor.consultationFee}/visit</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doctor.workingDays.slice(0, 3).map(d => <Badge key={d} variant="outline" className="text-[10px]">{d.slice(0, 3)}</Badge>)}
                          {doctor.workingDays.length > 3 && <Badge variant="outline" className="text-[10px]">+{doctor.workingDays.length - 3}</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
