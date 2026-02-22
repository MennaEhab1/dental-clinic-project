import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Shield,
  Lock,
  Camera,
  Save,
  AlertTriangle,
  Droplet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mockPatients } from '@/services/mockData';

export default function PatientProfile() {
  const { user } = useAuth();
  const patient = mockPatients.find(p => p.id === (user?.id || 'pat-1')) || mockPatients[0];

  const [formData, setFormData] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email,
    phone: patient.phone,
    address: patient.address,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    bloodType: patient.bloodType || '',
    emergencyName: patient.emergencyContact?.name || '',
    emergencyPhone: patient.emergencyContact?.phone || '',
    emergencyRelation: patient.emergencyContact?.relationship || '',
    insuranceProvider: patient.insuranceInfo?.provider || '',
    policyNumber: patient.insuranceInfo?.policyNumber || '',
    insuranceExpiry: patient.insuranceInfo?.expiryDate || '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifications, setNotifications] = useState({
    appointments: true,
    messages: true,
    reminders: true,
    promotions: false,
  });

  const handleSave = () => {
    // TODO: Call real API to update patient profile
    toast({ title: 'Profile Updated', description: 'Your profile has been saved successfully.' });
  };

  const handlePasswordChange = () => {
    if (passwords.new !== passwords.confirm) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    // TODO: Call real API to change password
    toast({ title: 'Password Changed', description: 'Your password has been updated.' });
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your personal information and preferences</p>
        </motion.div>

        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="medical">Medical Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={patient.avatar} />
                      <AvatarFallback className="text-xl">{patient.firstName[0]}{patient.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full">
                      <Camera className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{patient.firstName} {patient.lastName}</p>
                    <p className="text-sm text-muted-foreground">Patient ID: {patient.id}</p>
                    <Badge className="mt-1 bg-success/10 text-success">Active</Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> First Name</Label>
                    <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> Last Name</Label>
                    <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Date of Birth</Label>
                    <Input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Input value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as 'male' | 'female' | 'other'})} />
                  </div>
                </div>

                <Button onClick={handleSave} className="gradient-bg border-0">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Information */}
          <TabsContent value="medical">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Heart className="w-5 h-5 text-destructive" /> Medical Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Droplet className="w-3.5 h-3.5" /> Blood Type</Label>
                      <Input value={formData.bloodType} onChange={e => setFormData({...formData, bloodType: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> Allergies</Label>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies?.map((allergy, i) => (
                        <Badge key={i} variant="outline" className="bg-warning/10 text-warning">{allergy}</Badge>
                      ))}
                      {(!patient.allergies || patient.allergies.length === 0) && (
                        <span className="text-sm text-muted-foreground">No known allergies</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Phone className="w-5 h-5 text-destructive" /> Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={formData.emergencyName} onChange={e => setFormData({...formData, emergencyName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={formData.emergencyPhone} onChange={e => setFormData({...formData, emergencyPhone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input value={formData.emergencyRelation} onChange={e => setFormData({...formData, emergencyRelation: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Insurance Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Input value={formData.insuranceProvider} onChange={e => setFormData({...formData, insuranceProvider: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Policy Number</Label>
                      <Input value={formData.policyNumber} onChange={e => setFormData({...formData, policyNumber: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={formData.insuranceExpiry} onChange={e => setFormData({...formData, insuranceExpiry: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSave} className="gradient-bg border-0">
                <Save className="w-4 h-4 mr-2" /> Save Medical Info
              </Button>
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                </div>
                <Button onClick={handlePasswordChange} variant="outline">
                  <Lock className="w-4 h-4 mr-2" /> Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">Appearance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'appointments', label: 'Appointment Reminders', desc: 'Get notified about upcoming appointments' },
                    { key: 'messages', label: 'New Messages', desc: 'Get notified when you receive a message' },
                    { key: 'reminders', label: 'Health Reminders', desc: 'Periodic dental health tips and reminders' },
                    { key: 'promotions', label: 'Promotions', desc: 'Special offers and discounts' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(checked) => setNotifications({...notifications, [item.key]: checked})}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
