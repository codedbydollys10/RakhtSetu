export type HospitalRequestShareRadius = 5 | 10 | 25

export type HospitalDirectoryEntry = {
  hospital_id: string
  hospital_name: string
  hospital_type: string | null
  street_address: string | null
  location_address: string | null
  city: string | null
  phone: string | null
  email: string | null
  latitude: number
  longitude: number
  distance_km: number
  total_count: number
}

export type IncomingHospitalRequest = {
  request_id: string
  source_hospital_name: string
  blood_group: string
  units: number
  urgency: string
  request_status: string
  area: string | null
  required_by: string | null
  created_at: string
  response_status: "Pending" | "Accepted" | "Declined"
  responded_at: string | null
}

export type HospitalRequestNetworkResponse = {
  hospital_name: string
  response_status: "Pending" | "Accepted" | "Declined"
  responded_at: string | null
}
