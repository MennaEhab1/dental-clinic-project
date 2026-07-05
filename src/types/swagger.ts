// Generated TypeScript models from Swagger (SmartTeethCare.API)
// Partial: includes commonly-used request/response DTOs.
//swagger.ts file
export type ApiAppointmentStatus = 0 | 1 | 2 | 3 | 4;

export interface BookAppointmentDto {
  doctorId: number;
  patientId?: number | null;
  date: string; // date-time
  startTime: string; // date-span "HH:mm:ss"
  amount: number;
  paymentMethod?: string | null;
  createdByAdmin?: boolean;
  paymentIntentId?: string | null;
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

export interface UpdatePatientProfileDto {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
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

export interface ChangePasswordDTO {
  currentPassword?: string | null;
  newPassword?: string | null;
  confirmPassword?: string | null;
}

export interface AuthResponseDTO {
  token?: string | null;
  refreshToken?: string | null;
  expiration?: string | null; // date-time
}

export interface RefreshTokenRequestDTO {
  refreshToken?: string | null;
}

export interface RevokeTokenDTO {
  refreshToken?: string | null;
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
  appointmentId?: number | null;
  appointmentID?: number | null;
  date?: string; // date-time
  doctorName?: string | null;
  patientName?: string | null;
  medicines?: PrescriptionMedicineDetailsDto[] | null;
}
// ============================================================
// أضيفي الـ types دي في swagger.ts بتاعتك
// ============================================================

// ---- Request DTOs ----

export interface CreateMedicalRecordDto {
  appointmentId: number;
  diagnosis?: string | null;
  notes?: string | null;
}

export interface AddReviewDTO {
  doctorId: number;
  appointmentId: number;
  rating: number;
  comment?: string | null;
}

export interface UpdateReviewDTO {
  rating: number;
  comment?: string | null;
}

// Inferred response shape for PatientReviews list/detail endpoints.
export interface PatientReviewViewDto {
  id?: number | null;
  reviewId?: number | null;
  doctorId?: number | null;
  patientId?: number | null;
  appointmentId?: number | null;
  rating?: number | null;
  comment?: string | null;
  doctorName?: string | null;
  patientName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  date?: string | null;
}

export interface UpdateMedicalRecordRequest {
  id: string;
  appointmentId: number;
  diagnosis: string;
  notes?: string | null;
  toothNumber?: string | null;
  type?: string | null;
}

// ---- Response DTOs ----

// ما بيرجعه GET /api/MedicalRecords/my-records  (array)
// وكمان GET /api/MedicalRecords/details/{id}     (object واحد)
export interface MedicalRecordViewDto {
  id?: number | null;
  appointmentId?: number | null;
  patientId?: number | null;
  patientName?: string | null;
  doctorId?: number | null;
  doctorName?: string | null;
  date?: string | null; // date-time
  type?: string | null; // "diagnosis" | "treatment" | "prescription" | "note"
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  toothNumber?: string | null;
}

// Export a consolidated namespace for convenience
export const SwaggerTypes = {
  BookAppointmentDto: undefined as unknown as BookAppointmentDto,
  ForgotPasswordDTO: undefined as unknown as ForgotPasswordDTO,
  LoginDTO: undefined as unknown as LoginDTO,
  RegisterDTO: undefined as unknown as RegisterDTO,
  UpdatePatientProfileDto: undefined as unknown as UpdatePatientProfileDto,
  ResetPasswordDTO: undefined as unknown as ResetPasswordDTO,
  ChangePasswordDTO: undefined as unknown as ChangePasswordDTO,
  UserDTO: undefined as unknown as UserDTO,
  CreatePrescriptionDto: undefined as unknown as CreatePrescriptionDto,
  PrescriptionDetailsDTO: undefined as unknown as PrescriptionDetailsDTO,
  CreateMedicalRecordDto: undefined as unknown as CreateMedicalRecordDto,
  MedicalRecordViewDto: undefined as unknown as MedicalRecordViewDto,
  AddReviewDTO: undefined as unknown as AddReviewDTO,
  UpdateReviewDTO: undefined as unknown as UpdateReviewDTO,
  PatientReviewViewDto: undefined as unknown as PatientReviewViewDto,
  UpdateMedicalRecordRequest:
    undefined as unknown as UpdateMedicalRecordRequest,
};

export default SwaggerTypes;
