// Generated TypeScript models from Swagger (SmartTeethCare.API)
// Partial: includes commonly-used request/response DTOs.

export type ApiAppointmentStatus = 0 | 1 | 2 | 3 | 4;

export interface BookAppointmentDto {
  dentistId: number;
  appointmentDate: string; // date-time
  serviceId?: number | string | null;
  notes?: string | null;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  userName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address?: string | null;
  role?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null; // date-time
}

export interface UserDTO {
  userName?: string | null;
  email?: string | null;
  role?: string | null;
  token?: string | null;
}

export interface ForgotPasswordDTO {
  email?: string | null;
}

export interface ResetPasswordDTO {
  email?: string | null;
  token?: string | null;
  newPassword?: string | null;
}

export interface PrescriptionMedicineDto {
  medicineId: number;
  dosage?: string | null;
  frequency?: string | null;
  durationInDays?: number | null;
  quantity?: number | null;
  instructions?: string | null;
}

export interface CreatePrescriptionDto {
  appointmentId?: number | null;
  medicines?: PrescriptionMedicineDto[] | null;
}

export interface PrescriptionMedicineDetailsDto {
  medicineName?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  durationInDays?: number | null;
  quantity?: number | null;
  instructions?: string | null;
}

export interface PrescriptionDetailsDTO {
  prescriptionId?: number;
  date?: string; // date-time
  doctorName?: string | null;
  patientName?: string | null;
  medicines?: PrescriptionMedicineDetailsDto[] | null;
}

// Export a consolidated namespace for convenience
export const SwaggerTypes = {
  BookAppointmentDto: undefined as unknown as BookAppointmentDto,
  ForgotPasswordDTO: undefined as unknown as ForgotPasswordDTO,
  LoginDTO: undefined as unknown as LoginDTO,
  RegisterDTO: undefined as unknown as RegisterDTO,
  ResetPasswordDTO: undefined as unknown as ResetPasswordDTO,
  UserDTO: undefined as unknown as UserDTO,
  CreatePrescriptionDto: undefined as unknown as CreatePrescriptionDto,
  PrescriptionDetailsDTO: undefined as unknown as PrescriptionDetailsDTO,
};

export default SwaggerTypes;
