/**
 * Mock Data for Development
 *
 * This file contains all mock data used during development.
 * When connecting to real backend, this file can be removed
 * and the actual API responses will be used instead.
 */

import type {
  Doctor,
  Patient,
  Appointment,
  Service,
  Medicine,
  Conversation,
  Message,
  DashboardStats,
  MedicalRecord,
  Notification,
  Attachment,
} from "@/types";

// Mock Doctors
export const mockDoctors: Doctor[] = [
  {
    id: "doc-1",
    email: "sarah.johnson@dentalcare.com",
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "+1 555-0101",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
    role: "doctor",
    specialty: "general",
    qualifications: ["DDS", "American Dental Association Member"],
    experience: 12,
    bio: "Dr. Sarah Johnson is a highly experienced general dentist dedicated to providing comprehensive dental care for patients of all ages.",
    consultationFee: 150,
    rating: 4.9,
    reviewCount: 234,
    availableSlots: [],
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    createdAt: "2020-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "doc-2",
    email: "michael.chen@dentalcare.com",
    firstName: "Michael",
    lastName: "Chen",
    phone: "+1 555-0102",
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
    role: "doctor",
    specialty: "orthodontics",
    qualifications: ["DDS", "MS in Orthodontics", "Invisalign Certified"],
    experience: 15,
    bio: "Dr. Michael Chen specializes in creating beautiful smiles through advanced orthodontic treatments including Invisalign and traditional braces.",
    consultationFee: 200,
    rating: 4.8,
    reviewCount: 189,
    availableSlots: [],
    workingDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    createdAt: "2019-06-20T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "doc-3",
    email: "emily.rodriguez@dentalcare.com",
    firstName: "Emily",
    lastName: "Rodriguez",
    phone: "+1 555-0103",
    avatar:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face",
    role: "doctor",
    specialty: "cosmetic",
    qualifications: ["DMD", "Cosmetic Dentistry Fellowship", "AACD Member"],
    experience: 10,
    bio: "Dr. Emily Rodriguez is passionate about cosmetic dentistry, helping patients achieve their dream smiles through veneers, whitening, and smile makeovers.",
    consultationFee: 250,
    rating: 4.9,
    reviewCount: 312,
    availableSlots: [],
    workingDays: ["Monday", "Wednesday", "Thursday", "Friday"],
    createdAt: "2021-03-10T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "doc-4",
    email: "james.wilson@dentalcare.com",
    firstName: "James",
    lastName: "Wilson",
    phone: "+1 555-0104",
    avatar:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face",
    role: "doctor",
    specialty: "oral-surgery",
    qualifications: ["DDS", "MD", "Board Certified Oral Surgeon"],
    experience: 18,
    bio: "Dr. James Wilson is a board-certified oral and maxillofacial surgeon specializing in dental implants, wisdom teeth extraction, and complex oral surgeries.",
    consultationFee: 300,
    rating: 4.7,
    reviewCount: 156,
    availableSlots: [],
    workingDays: ["Tuesday", "Wednesday", "Thursday"],
    createdAt: "2018-09-05T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "doc-5",
    email: "lisa.patel@dentalcare.com",
    firstName: "Lisa",
    lastName: "Patel",
    phone: "+1 555-0105",
    avatar:
      "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&h=400&fit=crop&crop=face",
    role: "doctor",
    specialty: "pediatric",
    qualifications: ["DDS", "Pediatric Dentistry Residency", "Board Certified"],
    experience: 8,
    bio: "Dr. Lisa Patel loves working with children and creating positive dental experiences that set the foundation for a lifetime of healthy smiles.",
    consultationFee: 120,
    rating: 4.9,
    reviewCount: 278,
    availableSlots: [],
    workingDays: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
    createdAt: "2022-01-20T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "doc-6",
    email: "david.kim@dentalcare.com",
    firstName: "David",
    lastName: "Kim",
    phone: "+1 555-0106",
    avatar:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
    role: "doctor",
    specialty: "endodontics",
    qualifications: ["DDS", "MS in Endodontics", "AAE Member"],
    experience: 14,
    bio: "Dr. David Kim is an expert in root canal therapy and endodontic microsurgery, using the latest technology to save natural teeth.",
    consultationFee: 180,
    rating: 4.8,
    reviewCount: 145,
    availableSlots: [],
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    createdAt: "2019-11-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
];

// Mock Patients
export const mockPatients: Patient[] = [
  {
    id: "pat-1",
    email: "john.doe@email.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+1 555-1001",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1985-03-15",
    gender: "male",
    address: "123 Main Street, New York, NY 10001",
    bloodType: "O+",
    allergies: ["Penicillin"],
    isActive: true,
    emergencyContact: {
      name: "Jane Doe",
      phone: "+1 555-1002",
      relationship: "Spouse",
    },
    insuranceInfo: {
      provider: "Blue Cross Blue Shield",
      policyNumber: "BCBS-12345",
      expiryDate: "2026-12-31",
    },
    createdAt: "2023-01-10T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-2",
    email: "emma.smith@email.com",
    firstName: "Emma",
    lastName: "Smith",
    phone: "+1 555-1003",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1990-07-22",
    gender: "female",
    address: "456 Oak Avenue, Los Angeles, CA 90001",
    bloodType: "A+",
    allergies: [],
    isActive: true,
    createdAt: "2023-02-20T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-3",
    email: "robert.johnson@email.com",
    firstName: "Robert",
    lastName: "Johnson",
    phone: "+1 555-1004",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1978-11-08",
    gender: "male",
    address: "789 Pine Road, Chicago, IL 60601",
    bloodType: "B-",
    isActive: true,
    createdAt: "2023-03-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-4",
    email: "sophia.williams@email.com",
    firstName: "Sophia",
    lastName: "Williams",
    phone: "+1 555-1005",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1995-05-30",
    gender: "female",
    address: "321 Elm Street, Houston, TX 77001",
    bloodType: "AB+",
    isActive: true,
    createdAt: "2023-04-25T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-5",
    email: "william.brown@email.com",
    firstName: "William",
    lastName: "Brown",
    phone: "+1 555-1006",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1982-09-12",
    gender: "male",
    address: "654 Maple Drive, Phoenix, AZ 85001",
    bloodType: "O-",
    isActive: false,
    createdAt: "2023-05-10T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-6",
    email: "olivia.davis@email.com",
    firstName: "Olivia",
    lastName: "Davis",
    phone: "+1 555-1007",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1992-01-18",
    gender: "female",
    address: "987 Cedar Lane, Seattle, WA 98101",
    bloodType: "A-",
    isActive: true,
    createdAt: "2023-06-12T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-7",
    email: "james.martinez@email.com",
    firstName: "James",
    lastName: "Martinez",
    phone: "+1 555-1008",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1988-04-05",
    gender: "male",
    address: "135 Birch Blvd, Denver, CO 80201",
    bloodType: "B+",
    isActive: true,
    createdAt: "2023-07-20T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "pat-8",
    email: "ava.garcia@email.com",
    firstName: "Ava",
    lastName: "Garcia",
    phone: "+1 555-1009",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
    role: "patient",
    dateOfBirth: "1997-12-25",
    gender: "female",
    address: "246 Willow Way, Miami, FL 33101",
    isActive: true,
    createdAt: "2023-08-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
];

// Mock Services
export const mockServices: Service[] = [
  {
    id: "srv-1",
    name: "Dental Checkup",
    description:
      "Comprehensive oral examination including X-rays, cleaning, and personalized treatment plan.",
    icon: "Stethoscope",
    specialty: "general",
    duration: 45,
    price: 100,
    image:
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&h=600&fit=crop",
  },
  {
    id: "srv-2",
    name: "Teeth Whitening",
    description:
      "Professional whitening treatment for a brighter, more confident smile.",
    icon: "Sparkles",
    specialty: "cosmetic",
    duration: 60,
    price: 350,
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&h=600&fit=crop",
  },
  {
    id: "srv-3",
    name: "Invisalign Consultation",
    description:
      "Clear aligner treatment for a straighter smile without traditional braces.",
    icon: "Smile",
    specialty: "orthodontics",
    duration: 30,
    price: 200,
    image:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop",
  },
  {
    id: "srv-4",
    name: "Dental Implants",
    description:
      "Permanent tooth replacement solution that looks and functions like natural teeth.",
    icon: "PlusCircle",
    specialty: "oral-surgery",
    duration: 90,
    price: 1500,
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=600&fit=crop",
  },
  {
    id: "srv-5",
    name: "Root Canal Treatment",
    description:
      "Save your natural tooth with our pain-free endodontic treatment.",
    icon: "Activity",
    specialty: "endodontics",
    duration: 90,
    price: 800,
    image:
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&h=600&fit=crop",
  },
  {
    id: "srv-6",
    name: "Pediatric Dental Care",
    description:
      "Gentle and fun dental care designed specifically for children.",
    icon: "Baby",
    specialty: "pediatric",
    duration: 30,
    price: 80,
    image:
      "https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=800&h=600&fit=crop",
  },
  {
    id: "srv-7",
    name: "Dental Veneers",
    description: "Transform your smile with custom-made porcelain veneers.",
    icon: "Sparkles",
    specialty: "cosmetic",
    duration: 60,
    price: 1200,
    image:
      "https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=800&h=600&fit=crop",
  },
  {
    id: "srv-8",
    name: "Gum Treatment",
    description: "Comprehensive periodontal care for healthy gums and teeth.",
    icon: "Heart",
    specialty: "periodontics",
    duration: 45,
    price: 250,
    image:
      "https://images.unsplash.com/photo-1629909615957-be38d48fbbe4?w=800&h=600&fit=crop",
  },
];

// Mock Appointments (expanded)
export const mockAppointments: Appointment[] = [
  {
    id: "apt-1",
    patientId: "pat-1",
    patient: undefined, // will be resolved dynamically
    doctorId: "doc-1",
    doctor: undefined,
    serviceId: "srv-1",
    service: undefined,
    date: "2026-03-06",
    time: "09:00",
    duration: 45,
    status: "upcoming",
    notes: "Regular checkup",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "apt-2",
    patientId: "pat-2",
    doctorId: "doc-3",
    serviceId: "srv-2",
    date: "2026-03-10",
    time: "10:30",
    duration: 60,
    status: "upcoming",
    createdAt: "2026-02-02T14:00:00Z",
    updatedAt: "2026-02-02T14:00:00Z",
  },
  {
    id: "apt-3",
    patientId: "pat-3",
    doctorId: "doc-2",
    serviceId: "srv-3",
    date: "2026-03-15",
    time: "14:00",
    duration: 30,
    status: "upcoming",
    createdAt: "2026-02-03T09:00:00Z",
    updatedAt: "2026-02-03T09:00:00Z",
  },
  {
    id: "apt-4",
    patientId: "pat-4",
    doctorId: "doc-4",
    serviceId: "srv-4",
    date: "2026-02-10",
    time: "11:00",
    duration: 90,
    status: "complete",
    createdAt: "2026-02-04T11:00:00Z",
    updatedAt: "2026-02-04T11:00:00Z",
  },
  {
    id: "apt-5",
    patientId: "pat-5",
    doctorId: "doc-6",
    serviceId: "srv-5",
    date: "2026-01-28",
    time: "15:30",
    duration: 90,
    status: "complete",
    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-01-28T17:00:00Z",
  },
  {
    id: "apt-6",
    patientId: "pat-1",
    doctorId: "doc-3",
    serviceId: "srv-7",
    date: "2026-02-15",
    time: "09:30",
    duration: 60,
    status: "complete",
    notes: "Follow-up veneer adjustment",
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-02-15T10:30:00Z",
  },
  {
    id: "apt-7",
    patientId: "pat-6",
    doctorId: "doc-1",
    serviceId: "srv-1",
    date: "2026-03-20",
    time: "10:00",
    duration: 45,
    status: "upcoming",
    createdAt: "2026-02-01T12:00:00Z",
    updatedAt: "2026-02-01T12:00:00Z",
  },
  {
    id: "apt-8",
    patientId: "pat-7",
    doctorId: "doc-2",
    serviceId: "srv-3",
    date: "2026-03-25",
    time: "15:00",
    duration: 30,
    status: "upcoming",
    createdAt: "2026-02-03T14:00:00Z",
    updatedAt: "2026-02-03T14:00:00Z",
  },
  {
    id: "apt-9",
    patientId: "pat-1",
    doctorId: "doc-1",
    serviceId: "srv-1",
    date: "2025-12-15",
    time: "11:00",
    duration: 45,
    status: "complete",
    notes: "Annual dental checkup - all clear",
    createdAt: "2025-12-01T09:00:00Z",
    updatedAt: "2025-12-15T12:00:00Z",
  },
  {
    id: "apt-10",
    patientId: "pat-8",
    doctorId: "doc-5",
    serviceId: "srv-6",
    date: "2026-03-08",
    time: "14:30",
    duration: 30,
    status: "upcoming",
    createdAt: "2026-02-02T09:00:00Z",
    updatedAt: "2026-02-02T09:00:00Z",
  },
  {
    id: "apt-11",
    patientId: "pat-2",
    doctorId: "doc-1",
    serviceId: "srv-1",
    date: "2025-11-10",
    time: "09:00",
    duration: 45,
    status: "complete",
    createdAt: "2025-10-28T10:00:00Z",
    updatedAt: "2025-11-10T10:00:00Z",
  },
  {
    id: "apt-12",
    patientId: "pat-3",
    doctorId: "doc-4",
    serviceId: "srv-4",
    date: "2026-02-14",
    time: "10:00",
    duration: 90,
    status: "cancelled",
    notes: "Patient requested cancellation",
    createdAt: "2025-12-20T09:00:00Z",
    updatedAt: "2026-01-03T08:00:00Z",
  },
];

// Resolve references
mockAppointments.forEach((apt) => {
  apt.patient = mockPatients.find((p) => p.id === apt.patientId);
  apt.doctor = mockDoctors.find((d) => d.id === apt.doctorId);
  apt.service = mockServices.find((s) => s.id === apt.serviceId);
});

// Mock Medicines
export const mockMedicines: Medicine[] = [
  {
    id: "med-1",
    name: "Amoxicillin 500mg",
    genericName: "Amoxicillin",
    category: "Antibiotics",
    manufacturer: "PharmaCorp",
    price: 15.99,
    stock: 150,
    unit: "Capsules",
    description: "Broad-spectrum antibiotic for dental infections.",
    sideEffects: ["Nausea", "Diarrhea", "Skin rash"],
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
  },
  {
    id: "med-2",
    name: "Ibuprofen 400mg",
    genericName: "Ibuprofen",
    category: "Pain Relief",
    manufacturer: "MediHealth",
    price: 8.99,
    stock: 200,
    unit: "Tablets",
    description: "Non-steroidal anti-inflammatory for pain and swelling.",
    sideEffects: ["Stomach upset", "Dizziness"],
    image:
      "https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop",
  },
  {
    id: "med-3",
    name: "Chlorhexidine Mouthwash",
    genericName: "Chlorhexidine Gluconate",
    category: "Oral Care",
    manufacturer: "DentaCare",
    price: 12.5,
    stock: 75,
    unit: "Bottle (500ml)",
    description: "Antibacterial mouthwash for gum disease treatment.",
    sideEffects: ["Temporary taste alteration", "Teeth staining"],
    image:
      "https://images.unsplash.com/photo-1608571423539-e951a10e6d7e?w=400&h=300&fit=crop",
  },
  {
    id: "med-4",
    name: "Metronidazole 400mg",
    genericName: "Metronidazole",
    category: "Antibiotics",
    manufacturer: "PharmaCorp",
    price: 18.99,
    stock: 100,
    unit: "Tablets",
    description: "Antibiotic for anaerobic bacterial infections.",
    sideEffects: ["Metallic taste", "Nausea", "Headache"],
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=300&fit=crop",
  },
  {
    id: "med-5",
    name: "Lidocaine 2% Gel",
    genericName: "Lidocaine",
    category: "Anesthetics",
    manufacturer: "MediHealth",
    price: 22.0,
    stock: 50,
    unit: "Tube (30g)",
    description: "Topical anesthetic for oral pain relief.",
    sideEffects: ["Numbness", "Tingling"],
    image:
      "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=300&fit=crop",
  },
  {
    id: "med-6",
    name: "Fluoride Toothpaste",
    genericName: "Sodium Fluoride",
    category: "Oral Care",
    manufacturer: "DentaCare",
    price: 6.99,
    stock: 300,
    unit: "Tube (150g)",
    description: "High-fluoride toothpaste for cavity prevention.",
    image:
      "https://images.unsplash.com/photo-1559304787-5c4c3f1a7b2a?w=400&h=300&fit=crop",
  },
  {
    id: "med-7",
    name: "Clindamycin 300mg",
    genericName: "Clindamycin",
    category: "Antibiotics",
    manufacturer: "PharmaCorp",
    price: 24.5,
    stock: 0,
    unit: "Capsules",
    description: "Alternative antibiotic for penicillin-allergic patients.",
    sideEffects: ["Diarrhea", "Abdominal pain", "Rash"],
  },
  {
    id: "med-8",
    name: "Acetaminophen 500mg",
    genericName: "Acetaminophen",
    category: "Pain Relief",
    manufacturer: "MediHealth",
    price: 7.5,
    stock: 180,
    unit: "Tablets",
    description: "Mild pain reliever and fever reducer.",
    sideEffects: ["Liver damage with overdose"],
  },
  {
    id: "med-9",
    name: "Hydrogen Peroxide 3%",
    genericName: "Hydrogen Peroxide",
    category: "Oral Care",
    manufacturer: "DentaCare",
    price: 4.99,
    stock: 220,
    unit: "Bottle (250ml)",
    description: "Antiseptic mouth rinse for wound healing.",
  },
  {
    id: "med-10",
    name: "Prednisolone 5mg",
    genericName: "Prednisolone",
    category: "Anti-inflammatory",
    manufacturer: "PharmaCorp",
    price: 14.0,
    stock: 12,
    unit: "Tablets",
    description: "Corticosteroid for reducing oral inflammation and swelling.",
    sideEffects: ["Weight gain", "Mood changes", "Increased appetite"],
  },
];

// Mock Medical Records
export const mockMedicalRecords: MedicalRecord[] = [
  {
    id: "rec-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    date: "2025-12-15",
    type: "diagnosis",
    diagnosis: "Mild gingivitis in upper left quadrant",
    treatment: "Deep cleaning and scaling",
    notes:
      "Patient advised to improve flossing routine. Schedule follow-up in 3 months.",
    toothNumber: "#14",
    attachments: [
      {
        id: "att-1",
        name: "X-Ray-Upper-Left.png",
        type: "image/png",
        url: "#",
        size: "2.4 MB",
        uploadedAt: "2025-12-15T09:00:00Z",
      },
    ],
  },
  {
    id: "rec-2",
    patientId: "pat-1",
    doctorId: "doc-3",
    date: "2026-01-20",
    type: "treatment",
    diagnosis: "Tooth discoloration",
    treatment: "Porcelain veneer placement",
    notes:
      "Veneer placed on upper front teeth. Color match excellent. Patient satisfied with results.",
    toothNumber: "#8, #9",
    prescription: {
      id: "presc-1",
      appointmentId: "apt-6",
      medications: [
        {
          medicineId: "med-2",
          dosage: "400mg",
          frequency: "Every 6 hours as needed",
          duration: "5 days",
          notes: "Take with food",
        },
      ],
      instructions:
        "Avoid hard foods for 48 hours. Use soft-bristle brush around veneers.",
      createdAt: "2026-01-20T10:00:00Z",
    },
  },
  {
    id: "rec-3",
    patientId: "pat-1",
    doctorId: "doc-1",
    date: "2025-06-10",
    type: "treatment",
    diagnosis: "Dental caries - Class II",
    treatment: "Composite resin filling",
    notes:
      "Cavity on lower right molar filled with tooth-colored composite. No complications.",
    toothNumber: "#30",
  },
  {
    id: "rec-4",
    patientId: "pat-2",
    doctorId: "doc-1",
    date: "2025-11-10",
    type: "diagnosis",
    diagnosis: "Healthy oral condition",
    treatment: "Routine cleaning and polishing",
    notes:
      "No cavities detected. Gums healthy. Recommended continued biannual visits.",
  },
  {
    id: "rec-5",
    patientId: "pat-3",
    doctorId: "doc-4",
    date: "2025-10-05",
    type: "treatment",
    diagnosis: "Impacted wisdom tooth",
    treatment: "Surgical extraction of tooth #32",
    notes:
      "Successful extraction under local anesthesia. Sutures placed. Follow-up in 1 week for suture removal.",
    toothNumber: "#32",
    prescription: {
      id: "presc-2",
      appointmentId: "apt-12",
      medications: [
        {
          medicineId: "med-1",
          dosage: "500mg",
          frequency: "Three times daily",
          duration: "7 days",
          notes: "Complete full course",
        },
        {
          medicineId: "med-2",
          dosage: "400mg",
          frequency: "Every 6 hours as needed",
          duration: "5 days",
        },
      ],
      instructions:
        "No spitting, straws, or smoking for 24 hours. Soft foods for 3 days. Ice pack 20 min on/off.",
      createdAt: "2025-10-05T14:00:00Z",
    },
    attachments: [
      {
        id: "att-2",
        name: "Pre-Op-Panoramic.png",
        type: "image/png",
        url: "#",
        size: "3.1 MB",
        uploadedAt: "2025-10-05T09:00:00Z",
      },
      {
        id: "att-3",
        name: "Post-Op-XRay.png",
        type: "image/png",
        url: "#",
        size: "2.8 MB",
        uploadedAt: "2025-10-05T14:30:00Z",
      },
    ],
  },
  {
    id: "rec-6",
    patientId: "pat-4",
    doctorId: "doc-6",
    date: "2025-09-20",
    type: "treatment",
    diagnosis: "Irreversible pulpitis",
    treatment: "Root canal therapy",
    notes:
      "Root canal completed on lower left first molar. Temporary filling placed. Crown recommended.",
    toothNumber: "#19",
    prescription: {
      id: "presc-3",
      appointmentId: "",
      medications: [
        {
          medicineId: "med-2",
          dosage: "600mg",
          frequency: "Every 8 hours",
          duration: "3 days",
        },
      ],
      instructions:
        "Temporary filling may feel rough. Avoid chewing on the treated side until crown is placed.",
      createdAt: "2025-09-20T16:00:00Z",
    },
  },
];

// Resolve medical record references
mockMedicalRecords.forEach((rec) => {
  rec.doctor = mockDoctors.find((d) => d.id === rec.doctorId);
  rec.patient = mockPatients.find((p) => p.id === rec.patientId);
  if (rec.prescription) {
    rec.prescription.medications.forEach((med) => {
      med.medicine = mockMedicines.find((m) => m.id === med.medicineId);
    });
  }
});

// Mock Conversations (expanded)
export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    participants: ["pat-1", "doc-1"],
    participantDetails: [
      {
        id: "pat-1",
        name: "John Doe",
        avatar: mockPatients[0].avatar,
        role: "patient",
      },
      {
        id: "doc-1",
        name: "Dr. Sarah Johnson",
        avatar: mockDoctors[0].avatar,
        role: "doctor",
      },
    ],
    lastMessage: {
      id: "msg-3",
      senderId: "doc-1",
      receiverId: "pat-1",
      content:
        "No special preparation needed. Just make sure to brush your teeth before coming in.",
      isRead: true,
      createdAt: "2026-02-04T16:40:00Z",
    },
    unreadCount: 0,
    updatedAt: "2026-02-04T16:40:00Z",
  },
  {
    id: "conv-2",
    participants: ["pat-2", "doc-3"],
    participantDetails: [
      {
        id: "pat-2",
        name: "Emma Smith",
        avatar: mockPatients[1].avatar,
        role: "patient",
      },
      {
        id: "doc-3",
        name: "Dr. Emily Rodriguez",
        avatar: mockDoctors[2].avatar,
        role: "doctor",
      },
    ],
    lastMessage: {
      id: "msg-7",
      senderId: "pat-2",
      receiverId: "doc-3",
      content: "Thank you for the whitening treatment, my teeth look amazing!",
      isRead: false,
      createdAt: "2026-02-03T10:15:00Z",
    },
    unreadCount: 1,
    updatedAt: "2026-02-03T10:15:00Z",
  },
  {
    id: "conv-3",
    participants: ["pat-1", "doc-3"],
    participantDetails: [
      {
        id: "pat-1",
        name: "John Doe",
        avatar: mockPatients[0].avatar,
        role: "patient",
      },
      {
        id: "doc-3",
        name: "Dr. Emily Rodriguez",
        avatar: mockDoctors[2].avatar,
        role: "doctor",
      },
    ],
    lastMessage: {
      id: "msg-10",
      senderId: "doc-3",
      receiverId: "pat-1",
      content: "Your veneers are looking great! See you at the next follow-up.",
      isRead: true,
      createdAt: "2026-01-22T14:00:00Z",
    },
    unreadCount: 0,
    updatedAt: "2026-01-22T14:00:00Z",
  },
  {
    id: "conv-4",
    participants: ["pat-3", "doc-2"],
    participantDetails: [
      {
        id: "pat-3",
        name: "Robert Johnson",
        avatar: mockPatients[2].avatar,
        role: "patient",
      },
      {
        id: "doc-2",
        name: "Dr. Michael Chen",
        avatar: mockDoctors[1].avatar,
        role: "doctor",
      },
    ],
    lastMessage: {
      id: "msg-14",
      senderId: "doc-2",
      receiverId: "pat-3",
      content:
        "Please remember to wear your aligners at least 22 hours per day.",
      isRead: false,
      createdAt: "2026-02-05T09:00:00Z",
    },
    unreadCount: 2,
    updatedAt: "2026-02-05T09:00:00Z",
  },
];

// Mock Messages (expanded)
export const mockMessages: Message[] = [
  // conv-1: pat-1 <-> doc-1
  {
    id: "msg-1",
    senderId: "doc-1",
    receiverId: "pat-1",
    content:
      "Hi John, this is Dr. Johnson. I wanted to confirm your upcoming appointment.",
    isRead: true,
    createdAt: "2026-02-04T16:30:00Z",
  },
  {
    id: "msg-2",
    senderId: "pat-1",
    receiverId: "doc-1",
    content:
      "Thank you, Dr. Johnson! Should I avoid eating before the checkup?",
    isRead: true,
    createdAt: "2026-02-04T16:35:00Z",
  },
  {
    id: "msg-3",
    senderId: "doc-1",
    receiverId: "pat-1",
    content:
      "No special preparation needed. Just make sure to brush your teeth before coming in.",
    isRead: true,
    createdAt: "2026-02-04T16:40:00Z",
  },

  // conv-2: pat-2 <-> doc-3
  {
    id: "msg-4",
    senderId: "doc-3",
    receiverId: "pat-2",
    content: "Hi Emma! How are you feeling after the whitening session?",
    isRead: true,
    createdAt: "2026-02-02T09:00:00Z",
  },
  {
    id: "msg-5",
    senderId: "pat-2",
    receiverId: "doc-3",
    content: "Hi Dr. Rodriguez! My teeth feel a bit sensitive, is that normal?",
    isRead: true,
    createdAt: "2026-02-02T09:15:00Z",
  },
  {
    id: "msg-6",
    senderId: "doc-3",
    receiverId: "pat-2",
    content:
      "Yes, mild sensitivity is perfectly normal and should subside within 48 hours. Avoid very hot or cold drinks for now.",
    isRead: true,
    createdAt: "2026-02-02T09:20:00Z",
  },
  {
    id: "msg-7",
    senderId: "pat-2",
    receiverId: "doc-3",
    content: "Thank you for the whitening treatment, my teeth look amazing!",
    isRead: false,
    createdAt: "2026-02-03T10:15:00Z",
  },

  // conv-3: pat-1 <-> doc-3
  {
    id: "msg-8",
    senderId: "pat-1",
    receiverId: "doc-3",
    content: "Dr. Rodriguez, I have a question about my veneers.",
    isRead: true,
    createdAt: "2026-01-22T13:00:00Z",
  },
  {
    id: "msg-9",
    senderId: "pat-1",
    receiverId: "doc-3",
    content: "Should I avoid certain foods? I noticed slight sensitivity.",
    isRead: true,
    createdAt: "2026-01-22T13:01:00Z",
  },
  {
    id: "msg-10",
    senderId: "doc-3",
    receiverId: "pat-1",
    content: "Your veneers are looking great! See you at the next follow-up.",
    isRead: true,
    createdAt: "2026-01-22T14:00:00Z",
  },

  // conv-4: pat-3 <-> doc-2
  {
    id: "msg-11",
    senderId: "pat-3",
    receiverId: "doc-2",
    content:
      "Dr. Chen, I received my Invisalign trays. When should I start wearing them?",
    isRead: true,
    createdAt: "2026-02-04T08:00:00Z",
  },
  {
    id: "msg-12",
    senderId: "doc-2",
    receiverId: "pat-3",
    content:
      "Start wearing them right away! Change to the next set every two weeks.",
    isRead: true,
    createdAt: "2026-02-04T09:00:00Z",
  },
  {
    id: "msg-13",
    senderId: "pat-3",
    receiverId: "doc-2",
    content: "Got it, thanks! Is it normal for them to feel tight?",
    isRead: true,
    createdAt: "2026-02-05T08:30:00Z",
  },
  {
    id: "msg-14",
    senderId: "doc-2",
    receiverId: "pat-3",
    content: "Please remember to wear your aligners at least 22 hours per day.",
    isRead: false,
    createdAt: "2026-02-05T09:00:00Z",
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    userId: "pat-1",
    title: "Appointment Confirmed",
    message:
      "Your appointment with Dr. Johnson on Feb 6 at 9:00 AM has been confirmed.",
    type: "appointment",
    isRead: false,
    link: "/patient/appointments",
    createdAt: "2026-02-05T08:00:00Z",
  },
  {
    id: "notif-2",
    userId: "pat-1",
    title: "New Message",
    message: "You have a new message from Dr. Johnson.",
    type: "message",
    isRead: true,
    link: "/patient/messages",
    createdAt: "2026-02-04T16:40:00Z",
  },
  {
    id: "notif-3",
    userId: "doc-1",
    title: "New Appointment Request",
    message: "John Doe has requested an appointment on Feb 6.",
    type: "appointment",
    isRead: false,
    link: "/doctor/appointments",
    createdAt: "2026-02-04T10:00:00Z",
  },
  {
    id: "notif-4",
    userId: "doc-1",
    title: "Reminder",
    message: "You have 3 appointments scheduled for tomorrow.",
    type: "reminder",
    isRead: false,
    createdAt: "2026-02-05T18:00:00Z",
  },
  {
    id: "notif-5",
    userId: "pat-2",
    title: "Treatment Follow-up",
    message:
      "How is your recovery after the whitening? Please reply if you have concerns.",
    type: "system",
    isRead: false,
    createdAt: "2026-02-03T12:00:00Z",
  },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalPatients: 1250,
  totalDoctors: 12,
  todayAppointments: 28,
  completedAppointments: 15,
  revenue: 45680,
  pendingAppointments: 8,
};
