import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Stethoscope,
  Pill,
  Activity,
  Save
} from 'lucide-react';
import type { MedicalRecord, Patient } from '@/types';
import { mockMedicalRecords, mockPatients, mockMedicines } from '@/services/mockData';
import { toast } from '@/hooks/use-toast';

export default function DoctorMedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'diagnosis' | 'prescription' | 'note'>('diagnosis');

  // New record form state
  const [newRecord, setNewRecord] = useState({
    patientId: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    toothNumber: '',
  });

  // New prescription form state
  const [newPrescription, setNewPrescription] = useState({
    patientId: '',
    medicineId: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecords(mockMedicalRecords);
      setPatients(mockPatients);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredRecords = records.filter(r => {
    const matchesSearch = `${r.diagnosis} ${r.treatment} ${r.patient?.firstName} ${r.patient?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPatient = patientFilter === 'all' || r.patientId === patientFilter;
    return matchesSearch && matchesPatient;
  });

  const handleAddDiagnosis = () => {
    // TODO: Replace with real API call
    toast({ title: 'Diagnosis Added', description: 'New diagnosis has been saved to the patient record.' });
    setAddDialogOpen(false);
    setNewRecord({ patientId: '', diagnosis: '', treatment: '', notes: '', toothNumber: '' });
  };

  const handleAddPrescription = () => {
    // TODO: Replace with real API call
    toast({ title: 'Prescription Added', description: 'New prescription has been created.' });
    setAddDialogOpen(false);
    setNewPrescription({ patientId: '', medicineId: '', dosage: '', frequency: '', duration: '', instructions: '' });
  };

  const typeIcons: Record<string, typeof FileText> = {
    diagnosis: Activity,
    treatment: Stethoscope,
    prescription: Pill,
    note: FileText,
  };

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Medical Records</h1>
            <p className="text-muted-foreground text-sm">View and manage patient medical records</p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg border-0">
                <Plus className="w-4 h-4 mr-2" /> Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="font-display">Add Medical Record</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <Tabs value={addType} onValueChange={v => setAddType(v as typeof addType)} className="space-y-4">
                  <TabsList className="w-full bg-muted/50">
                    <TabsTrigger value="diagnosis" className="flex-1">Diagnosis</TabsTrigger>
                    <TabsTrigger value="prescription" className="flex-1">Prescription</TabsTrigger>
                    <TabsTrigger value="note" className="flex-1">Note</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diagnosis" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select value={newRecord.patientId} onValueChange={v => setNewRecord({...newRecord, patientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                        <SelectContent>
                          {patients.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Diagnosis</Label>
                      <Input placeholder="Enter diagnosis" value={newRecord.diagnosis} onChange={e => setNewRecord({...newRecord, diagnosis: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Plan</Label>
                      <Textarea placeholder="Describe treatment plan" value={newRecord.treatment} onChange={e => setNewRecord({...newRecord, treatment: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tooth Number</Label>
                        <Input placeholder="e.g., #14" value={newRecord.toothNumber} onChange={e => setNewRecord({...newRecord, toothNumber: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea placeholder="Additional notes" value={newRecord.notes} onChange={e => setNewRecord({...newRecord, notes: e.target.value})} />
                    </div>
                    <Button onClick={handleAddDiagnosis} className="w-full gradient-bg border-0">
                      <Save className="w-4 h-4 mr-2" /> Save Diagnosis
                    </Button>
                  </TabsContent>

                  <TabsContent value="prescription" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select value={newPrescription.patientId} onValueChange={v => setNewPrescription({...newPrescription, patientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                        <SelectContent>
                          {patients.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Medicine</Label>
                      <Select value={newPrescription.medicineId} onValueChange={v => setNewPrescription({...newPrescription, medicineId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                        <SelectContent>
                          {mockMedicines.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Dosage</Label>
                        <Input placeholder="e.g., 500mg" value={newPrescription.dosage} onChange={e => setNewPrescription({...newPrescription, dosage: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Input placeholder="e.g., 3x daily" value={newPrescription.frequency} onChange={e => setNewPrescription({...newPrescription, frequency: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input placeholder="e.g., 7 days" value={newPrescription.duration} onChange={e => setNewPrescription({...newPrescription, duration: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Instructions</Label>
                      <Textarea placeholder="Special instructions" value={newPrescription.instructions} onChange={e => setNewPrescription({...newPrescription, instructions: e.target.value})} />
                    </div>
                    <Button onClick={handleAddPrescription} className="w-full gradient-bg border-0">
                      <Save className="w-4 h-4 mr-2" /> Save Prescription
                    </Button>
                  </TabsContent>

                  <TabsContent value="note" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select value={newRecord.patientId} onValueChange={v => setNewRecord({...newRecord, patientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                        <SelectContent>
                          {patients.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Notes</Label>
                      <Textarea rows={6} placeholder="Enter treatment notes, observations, follow-up instructions..." value={newRecord.notes} onChange={e => setNewRecord({...newRecord, notes: e.target.value})} />
                    </div>
                    <Button onClick={handleAddDiagnosis} className="w-full gradient-bg border-0">
                      <Save className="w-4 h-4 mr-2" /> Save Note
                    </Button>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search records..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={patientFilter} onValueChange={setPatientFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Records List */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <LoadingCard />
            ) : filteredRecords.length > 0 ? (
              <div className="space-y-3">
                {filteredRecords.map((record, index) => {
                  const Icon = typeIcons[record.type] || FileText;
                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border hover:shadow-card transition-all"
                    >
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{record.diagnosis}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{record.treatment}</p>
                          </div>
                          <Badge variant="outline" className="capitalize text-[10px] shrink-0">{record.type}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={record.patient?.avatar} />
                            <AvatarFallback className="text-[10px]">{record.patient?.firstName[0]}{record.patient?.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {record.patient?.firstName} {record.patient?.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(record.date).toLocaleDateString()}
                          </span>
                          {record.toothNumber && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">Tooth: {record.toothNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No records found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
