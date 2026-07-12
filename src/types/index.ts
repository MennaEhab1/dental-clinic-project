// Core application types - Ready for API integration
//index.ts file
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  role: "patient" | "doctor" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface Patient extends User {
  role: "patient";
  dateOfBirth: string;
  gender: "male" | "female" | "other";

  address: string;
  bloodType?: string;
  allergies?: string[];
  isActive?: boolean;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: MedicalRecord[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };
}

export interface Doctor extends User {
  role: "doctor";
  specialty: DentalSpecialty;
  specialization?: string;
  specialityName?: string;
  qualifications: string[];
  experience: number;
  workingHours?: number;
  salary?: number;
  bio: string;
  consultationFee: number;
  gender?: string;
  address?: string;
  averageRating?: number;
  totalReviews?: number;
  rating: number;
  reviewCount: number;
  availableSlots: TimeSlot[];
  workingDays: string[];
  schedule?: WeeklySchedule;
  isActive?: boolean;
}

export interface Admin extends User {
  role: "admin";
  permissions: string[];
}

export type DentalSpecialty =
  | "general"
  | "orthodontics"
  | "periodontics"
  | "endodontics"
  | "prosthodontics"
  | "oral-surgery"
  | "pediatric"
  | "cosmetic";

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  specialty: DentalSpecialty;
  duration: number;
  price: number;
  image?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  serviceId: string;
  service?: Service;
  date: string;
  time: string;
  startTime?: string;
  duration: number;
  amount?: number;
  paymentMethod?: string | null;
  status: AppointmentStatus;
  notes?: string;
  prescription?: Prescription;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = "upcoming" | "complete" | "cancelled";

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface WeeklySchedule {
  [day: string]: { start: string; end: string; isOff: boolean };
}

export interface MedicalRecord {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  doctor?: Doctor;
  patient?: Patient;
  date: string;
  type: "diagnosis" | "treatment" | "prescription" | "note";
  diagnosis: string;
  treatment: string;
  notes: string;
  toothNumber?: string;
  attachments?: Attachment[];
  prescription?: Prescription;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
  uploadedAt: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  medications: PrescriptionMedication[];
  instructions: string;
  createdAt: string;
}

export interface PrescriptionMedication {
  medicineId: string;
  medicine?: Medicine;
  quantity?: number | null;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
  catalogMedicineId?: string | null; // الـ ID الحقيقي من كتالوج الأدوية - يُستخدم للبحث عن الصيدليات
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  price: number;
  stock: number;
  unit: string;
  description: string;
  sideEffects?: string[];
  image?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails?: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "appointment" | "message" | "system" | "reminder";
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  appointmentId?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  helpful?: number;
}

export interface HomeStatistics {
  patientsCount: number;
  doctorsCount: number;
}

export interface HomeTopReview {
  rating: number;
  comment: string;
  patientName: string;
  profileImageUrl: string | null;
}

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  completedAppointments: number;
  revenue: number;
  pendingAppointments: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  firstName: string;
  lastName: string;
  phone: string;
  role: "patient" | "doctor";
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  address?: string;
}
