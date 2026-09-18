export type BloodGroup = "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-";
export type Urgency = "CRITICAL" | "URGENT" | "NORMAL";
export type RequestStatus =
  | "Created"
  | "Verification Pending"
  | "Verified"
  | "Matching"
  | "Donors Contacted"
  | "Donor Confirmed"
  | "Hospital Confirmation"
  | "Fulfilled";
export type DonorStatus = "Active" | "Temporarily Unavailable" | "Inactive";
export type VerificationStatus = "Verified" | "Pending" | "Unverified";

export interface Donor {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  area: string;
  city: string;
  status: DonorStatus;
  available: boolean;
  lastDonation: string;
  donationsCount: number;
  phone: string;
  matchScore?: number;
  contactedBy?: string[];
}

export interface Hospital {
  id: string;
  name: string;
  area: string;
  city: string;
  networkStatus: "Online" | "Offline";
  bloodBankStatus: "Adequate" | "Low" | "Critical";
  verified: boolean;
  requestsCoordinated: number;
}

export interface NGO {
  id: string;
  name: string;
  area: string;
  city: string;
  verified: boolean;
  activeNetwork: boolean;
  requestsCoordinated: number;
  donorCount: number;
}

export interface BloodRequest {
  id: string;
  hospitalId: string;
  hospitalName: string;
  bloodGroup: BloodGroup;
  units: number;
  urgency: Urgency;
  status: RequestStatus;
  createdAt: string;
  area: string;
  patientAge?: number;
  notes?: string;
  verifiedBy?: string;
  matchedDonors?: string[];
  confirmedDonor?: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Notification {
  id: string;
  type: "request" | "match" | "verified" | "message" | "system";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

// DONORS
export const donors: Donor[] = [
  {
    id: "d1",
    name: "Aarav Mehta",
    bloodGroup: "O+",
    area: "Andheri",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-06-15",
    donationsCount: 7,
    phone: "+91-98XXXXXXX1",
    matchScore: 92,
    contactedBy: [],
  },
  {
    id: "d2",
    name: "Priya Sharma",
    bloodGroup: "A+",
    area: "Bandra",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-05-20",
    donationsCount: 4,
    phone: "+91-98XXXXXXX2",
    matchScore: 87,
    contactedBy: [],
  },
  {
    id: "d3",
    name: "Rohan Desai",
    bloodGroup: "B+",
    area: "Borivali",
    city: "Mumbai",
    status: "Temporarily Unavailable",
    available: false,
    lastDonation: "2025-07-01",
    donationsCount: 2,
    phone: "+91-98XXXXXXX3",
    matchScore: 74,
    contactedBy: [],
  },
  {
    id: "d4",
    name: "Sneha Patil",
    bloodGroup: "O-",
    area: "Thane",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-04-10",
    donationsCount: 9,
    phone: "+91-98XXXXXXX4",
    matchScore: 95,
    contactedBy: [],
  },
  {
    id: "d5",
    name: "Vikram Joshi",
    bloodGroup: "AB+",
    area: "Mulund",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-06-28",
    donationsCount: 5,
    phone: "+91-98XXXXXXX5",
    matchScore: 81,
    contactedBy: [],
  },
  {
    id: "d6",
    name: "Kavya Nair",
    bloodGroup: "A-",
    area: "Ghatkopar",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-03-15",
    donationsCount: 3,
    phone: "+91-98XXXXXXX6",
    matchScore: 78,
    contactedBy: [],
  },
  {
    id: "d7",
    name: "Arjun Kulkarni",
    bloodGroup: "B-",
    area: "Dadar",
    city: "Mumbai",
    status: "Inactive",
    available: false,
    lastDonation: "2024-12-10",
    donationsCount: 1,
    phone: "+91-98XXXXXXX7",
    matchScore: 60,
    contactedBy: [],
  },
  {
    id: "d8",
    name: "Meera Iyer",
    bloodGroup: "AB-",
    area: "Kurla",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-05-05",
    donationsCount: 6,
    phone: "+91-98XXXXXXX8",
    matchScore: 88,
    contactedBy: [],
  },
  {
    id: "d9",
    name: "Tanvi Ghosh",
    bloodGroup: "O+",
    area: "Andheri",
    city: "Mumbai",
    status: "Active",
    available: true,
    lastDonation: "2025-07-12",
    donationsCount: 11,
    phone: "+91-98XXXXXXX9",
    matchScore: 90,
    contactedBy: [],
  },
  {
    id: "d10",
    name: "Rahul Shetty",
    bloodGroup: "A+",
    area: "Bandra",
    city: "Mumbai",
    status: "Temporarily Unavailable",
    available: false,
    lastDonation: "2025-08-01",
    donationsCount: 8,
    phone: "+91-98XXXXXXX0",
    matchScore: 83,
    contactedBy: [],
  },
];

// HOSPITALS
export const hospitals: Hospital[] = [
  {
    id: "h1",
    name: "CityCare Hospital",
    area: "Andheri",
    city: "Mumbai",
    networkStatus: "Online",
    bloodBankStatus: "Critical",
    verified: true,
    requestsCoordinated: 34,
  },
  {
    id: "h2",
    name: "Lilavati Medical Centre",
    area: "Bandra",
    city: "Mumbai",
    networkStatus: "Online",
    bloodBankStatus: "Adequate",
    verified: true,
    requestsCoordinated: 21,
  },
  {
    id: "h3",
    name: "Kohinoor Hospital",
    area: "Kurla",
    city: "Mumbai",
    networkStatus: "Online",
    bloodBankStatus: "Low",
    verified: true,
    requestsCoordinated: 18,
  },
  {
    id: "h4",
    name: "Thane Civil Hospital",
    area: "Thane",
    city: "Mumbai",
    networkStatus: "Offline",
    bloodBankStatus: "Low",
    verified: true,
    requestsCoordinated: 9,
  },
  {
    id: "h5",
    name: "Jupiter Hospital",
    area: "Borivali",
    city: "Mumbai",
    networkStatus: "Online",
    bloodBankStatus: "Adequate",
    verified: true,
    requestsCoordinated: 27,
  },
];

// NGOs
export const ngos: NGO[] = [
  {
    id: "n1",
    name: "UPAY Community Network",
    area: "Andheri",
    city: "Mumbai",
    verified: true,
    activeNetwork: true,
    requestsCoordinated: 142,
    donorCount: 320,
  },
  {
    id: "n2",
    name: "Rotary Blood Foundation",
    area: "Bandra",
    city: "Mumbai",
    verified: true,
    activeNetwork: true,
    requestsCoordinated: 98,
    donorCount: 215,
  },
  {
    id: "n3",
    name: "Jeevandhara Trust",
    area: "Thane",
    city: "Mumbai",
    verified: true,
    activeNetwork: true,
    requestsCoordinated: 76,
    donorCount: 180,
  },
  {
    id: "n4",
    name: "Rakta Sewa Sangh",
    area: "Dadar",
    city: "Mumbai",
    verified: false,
    activeNetwork: false,
    requestsCoordinated: 12,
    donorCount: 55,
  },
];

// BLOOD REQUESTS
export const initialRequests: BloodRequest[] = [
  {
    id: "REQ-1024",
    hospitalId: "h1",
    hospitalName: "CityCare Hospital",
    bloodGroup: "O+",
    units: 4,
    urgency: "CRITICAL",
    status: "Donors Contacted",
    createdAt: "2026-09-16T08:30:00",
    area: "Andheri",
    patientAge: 45,
    notes: "Emergency surgery — O+ required urgently",
    verifiedBy: "UPAY Community Network",
    matchedDonors: ["d1", "d9"],
  },
  {
    id: "REQ-1025",
    hospitalId: "h2",
    hospitalName: "Lilavati Medical Centre",
    bloodGroup: "A+",
    units: 2,
    urgency: "URGENT",
    status: "Verified",
    createdAt: "2026-09-15T14:10:00",
    area: "Bandra",
    notes: "Scheduled surgery tomorrow morning",
    verifiedBy: "Rotary Blood Foundation",
    matchedDonors: ["d2", "d10"],
  },
  {
    id: "REQ-1026",
    hospitalId: "h3",
    hospitalName: "Kohinoor Hospital",
    bloodGroup: "B+",
    units: 3,
    urgency: "NORMAL",
    status: "Matching",
    createdAt: "2026-09-15T09:00:00",
    area: "Kurla",
    matchedDonors: ["d3"],
  },
  {
    id: "REQ-1027",
    hospitalId: "h1",
    hospitalName: "CityCare Hospital",
    bloodGroup: "AB-",
    units: 1,
    urgency: "URGENT",
    status: "Verification Pending",
    createdAt: "2026-09-16T10:00:00",
    area: "Andheri",
    notes: "Rare group — immediate verification needed",
  },
  {
    id: "REQ-1020",
    hospitalId: "h5",
    hospitalName: "Jupiter Hospital",
    bloodGroup: "O-",
    units: 2,
    urgency: "CRITICAL",
    status: "Fulfilled",
    createdAt: "2026-09-10T07:00:00",
    area: "Borivali",
    verifiedBy: "UPAY Community Network",
    matchedDonors: ["d4"],
    confirmedDonor: "d4",
  },
  {
    id: "REQ-1021",
    hospitalId: "h2",
    hospitalName: "Lilavati Medical Centre",
    bloodGroup: "A-",
    units: 2,
    urgency: "NORMAL",
    status: "Fulfilled",
    createdAt: "2026-09-08T11:00:00",
    area: "Bandra",
    verifiedBy: "Rotary Blood Foundation",
    confirmedDonor: "d6",
  },
  {
    id: "REQ-1022",
    hospitalId: "h3",
    hospitalName: "Kohinoor Hospital",
    bloodGroup: "B-",
    units: 1,
    urgency: "URGENT",
    status: "Donor Confirmed",
    createdAt: "2026-09-14T16:00:00",
    area: "Kurla",
    verifiedBy: "Jeevandhara Trust",
    confirmedDonor: "d7",
  },
  {
    id: "REQ-1023",
    hospitalId: "h4",
    hospitalName: "Thane Civil Hospital",
    bloodGroup: "AB+",
    units: 2,
    urgency: "NORMAL",
    status: "Donors Contacted",
    createdAt: "2026-09-13T13:00:00",
    area: "Thane",
    verifiedBy: "Jeevandhara Trust",
    matchedDonors: ["d5"],
  },
];

export const notifications: Notification[] = [
  {
    id: "notif-1",
    type: "match",
    title: "Donor Response Received",
    body: "Aarav Mehta has confirmed availability for REQ-1024 (O+, 4 units)",
    timestamp: "2026-09-16T11:30:00",
    read: false,
  },
  {
    id: "notif-2",
    type: "verified",
    title: "Request Verified",
    body: "REQ-1025 has been verified by Rotary Blood Foundation",
    timestamp: "2026-09-15T15:00:00",
    read: false,
  },
  {
    id: "notif-3",
    type: "request",
    title: "New Critical Request",
    body: "CityCare Hospital needs O+ urgently — 4 units required",
    timestamp: "2026-09-16T08:35:00",
    read: true,
  },
  {
    id: "notif-4",
    type: "system",
    title: "Network Partner Added",
    body: "Rotary Blood Foundation has joined your hospital network",
    timestamp: "2026-09-12T09:00:00",
    read: true,
  },
];

export const messages: Message[] = [
  {
    id: "msg-1",
    from: "UPAY Community Network",
    to: "CityCare Hospital",
    content:
      "REQ-1024 has been verified. We have identified 2 compatible donors and are contacting them now.",
    timestamp: "2026-09-16T09:15:00",
    read: true,
  },
  {
    id: "msg-2",
    from: "CityCare Hospital",
    to: "UPAY Community Network",
    content:
      "Thank you. Please prioritise Aarav Mehta — his match score is 92%. We need the donor by 14:00 today.",
    timestamp: "2026-09-16T09:30:00",
    read: true,
  },
  {
    id: "msg-3",
    from: "UPAY Community Network",
    to: "CityCare Hospital",
    content: "Understood. Donor has been notified. Awaiting confirmation.",
    timestamp: "2026-09-16T09:45:00",
    read: false,
  },
];

export const requestLifecycleSteps: RequestStatus[] = [
  "Created",
  "Verification Pending",
  "Verified",
  "Matching",
  "Donors Contacted",
  "Donor Confirmed",
  "Hospital Confirmation",
  "Fulfilled",
];

export const analyticsData = {
  donorAvailability: [
    { name: "Available", value: 68, color: "#1C8791" },
    { name: "Temp Unavailable", value: 19, color: "#C0D2DE" },
    { name: "Inactive", value: 13, color: "#CECFD3" },
  ],
  bloodGroupRequests: [
    { group: "O+", requests: 34 },
    { group: "A+", requests: 28 },
    { group: "B+", requests: 19 },
    { group: "AB+", requests: 12 },
    { group: "O-", requests: 16 },
    { group: "A-", requests: 10 },
    { group: "B-", requests: 8 },
    { group: "AB-", requests: 5 },
  ],
  fulfillmentRate: [
    { month: "Mar", rate: 71 },
    { month: "Apr", rate: 76 },
    { month: "May", rate: 80 },
    { month: "Jun", rate: 82 },
    { month: "Jul", rate: 85 },
    { month: "Aug", rate: 88 },
    { month: "Sep", rate: 91 },
  ],
  responseTime: [
    { month: "Mar", hours: 5.2 },
    { month: "Apr", hours: 4.8 },
    { month: "May", hours: 4.1 },
    { month: "Jun", hours: 3.8 },
    { month: "Jul", hours: 3.2 },
    { month: "Aug", hours: 2.9 },
    { month: "Sep", hours: 2.5 },
  ],
  urgencyBreakdown: [
    { urgency: "Critical", count: 23 },
    { urgency: "Urgent", count: 48 },
    { urgency: "Normal", count: 71 },
  ],
  monthlyActivity: [
    { month: "Mar", donations: 42, requests: 38 },
    { month: "Apr", donations: 55, requests: 48 },
    { month: "May", donations: 61, requests: 54 },
    { month: "Jun", donations: 70, requests: 63 },
    { month: "Jul", donations: 78, requests: 68 },
    { month: "Aug", donations: 85, requests: 74 },
    { month: "Sep", donations: 91, requests: 80 },
  ],
};
