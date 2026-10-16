import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { supabase } from "../lib/supabase"

import {
  hospitals,
  ngos,
  messages as initialMessages,
  type Donor,
  type BloodRequest,
  type Notification,
  type Message,
  type RequestStatus,
} from "../data/mockData"

type Role = "hospital" | "ngo" | "donor" | null

type RegistrationResult = {
  requiresEmailConfirmation: boolean

  documentPath?: string
}

type RegistrationDocuments = {
  ngo?: File | null

  hospital?: File | null
}

type NGORequestRow = {
  id: string

  hospital_id: string

  hospital_name: string

  blood_group: string

  units: number

  urgency: string

  status: string

  area: string | null

  department: string | null

  required_by: string | null

  latitude: number | null

  longitude: number | null

  location_address: string | null

  patient_age: number | null

  notes: string | null

  verified_by: string | null

  matched_donor: string | null

  fulfilled_at: string | null

  created_at: string
}

type EligibleRequestRow = {
  id: string

  hospital_id: string

  hospital_name: string

  blood_group: string

  units: number

  urgency: string

  status: string

  area: string | null

  required_by: string | null

  created_at: string

  verified_by: string | null

  distance_km: number | null
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return /rate limit|too many requests|email rate/i.test(error.message)
}

function parseCoordinates(value: unknown) {
  if (typeof value !== "string") return {}

  const match = value.match(
    /\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/,
  )

  if (!match) return {}

  const latitude = Number(match[1])

  const longitude = Number(match[2])

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    return {}

  return { latitude, longitude }
}

export class ProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message)

    this.name = "ProfileNotFoundError"
  }
}

export class RoleMismatchError extends Error {
  constructor(message: string) {
    super(message)

    this.name = "RoleMismatchError"
  }
}

interface AppState {
  role: Role

  currentUser: {
    id: string
    name: string
  } | null

  roleDetails: Record<string, unknown> | null

  hospitalRecordId: string | null

  donorRecordId: string | null

  updateHospitalLocation: (location: {
    latitude: number

    longitude: number

    address: string
  }) => Promise<void>

  authLoading: boolean

  hospitalRequestsLoading: boolean

  hospitalRequestsError: string | null

  requestFeedError: string | null

  donorAvailability: boolean | null

  donors: Donor[]

  requests: BloodRequest[]

  notifications: Notification[]

  notificationsError: string | null

  messages: Message[]

  signIn: (
    email: string,

    password: string,

    expectedRole: Role,
  ) => Promise<Exclude<Role, null>>

  register: (
    role: Exclude<Role, null>,

    values: Record<string, string>,

    bloodGroup: string,

    consent: boolean,

    documents?: RegistrationDocuments,
  ) => Promise<RegistrationResult>

  logout: () => void

  verifyRequest: (requestId: string) => Promise<void>

  createRequest: (
    req: Omit<BloodRequest, "id" | "createdAt" | "status">,
  ) => void

  updateRequestStatus: (
    requestId: string,
    status: RequestStatus,
  ) => Promise<void>

  refreshHospitalRequests: () => Promise<void>

  createHospitalRequest: (
    request: Omit<BloodRequest, "id" | "createdAt" | "status">,
  ) => Promise<BloodRequest>

  updateHospitalRequest: (
    requestId: string,

    status: RequestStatus,
  ) => Promise<void>

  refreshRequests: () => Promise<void>

  updateHospitalRequestDetails: (
    requestId: string,

    values: Partial<Pick<BloodRequest, "bloodGroup" | "units" | "urgency" | "area" | "department" | "requiredBy" | "patientAge" | "notes" | "latitude" | "longitude" | "locationAddress">>,
  ) => Promise<void>

  toggleDonorAvailability: (donorId: string) => void

  markNotificationRead: (id: string) => Promise<void>

  markNotificationsRead: (ids: string[]) => Promise<void>

  unreadCount: number
}

const AppContext = createContext<AppState | null>(null)

const VALID_ROLES = new Set(["hospital", "ngo", "donor"])

const getRoleTable = (role: Exclude<Role, null>) =>
  role === "donor" ? "donors" : role === "ngo" ? "ngos" : "hospitals"

const getUserDisplayName = (
  profileRole: Exclude<Role, null>,

  values: Record<string, string>,
) => {
  if (profileRole === "hospital" || profileRole === "ngo") {
    return (
      values.contactPerson ||
      values.fullName ||
      values.organisationName ||
      values.hospitalName ||
      "User"
    )
  }

  return values.fullName || "User"
}

export async function syncCurrentUserProfile(userId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) throw userError

  const authUser = userData.user

  if (!authUser) throw new Error("Authentication is required.")
  if (authUser.id !== userId)
    throw new Error("The authenticated account does not match this profile.")

  const metadata = authUser.user_metadata ?? {}

  const profileRole = metadata.role ?? ""

  const requestedRole =
    profileRole && VALID_ROLES.has(profileRole as string)
      ? profileRole as Exclude<Role, null>
      : null

  const { data: existingProfile, error: profileError } = await supabase

    .from("profiles")

    .select("*")

    .eq("id", userId)

    .maybeSingle()

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError
  }

  const resolvedRole = existingProfile?.role || requestedRole

  if (!resolvedRole || !VALID_ROLES.has(resolvedRole)) {
    throw new Error("Your account has an invalid role.")
  }

  const fullName =
    existingProfile?.full_name ||
    metadata.full_name ||
    metadata.contact_person ||
    "User"

  const email = existingProfile?.email || authUser.email || ""

  const phone = existingProfile?.phone || metadata.phone || null

  const { error: profileUpsertError } = await supabase

    .from("profiles")

    .upsert(
      { id: userId, role: resolvedRole, full_name: fullName, email, phone },

      { onConflict: "id" },
    )

  if (profileUpsertError) {
    console.error("PROFILE UPSERT ERROR", profileUpsertError)

    throw new Error(
      "Registration failed while saving your profile. Please try again.",
    )
  }

  const roleTable = getRoleTable(resolvedRole)

  const { data: roleRow, error: roleLookupError } = await supabase

    .from(roleTable)

    .select("*")

    .eq("user_id", userId)

    .maybeSingle()

  if (roleLookupError && roleLookupError.code !== "PGRST116") {
    throw roleLookupError
  }

  if (roleRow) {
    return {
      role: resolvedRole,
      name: fullName,
      roleDetails: roleRow as Record<string, unknown>,
    }
  }

  const rolePayload: Record<string, unknown> = {
    id: userId,

    user_id: userId,

    email,

    phone,
  }

  if (resolvedRole === "donor") {
    const bloodGroup = metadata.blood_group ?? ""

    const donorName = metadata.full_name || fullName || "User"

    if (!bloodGroup) {
      throw new Error(
        "Additional donor registration details are required before you can continue.",
      )
    }

    const donorCoordinates = parseCoordinates(metadata.map_location)

    Object.assign(rolePayload, {
      full_name: donorName,

      age: metadata.age ? Number(metadata.age) : null,

      category: metadata.category || null,

      gender: metadata.gender || null,

      aadhaar: metadata.aadhaar || null,

      blood_group: bloodGroup,

      city: metadata.city || null,

      map_location: metadata.map_location || null,

      approximate_latitude:
        donorCoordinates.latitude == null
          ? null
          : Number(donorCoordinates.latitude.toFixed(2)),

      approximate_longitude:
        donorCoordinates.longitude == null
          ? null
          : Number(donorCoordinates.longitude.toFixed(2)),

      radius: metadata.radius
        ? Number.parseInt(String(metadata.radius), 10)
        : null,

      consent: Boolean(metadata.consent),

      registration_certificate:
        metadata.registration_certificate ||
        metadata.registration_certificate_url ||
        null,
    })
  }

  if (resolvedRole === "ngo") {
    const organisationName =
      typeof metadata.organisation_name === "string"
        ? metadata.organisation_name.trim()
        : ""

    if (!organisationName) {
      throw new Error(
        "Additional NGO registration details are required before you can continue.",
      )
    }

    const ngoCoordinates = parseCoordinates(metadata.map_location)

    Object.assign(rolePayload, {
      organisation_name: organisationName,

      registration_number: metadata.registration_number || null,

      organisation_type: metadata.organisation_type || null,

      contact_person: metadata.contact_person || null,

      street_address: metadata.street_address || null,

      city: metadata.city || null,

      map_location: metadata.map_location || null,

      latitude: ngoCoordinates.latitude ?? null,

      longitude: ngoCoordinates.longitude ?? null,

      areas_served: metadata.areas_served || null,

      registration_certificate:
        metadata.registration_certificate ||
        metadata.registration_certificate_url ||
        null,

      registration_certificate_url:
        metadata.registration_certificate ||
        metadata.registration_certificate_url ||
        null,
    })
  }

  if (resolvedRole === "hospital") {
    const hospitalName =
      typeof metadata.hospital_name === "string"
        ? metadata.hospital_name.trim()
        : ""

    if (!hospitalName) {
      throw new Error(
        "Additional hospital registration details are required before you can continue.",
      )
    }

    Object.assign(rolePayload, {
      hospital_name: hospitalName,

      hospital_type: metadata.hospital_type || null,

      registration_id: metadata.registration_id || null,

      contact_person: metadata.contact_person || null,

      street_address: metadata.street_address || null,

      city: metadata.city || null,

      map_location: metadata.map_location || null,

      blood_bank: metadata.blood_bank || null,

      operating_hours: metadata.operating_hours || null,

      registration_certificate:
        metadata.registration_certificate ||
        metadata.registration_certificate_url ||
        null,

      registration_certificate_url:
        metadata.registration_certificate ||
        metadata.registration_certificate_url ||
        null,
    })
  }

  const { data: insertedRole, error: roleInsertError } = await supabase
    .from(roleTable)

    .upsert(rolePayload, { onConflict: "user_id" })
    .select("*")
    .single()

  if (roleInsertError) {
    console.error(
      `${resolvedRole.toUpperCase()} ROLE INSERT ERROR`,

      roleInsertError,
    )

    throw new Error(
      "Registration failed while saving your profile. Please try again.",
    )
  }

  return {
    role: resolvedRole,
    name: fullName,
    roleDetails: insertedRole as Record<string, unknown>,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null)

  const [currentUser, setCurrentUser] = useState<{
    id: string

    name: string
  } | null>(null)

  const [roleDetails, setRoleDetails] =
    useState<Record<string, unknown> | null>(null)

  const hospitalRecordId =
    role === "hospital" &&
    currentUser?.id &&
    roleDetails?.user_id === currentUser.id &&
    typeof roleDetails.id === "string"
      ? roleDetails.id
      : null
  const donorRecordId =
    role === "donor" &&
    currentUser?.id &&
    roleDetails?.user_id === currentUser.id &&
    typeof roleDetails.id === "string"
      ? roleDetails.id
      : null

  const [authLoading, setAuthLoading] = useState(true)

  const [hospitalRequestsLoading, setHospitalRequestsLoading] = useState(true)

  const [hospitalRequestsError, setHospitalRequestsError] =
    useState<string | null>(null)

  const [donorAvailability, setDonorAvailability] = useState<boolean | null>(
    null,
  )

  const [requestFeedError, setRequestFeedError] = useState<string | null>(null)

  const [donorList, setDonorList] = useState<Donor[]>([])

  const [requestList, setRequestList] = useState<BloodRequest[]>([])

  const [notifList, setNotifList] = useState<Notification[]>([])

  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  )

  const [msgList] = useState(initialMessages)

  const refreshHospitalRequests = async () => {
    if (!currentUser?.id) return
    if (!hospitalRecordId) {
      const error = new Error(
        "Your hospital record is not linked to this account. Complete hospital registration before loading requests.",
      )
      setHospitalRequestsError(error.message)
      setHospitalRequestsLoading(false)
      throw error
    }

    setHospitalRequestsLoading(true)

    setHospitalRequestsError(null)

    const { data, error } = await supabase

      .from("blood_requests")

      .select("*")

      .eq("hospital_id", hospitalRecordId)

      .order("created_at", { ascending: false })

    if (error) {
      setHospitalRequestsError(error.message)

      setHospitalRequestsLoading(false)

      throw error
    }

    const requestIds = (data ?? []).map((request) => request.id)

    const responseResult = requestIds.length
      ? await supabase

          .from("donor_responses")

          .select("request_id,donor_id,status")

          .in("request_id", requestIds)
      : { data: [], error: null }

    if (responseResult.error) {
      setHospitalRequestsError(responseResult.error.message)

      setHospitalRequestsLoading(false)

      throw responseResult.error
    }

    const responsesByRequest = new Map<string, {
      donorId: string

      status: string
    }[]>()
    ;(responseResult.data ?? []).forEach((response) => {
      const current = responsesByRequest.get(response.request_id) ?? []

      current.push({ donorId: response.donor_id, status: response.status })

      responsesByRequest.set(response.request_id, current)
    })

    const hospitalRequests: BloodRequest[] = (data ?? []).map((request) => ({
      id: request.id,

      hospitalId: request.hospital_id,

      hospitalName:
        typeof roleDetails?.hospital_name === "string"
          ? roleDetails.hospital_name
          : currentUser.name,

      bloodGroup: request.blood_group as BloodRequest["bloodGroup"],

      units: request.units,

      urgency: request.urgency as BloodRequest["urgency"],

      status: request.status as RequestStatus,

      createdAt: request.created_at,

      fulfilledAt: request.fulfilled_at ?? undefined,

      area: request.area ?? "",

      department: request.department ?? undefined,

      requiredBy: request.required_by ?? undefined,

      latitude: request.latitude ?? undefined,

      longitude: request.longitude ?? undefined,

      locationAddress: request.location_address ?? undefined,

      patientAge: request.patient_age ?? undefined,

      notes: request.notes ?? undefined,

      matchedDonors: [
        ...new Set([
          ...(request.matched_donor ? [request.matched_donor] : []),

          ...(responsesByRequest.get(request.id) ?? [])

            .filter((response) => response.status !== "Cancelled")

            .map((response) => response.donorId),
        ]),
      ],
    }))

    setRequestList(hospitalRequests)

    setHospitalRequestsLoading(false)
  }

  const refreshNGORequests = async () => {
    if (!currentUser?.id) return

    setRequestFeedError(null)

    const { data, error } = await supabase.rpc("get_ngo_blood_requests")

    if (error) {
      setRequestFeedError(error.message)

      throw error
    }

    const rows: NGORequestRow[] = data ?? []

    const ngoRequests: BloodRequest[] = rows.map((request) => ({
      id: request.id,

      hospitalId: request.hospital_id,

      hospitalName: request.hospital_name,

      bloodGroup: request.blood_group as BloodRequest["bloodGroup"],

      units: request.units,

      urgency: request.urgency as BloodRequest["urgency"],

      status: request.status as RequestStatus,

      createdAt: request.created_at,

      fulfilledAt: request.fulfilled_at ?? undefined,

      area: request.area ?? "",

      department: request.department ?? undefined,

      requiredBy: request.required_by ?? undefined,

      latitude: request.latitude ?? undefined,

      longitude: request.longitude ?? undefined,

      locationAddress: request.location_address ?? undefined,

      patientAge: request.patient_age ?? undefined,

      notes: request.notes ?? undefined,

      verifiedBy:
        request.verified_by == null
          ? undefined
          : request.verified_by === currentUser.id
            ? currentUser.name
            : "Verified NGO",

      matchedDonors: request.matched_donor ? [request.matched_donor] : [],
    }))

    setRequestList(ngoRequests)
  }

  useEffect(() => {
    if (!currentUser?.id) {
      setRequestList([])

      setRequestFeedError(null)

      return
    }

    const refresh = () => {
      if (role === "hospital") {
        void refreshHospitalRequests().catch((error: unknown) => {
          console.error("Unable to load hospital requests:", error)
        })
      } else if (role === "ngo") {
        void refreshNGORequests().catch((error: unknown) => {
          console.error("Unable to load NGO requests:", error)
        })
      } else if (role === "donor") {
        void loadDonorRequests().catch((error: unknown) => {
          console.error("Unable to load eligible donor requests:", error)
        })
      }
    }

    refresh()

    const interval = window.setInterval(refresh, 30000)

    return () => window.clearInterval(interval)
  }, [role, currentUser?.id, hospitalRecordId])

  useEffect(() => {
    if (!currentUser?.id) return

    void loadNotifications(currentUser.id)

    const interval = window.setInterval(() => {
      void loadNotifications(currentUser.id)
    }, 30000)

    return () => window.clearInterval(interval)
  }, [currentUser?.id])

  const createHospitalRequest = async (
    request: Omit<BloodRequest, "id" | "createdAt" | "status">,
  ) => {
    if (!currentUser?.id || role !== "hospital")
      throw new Error("Sign in to a hospital account to post a request.")
    if (!hospitalRecordId) {
      throw new Error(
        "Your hospital profile is incomplete or not linked to this account. Ask an administrator to restore the hospital record before submitting requests.",
      )
    }

    const { data, error } = await supabase

      .from("blood_requests")

      .insert({
        hospital_id: hospitalRecordId,

        blood_group: request.bloodGroup,

        units: request.units,

        urgency: request.urgency,

        area: request.area,

        patient_age: request.patientAge ?? null,

        notes: request.notes ?? null,

        department: request.department ?? null,

        required_by: request.requiredBy ?? null,

        latitude: request.latitude ?? null,

        longitude: request.longitude ?? null,

        location_address: request.locationAddress ?? null,

        status: "Verification Pending",
      })

      .select("*")

      .single()

    if (error) {
      console.error("Unable to create hospital blood request:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    const created: BloodRequest = {
      ...request,

      id: data.id,

      hospitalId: data.hospital_id,

      hospitalName:
        typeof roleDetails?.hospital_name === "string"
          ? roleDetails.hospital_name
          : currentUser.name,

      createdAt: data.created_at,

      fulfilledAt: data.fulfilled_at ?? undefined,

      latitude: data.latitude ?? undefined,

      longitude: data.longitude ?? undefined,

      locationAddress: data.location_address ?? undefined,

      status: data.status as RequestStatus,

      matchedDonors: [],
    }

    setRequestList((current) => [
      created,

      ...current.filter((item) => item.id !== created.id),
    ])

    return created
  }

  const updateHospitalRequest = async (
    requestId: string,

    status: RequestStatus,
  ) => {
    if (!currentUser?.id || role !== "hospital")
      throw new Error("Sign in to a hospital account to update a request.")
    if (!hospitalRecordId)
      throw new Error("Your hospital record is not linked to this account.")

    const { data, error } = await supabase

      .from("blood_requests")

      .update({
        status,

        fulfilled_at: status === "Fulfilled" ? new Date().toISOString() : null,
      })

      .eq("id", requestId)

      .eq("hospital_id", hospitalRecordId)

      .select("*")

      .single()

    if (error) throw error

    setRequestList((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,

              status: data.status as RequestStatus,

              fulfilledAt: data.fulfilled_at ?? undefined,
            }
          : request,
      ),
    )
  }

  const updateHospitalRequestDetails = async (
    requestId: string,

    values: Partial<Pick<BloodRequest, "bloodGroup" | "units" | "urgency" | "area" | "department" | "requiredBy" | "patientAge" | "notes" | "latitude" | "longitude" | "locationAddress">>,
  ) => {
    if (!currentUser?.id || role !== "hospital")
      throw new Error("Sign in to a hospital account to edit a request.")
    if (!hospitalRecordId)
      throw new Error("Your hospital record is not linked to this account.")

    const { data, error } = await supabase

      .from("blood_requests")

      .update({
        ...(values.bloodGroup !== undefined && {
          blood_group: values.bloodGroup,
        }),

        ...(values.units !== undefined && { units: values.units }),

        ...(values.urgency !== undefined && { urgency: values.urgency }),

        ...(values.area !== undefined && { area: values.area }),

        ...(values.department !== undefined && {
          department: values.department,
        }),

        ...(values.requiredBy !== undefined && {
          required_by: values.requiredBy || null,
        }),

        ...(values.patientAge !== undefined && {
          patient_age: values.patientAge,
        }),

        ...(values.notes !== undefined && { notes: values.notes }),

        ...(values.latitude !== undefined && { latitude: values.latitude }),

        ...(values.longitude !== undefined && { longitude: values.longitude }),

        ...(values.locationAddress !== undefined && {
          location_address: values.locationAddress,
        }),
      })

      .eq("id", requestId)

      .eq("hospital_id", hospitalRecordId)

      .select("*")

      .single()

    if (error) throw error

    setRequestList((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,

              bloodGroup: data.blood_group as BloodRequest["bloodGroup"],

              units: data.units,

              urgency: data.urgency as BloodRequest["urgency"],

              area: data.area ?? "",

              department: data.department ?? undefined,

              requiredBy: data.required_by ?? undefined,

              patientAge: data.patient_age ?? undefined,

              notes: data.notes ?? undefined,

              latitude: data.latitude ?? undefined,

              longitude: data.longitude ?? undefined,

              locationAddress: data.location_address ?? undefined,
            }
          : request,
      ),
    )
  }

  const updateHospitalLocation = async (location: {
    latitude: number

    longitude: number

    address: string
  }) => {
    if (!currentUser?.id)
      throw new Error("Sign in to update your hospital location.")

    const { error } = await supabase

      .from("hospitals")

      .update({
        latitude: location.latitude,

        longitude: location.longitude,

        location_address: location.address,
      })

      .eq("user_id", currentUser.id)

    if (error) throw error

    setRoleDetails((current) =>
      current
        ? {
            ...current,

            latitude: location.latitude,

            longitude: location.longitude,

            location_address: location.address,

            map_location: `${location.address} (${location.latitude}, ${location.longitude})`,
          }
        : current,
    )
  }

  const loadProfile = async (userId: string): Promise<{
    role: Exclude<Role, null>

    name: string
  }> => {
    const { data: profile, error: profileError } = await supabase

      .from("profiles")

      .select("*")

      .eq("id", userId)

      .maybeSingle()

    if (profileError) {
      if (profileError.code === "PGRST116") {
        const repairedProfile = await syncCurrentUserProfile(userId).catch(
          (error) => {
            throw new ProfileNotFoundError(
              error instanceof Error && error.message.includes("Additional")
                ? error.message
                : "Your profile was not found.",
            )
          },
        )

        setRoleState(repairedProfile.role)

        setCurrentUser({ id: userId, name: repairedProfile.name })

        setRoleDetails(repairedProfile.roleDetails)

        return repairedProfile
      }

      console.error("PROFILE ERROR", profileError)

      throw profileError
    }

    if (!profile) {
      const repairedProfile = await syncCurrentUserProfile(userId).catch(
        (error) => {
          throw new ProfileNotFoundError(
            error instanceof Error && error.message.includes("Additional")
              ? error.message
              : "Your profile was not found.",
          )
        },
      )

      setRoleState(repairedProfile.role)

      setCurrentUser({ id: userId, name: repairedProfile.name })

      setRoleDetails(repairedProfile.roleDetails)

      return repairedProfile
    }

    if (!profile.role || !VALID_ROLES.has(profile.role)) {
      throw new Error("Your account has an invalid role.")
    }

    setRoleState(profile.role)

    setCurrentUser({ id: profile.id, name: profile.full_name })

    const table = getRoleTable(profile.role)

    const { data: details, error: detailsError } = await supabase

      .from(table)

      .select("*")

      .eq("user_id", userId)

      .maybeSingle()

    if (detailsError) {
      console.error("Unable to load account role record:", detailsError)
      throw detailsError
    }

    let roleDetails = details as Record<string, unknown> | null
    if (!roleDetails) {
      const repairedProfile = await syncCurrentUserProfile(userId)
      if (repairedProfile.role !== profile.role) {
        throw new Error("The role record does not match the account role.")
      }
      roleDetails = repairedProfile.roleDetails
    }
    setRoleDetails(roleDetails)

    void loadNotifications(userId)

    return { role: profile.role, name: profile.full_name }
  }

  const loadDonorDetails = async (userId: string, profileName: string) => {
    const { data: donor, error: donorError } = await supabase

      .from("donors")

      .select("*")

      .eq("user_id", userId)

      .maybeSingle()

    if (donorError) {
      console.warn("DONOR ERROR", donorError)

      return
    }

    if (!donor) {
      console.info("DONOR INFO: donor profile details are not available yet.")

      return
    }

    setDonorAvailability(donor.available ?? false)

    setDonorList((current) => [
      ...current.filter((item) => item.id !== userId),

      {
        id: donor.id,

        name: profileName,

        bloodGroup: donor.blood_group as Donor["bloodGroup"],

        area: "",

        city: "",

        status: donor.available ? "Active" : "Temporarily Unavailable",

        available: donor.available,

        lastDonation: donor.last_donation_date ?? "Not recorded",

        donationsCount: donor.donations_count,

        phone: "",

        contactedBy: [],
      },
    ])
  }

  const loadDonorRequests = async () => {
    if (!currentUser?.id) return

    setRequestFeedError(null)

    const { data, error } = await supabase.rpc("get_eligible_blood_requests")

    if (error) {
      setRequestFeedError(error.message)

      throw error
    }

    const rows: EligibleRequestRow[] = data ?? []

    const donorRequests: BloodRequest[] = rows.map((request) => ({
      id: request.id,

      hospitalId: request.hospital_id,

      hospitalName: request.hospital_name,

      bloodGroup: request.blood_group as BloodRequest["bloodGroup"],

      units: request.units,

      urgency: request.urgency as BloodRequest["urgency"],

      status: request.status as BloodRequest["status"],

      createdAt: request.created_at,

      area: request.area ?? "Nearby",

      requiredBy: request.required_by ?? undefined,

      distanceKm: request.distance_km ?? undefined,

      verifiedBy: request.verified_by ? "Verified NGO" : undefined,

      matchedDonors: [],
    }))

    setRequestList(donorRequests)
  }

  const refreshRequests = async () => {
    if (role === "hospital") return refreshHospitalRequests()

    if (role === "ngo") return refreshNGORequests()

    if (role === "donor") return loadDonorRequests()
  }

  const loadNotifications = async (userId: string) => {
    const { data, error } = await supabase

      .from("notifications")

      .select("*")

      .eq("user_id", userId)

      .order("created_at", { ascending: false })

    if (error) {
      console.warn("NOTIFICATIONS ERROR", error)

      setNotificationsError(error.message)

      return
    }

    setNotificationsError(null)

    setNotifList(
      (data ?? []).map((notification) => ({
        id: notification.id,

        type: notification.type as Notification["type"],

        title: notification.title,

        body: notification.body,

        timestamp: notification.created_at,

        read: notification.read,
      })),
    )
  }

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (error)
        console.error("Unable to restore Supabase session:", error.message)

      if (mounted && data.session) {
        try {
          const restoredProfile = await loadProfile(data.session.user.id)

          if (restoredProfile.role === "donor") {
            void loadDonorDetails(data.session.user.id, restoredProfile.name)
          }
        } catch (profileError) {
          console.error("Unable to load account profile:", profileError)

          await supabase.auth.signOut()
        }
      }

      if (mounted) setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setRoleState(null)

          setCurrentUser(null)

          setRoleDetails(null)

          setRequestList([])

          setDonorList([])

          setNotifList([])

          setRequestFeedError(null)

          setNotificationsError(null)

          setAuthLoading(false)
        }
      },
    )

    return () => {
      mounted = false

      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    email: string,

    password: string,

    expectedRole: Role,
  ) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),

      password,
    })

    if (error) throw error

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) throw userError

    const user = userData.user

    if (!user) throw new Error("Supabase did not return an authenticated user.")

    console.log("AUTH SUCCESS", { userId: user.id, email: user.email })

    const actualProfile = await loadProfile(user.id)

    const actualRole = actualProfile.role

    if (expectedRole && actualRole !== expectedRole) {
      await supabase.auth.signOut()

      setRoleState(null)

      setCurrentUser(null)

      throw new RoleMismatchError(
        "The selected role does not match your account.",
      )
    }

    if (actualRole === "donor") {
      void loadDonorDetails(user.id, actualProfile.name)
    }

    return actualRole
  }

  const register = async (
    selectedRole: Exclude<Role, null>,

    values: Record<string, string>,

    selectedBloodGroup: string,

    consent: boolean,

    documents: RegistrationDocuments = {},
  ) => {
    const email = values.email?.trim()

    const password = values.password

    if (!email || !password) throw new Error("Email and password are required.")

    if (selectedRole === "hospital" && !values.hospitalName?.trim()) {
      throw new Error("Enter the hospital's registered name.")
    }

    if (selectedRole === "ngo" && !values.organisationName?.trim()) {
      throw new Error("Enter the NGO's registered organisation name.")
    }

    if (password !== values.confirmPassword)
      throw new Error("Passwords do not match.")

    const appropriateName = getUserDisplayName(selectedRole, values)

    if (!appropriateName || appropriateName === "User") {
      throw new Error("A name is required.")
    }

    let response

    try {
      response = await supabase.auth.signUp({
        email,

        password,

        options: {
          data: {
            role: selectedRole,

            full_name: appropriateName,

            phone: values.phone || null,

            hospital_name: values.hospitalName || null,

            hospital_type: values.hospitalType || null,

            registration_id: values.registrationId || null,

            contact_person: values.contactPerson || null,

            blood_bank: values.bloodBank || null,

            operating_hours: values.operatingHours || null,

            organisation_name: values.organisationName || null,

            registration_number: values.registrationNumber || null,

            organisation_type: values.organisationType || null,

            areas_served: values.areasServed || null,

            street_address: values.streetAddress || null,

            city: values.city || null,

            map_location: values.mapLocation || null,

            blood_group: selectedBloodGroup || null,

            age: values.age || null,

            category: values.category || null,

            gender: values.gender || null,

            aadhaar: values.aadhaar || null,

            radius: values.radius || null,

            consent,
          },
        },
      })
    } catch (error) {
      if (isRateLimitError(error)) {
        throw new Error(
          "Supabase email rate limit reached. Please wait before trying again.",
        )
      }

      throw error
    }

    if (response.error) {
      if (isRateLimitError(response.error)) {
        throw new Error(
          "Supabase email rate limit reached. Please wait before trying again.",
        )
      }

      throw response.error
    }

    const user = response.data.user

    if (!user) throw new Error("Supabase did not return a user.")

    console.log("AUTH USER:", user.id)

    console.log("SELECTED ROLE:", selectedRole)

    let documentPath: string | undefined

    const document =
      selectedRole === "ngo"
        ? documents.ngo
        : selectedRole === "hospital"
          ? documents.hospital
          : null

    if (document && response.data.session) {
      const bucket = "registration-certificates"

      const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, "_")

      documentPath = `${user.id}/registration-certificate/${safeName}`

      const { error: uploadError } = await supabase.storage

        .from(bucket)

        .upload(documentPath, document, {
          upsert: true,

          contentType: document.type,
        })

      if (uploadError) {
        console.error("CERTIFICATE UPLOAD ERROR", uploadError)

        throw new Error(
          "Registration failed while saving your profile. Please try again.",
        )
      }
    }

    try {
      const profilePayload = {
        id: user.id,

        role: selectedRole,

        full_name: appropriateName,

        email,

        phone: values.phone || null,
      }

      const { data: profileResult, error: profileError } = await supabase

        .from("profiles")

        .upsert(profilePayload, { onConflict: "id" })

        .select()

      console.log("PROFILE INSERT:", profileResult)

      if (profileError) {
        console.error("PROFILE INSERT ERROR:", profileError)

        throw profileError
      }

      if (selectedRole === "donor") {
        const donorCoordinates = parseCoordinates(values.mapLocation)

        const donorPayload = {
          id: user.id,

          user_id: user.id,

          full_name: values.fullName || appropriateName,

          email,

          phone: values.phone || null,

          age: values.age ? Number(values.age) : null,

          category: values.category || null,

          gender: values.gender || null,

          aadhaar: values.aadhaar || null,

          blood_group: selectedBloodGroup || null,

          city: values.city || null,

          map_location: values.mapLocation || null,

          approximate_latitude:
            donorCoordinates.latitude == null
              ? null
              : Number(donorCoordinates.latitude.toFixed(2)),

          approximate_longitude:
            donorCoordinates.longitude == null
              ? null
              : Number(donorCoordinates.longitude.toFixed(2)),

          radius: values.radius ? Number.parseInt(values.radius, 10) : null,

          consent,

          available: true,

          registration_certificate: documentPath || null,
        }

        const { data: donorResult, error: donorError } = await supabase

          .from("donors")

          .upsert(donorPayload, { onConflict: "user_id" })

          .select()

        console.log("DONOR INSERT:", donorResult)

        if (donorError) {
          console.error("DONOR INSERT ERROR:", donorError)

          throw donorError
        }
      }

      if (selectedRole === "ngo") {
        const organisationName = values.organisationName?.trim() ?? ""

        const registrationNumber = values.registrationNumber?.trim() ?? ""

        const contactPerson = values.contactPerson?.trim() ?? ""

        const ngoCoordinates = parseCoordinates(values.mapLocation)

        if (registrationNumber) {
          const { data: existingNgo, error: existingNgoError } = await supabase

            .from("ngos")

            .select("id, user_id")

            .eq("registration_number", registrationNumber)

            .maybeSingle()

          if (existingNgoError && existingNgoError.code !== "PGRST116") {
            throw existingNgoError
          }

          if (existingNgo && existingNgo.user_id !== user.id) {
            throw new Error("This registration number is already registered.")
          }
        }

        const ngoPayload = {
          id: user.id,

          user_id: user.id,

          organisation_name: organisationName,

          registration_number: registrationNumber,

          organisation_type: values.organisationType || null,

          contact_person: contactPerson,

          email,

          phone: values.phone || null,

          street_address: values.streetAddress || null,

          city: values.city || null,

          map_location: values.mapLocation || null,

          latitude: ngoCoordinates.latitude ?? null,

          longitude: ngoCoordinates.longitude ?? null,

          areas_served: values.areasServed || null,

          registration_certificate: documentPath || null,

          registration_certificate_url: documentPath || null,
        }

        const { data: ngoResult, error: ngoError } = await supabase

          .from("ngos")

          .upsert(ngoPayload, { onConflict: "user_id" })

          .select()

        console.log("NGO INSERT:", ngoResult)

        if (ngoError) {
          console.error("NGO INSERT ERROR:", ngoError)

          throw ngoError
        }
      }

      if (selectedRole === "hospital") {
        const hospitalCoordinates = parseCoordinates(values.mapLocation)

        const hospitalPayload = {
          id: user.id,

          user_id: user.id,

          hospital_name: values.hospitalName.trim(),

          hospital_type: values.hospitalType || null,

          registration_id: values.registrationId || null,

          contact_person: values.contactPerson || null,

          phone: values.phone || null,

          email,

          street_address: values.streetAddress || null,

          city: values.city || null,

          map_location: values.mapLocation || null,

          latitude: hospitalCoordinates.latitude ?? null,

          longitude: hospitalCoordinates.longitude ?? null,

          location_address: values.mapLocation
            ? values.mapLocation

                .replace(
                  /\s*\(?\s*-?\d{1,2}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*\)?\s*$/,

                  "",
                )

                .trim()
            : null,

          blood_bank: values.bloodBank || null,

          operating_hours: values.operatingHours || null,

          registration_certificate: documentPath || null,
        }

        const { data: hospitalResult, error: hospitalError } = await supabase

          .from("hospitals")

          .upsert(hospitalPayload, { onConflict: "user_id" })

          .select()

        console.log("HOSPITAL INSERT:", hospitalResult)

        if (hospitalError) {
          console.error("HOSPITAL INSERT ERROR:", hospitalError)

          if (
            hospitalError.code === "23505" &&
            hospitalError.message.includes("registration_id")
          ) {
            throw new Error(
              "This hospital registration ID is already registered.",
            )
          }

          throw hospitalError
        }
      }
    } catch (error) {
      console.error("REGISTRATION DATABASE ERROR:", error)

      throw error
    }

    if (!response.data.session) {
      return { requiresEmailConfirmation: true, documentPath }
    }

    const { data: registeredRoleDetails, error: registeredRoleError } =
      await supabase
        .from(getRoleTable(selectedRole))
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
    if (registeredRoleError) {
      console.error("Unable to load newly registered role record:", {
        code: registeredRoleError.code,
        message: registeredRoleError.message,
      })
      throw registeredRoleError
    }
    if (!registeredRoleDetails) {
      throw new Error(
        "Registration completed, but the organisation record was not created. Contact support before posting requests.",
      )
    }

    setRoleState(selectedRole)

    setCurrentUser({ id: user.id, name: appropriateName })
    setRoleDetails(registeredRoleDetails as Record<string, unknown>)

    return { requiresEmailConfirmation: false, documentPath }
  }

  const logout = () => {
    void supabase.auth.signOut()

    setRoleState(null)

    setCurrentUser(null)

    setRoleDetails(null)

    setDonorAvailability(null)

    setRequestList([])

    setDonorList([])

    setNotifList([])

    setRequestFeedError(null)

    setNotificationsError(null)
  }

  const verifyRequest = async (requestId: string) => {
    if (role !== "ngo" || !currentUser?.id)
      throw new Error("Sign in as an NGO to verify a request.")

    const { error } = await supabase.rpc("verify_blood_request", {
      p_request_id: requestId,
    })

    if (error) throw error

    setRequestList((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,

              status: "Verified",

              verifiedBy: currentUser.name,
            }
          : request,
      ),
    )
  }

  const createRequest = (
    req: Omit<BloodRequest, "id" | "createdAt" | "status">,
  ) => {
    const newReq: BloodRequest = {
      ...req,

      id: `REQ-${1030 + requestList.length}`,

      createdAt: new Date().toISOString(),

      status: "Verification Pending",
    }

    setRequestList((prev) => [newReq, ...prev])
  }

  const updateRequestStatus = async (
    requestId: string,

    status: RequestStatus,
  ) => {
    if (role === "hospital") {
      await updateHospitalRequest(requestId, status)

      return
    }

    if (role !== "ngo" || status !== "Fulfilled")
      throw new Error("This role cannot update the request to that status.")

    const { error } = await supabase.rpc("complete_ngo_blood_request", {
      p_request_id: requestId,
    })

    if (error) throw error

    setRequestList((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,

              status: "Fulfilled",

              fulfilledAt: new Date().toISOString(),
            }
          : request,
      ),
    )
  }

  const toggleDonorAvailability = (donorId: string) => {
    const current =
      donorAvailability ??
      donorList.find((donor) => donor.id === donorId)?.available ??
      false

    const next = !current

    setDonorAvailability(next)

    void supabase

      .from("donors")

      .update({ available: next })

      .eq("user_id", donorId)

      .select("id")

      .maybeSingle()

      .then(({ error }) => {
        if (error) console.warn("DONOR AVAILABILITY ERROR", error)
      })

    setDonorList((prev) =>
      prev.map((donor) =>
        donor.id === donorId
          ? {
              ...donor,

              available: next,

              status: next ? "Active" : "Temporarily Unavailable",
            }
          : donor,
      ),
    )
  }

  const markNotificationRead = async (id: string) => {
    if (!currentUser?.id) throw new Error("Sign in to update notifications.")

    const { error } = await supabase

      .from("notifications")

      .update({ read: true })

      .eq("id", id)

      .eq("user_id", currentUser.id)

    if (error) throw error

    setNotifList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  const markNotificationsRead = async (ids: string[]) => {
    if (!currentUser?.id) throw new Error("Sign in to update notifications.")

    if (!ids.length) return

    const { error } = await supabase

      .from("notifications")

      .update({ read: true })

      .in("id", ids)

      .eq("user_id", currentUser.id)

    if (error) throw error

    const readIds = new Set(ids)

    setNotifList((prev) =>
      prev.map((notification) =>
        readIds.has(notification.id)
          ? { ...notification, read: true }
          : notification,
      ),
    )
  }

  const unreadCount = notifList.filter((n) => !n.read).length

  return (
    <AppContext.Provider
      value={{
        role,

        currentUser,

        roleDetails,

        hospitalRecordId,

        donorRecordId,

        authLoading,

        hospitalRequestsLoading,

        hospitalRequestsError,

        requestFeedError,

        donorAvailability,

        donors: donorList,

        requests: requestList,

        notifications: notifList,

        notificationsError,

        messages: msgList,

        signIn,

        register,

        logout,

        verifyRequest,

        createRequest,

        updateRequestStatus,

        refreshHospitalRequests,

        createHospitalRequest,

        updateHospitalRequest,

        refreshRequests,

        updateHospitalRequestDetails,

        updateHospitalLocation,

        toggleDonorAvailability,

        markNotificationRead,

        markNotificationsRead,

        unreadCount,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)

  if (!ctx) throw new Error("useApp must be within AppProvider")

  return ctx
}

export { hospitals, ngos }
