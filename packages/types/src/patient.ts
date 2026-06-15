export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  address: string;
  allergies: string[];
  distanceKm: number;
  attendanceRate: number;
}
