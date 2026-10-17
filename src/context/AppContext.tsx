import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { supabase } from "../lib/supabase"
import {
  loadHospitalRequests,
  resolveHospitalRecordId,
} from "./hospitalRequestLoading"
import { countValidUniqueDonorResponses } from "../lib/bloodRequestFulfillment"

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

  hospital_contact_person: string | null

  hospital_contact_phone: string | null

  hospital_contact_email: string | null

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

type HospitalFulfillmentSnapshot = {
  request_id: string
  valid_unique_response_count: number
  verified_donation_count: number
  required_units: number
  donation_completed_and_verified: boolean
  fulfillment_qualified: boolean
  donation_completed_at: string | null
  donation_verified_by: string | null
  fulfillment_review_required: boolean
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

  updateHospitalProfile: (profile: {
    hospital_name: string
    hospital_type: string
    street_address: string
    city: string
    phone: string
    email: string
  }) => Promise<void>

  updateDonorProfile: (profile: {
    name: string
    phone: string
    bloodGroup: Donor["bloodGroup"]
    city: string
    area: string
    emergencyContact: string
    latitude: number | null
    longitude: number | null
    mapLocation: string
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
  ) => Promise<RegistrationResult>

  logout: () => void

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

    values: Partial<Pick<BloodRequest, "bloodGroup" | "component" | "searchRadiusKm" | "units" | "urgency" | "area" | "department" | "requiredBy" | "patientAge" | "notes" | "latitude" | "longitude" | "locationAddress">>,
  ) => Promise<void>

  toggleDonorAvailability: (donorId: string) => Promise<void>

  markNotificationRead: (id: string) => Promise<void>

  markNotificationsRead: (ids: string[]) => Promise<void>

  unreadCount: number
}

const AppContext = createContext<AppState | null>(null)

const VALID_ROLES = new Set(["hospital", "ngo", "donor"])

type HospitalRequestErrorDetails = {
  code?: string
  message?: string
  details?: string
}

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

  if (!existingProfile) {
    const { error: profileInsertError } = await supabase

      .from("profiles")

      .insert({
        id: userId,

        role: resolvedRole,

        full_name: fullName,

        email,

        phone,
      })

    if (profileInsertError) {
      console.error("PROFILE INSERT ERROR", profileInsertError)

      throw profileInsertError
    }
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

  if (!roleRow && resolvedRole === "hospital") {
    const { error: legacyLinkError } = await supabase
      .from("hospitals")
      .update({ user_id: userId })
      .eq("id", userId)
      .is("user_id", null)

    if (legacyLinkError) throw legacyLinkError

    const { data: linkedHospital, error: linkedHospitalError } = await supabase
      .from("hospitals")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (linkedHospitalError) throw linkedHospitalError

    if (linkedHospital) {
      return {
        role: resolvedRole,
        name: fullName,
        roleDetails: linkedHospital as Record<string, unknown>,
      }
    }
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

    .insert(rolePayload)

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

  const hospitalRequestLoadVersion = useRef(0)

  const lastHospitalRequestError = useRef<string | null>(null)

  const [notifList, setNotifList] = useState<Notification[]>([])

  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  )

  const [msgList] = useState(initialMessages)

  const refreshHospitalRequests = async () => {
    if (authLoading) return

    if (!currentUser?.id || role !== "hospital") return

    const loadVersion = ++hospitalRequestLoadVersion.current

    setHospitalRequestsLoading(true)

    setHospitalRequestsError(null)

    try {
      let accountRoleDetails = roleDetails
      if (
        !resolveHospitalRecordId({
          authLoading,
          role,
          userId: currentUser.id,
          roleDetails: accountRoleDetails,
        })
      ) {
        const { data: linkedHospital, error: linkedHospitalError } =
          await supabase
            .from("hospitals")
            .select("*")
            .eq("user_id", currentUser.id)
            .maybeSingle()

        if (linkedHospitalError) throw linkedHospitalError
        if (loadVersion !== hospitalRequestLoadVersion.current) return

        if (linkedHospital?.user_id === currentUser.id) {
          accountRoleDetails = (linkedHospital as Record<string, unknown>)
          setRoleDetails(accountRoleDetails)
        }
      }

      const result = await loadHospitalRequests({
        account: {
          authLoading,
          role,
          userId: currentUser.id,
          roleDetails: accountRoleDetails,
        },
        fetchRequests: async (ownedHospitalId) => {
          const { data, error } = await supabase
            .from("blood_requests")
            .select("*")
            .eq("hospital_id", ownedHospitalId)
            .order("created_at", { ascending: false })

          return { data, error }
        },
      })

      if (loadVersion !== hospitalRequestLoadVersion.current) return

      if (result.state === "unregistered") {
        setRequestList([])
        setHospitalRequestsError(
          "Your hospital record is not linked to this account. Complete hospital registration or ask an administrator to link the existing hospital record.",
        )
        return
      }

      if (result.state === "signed-out" || result.state === "not-hospital") {
        setRequestList([])
        return
      }

      if (result.state === "deferred") return

      if (result.state === "failed") throw result.error

      const data = result.requests
      const requestIds = data.map((request) => request.id)

      const responseResult = requestIds.length
        ? await supabase
            .from("donor_responses")
            .select("request_id,donor_id,status")
            .in("request_id", requestIds)
        : { data: [], error: null }

      if (loadVersion !== hospitalRequestLoadVersion.current) return

      if (responseResult.error) throw responseResult.error
      const fulfillmentResult = requestIds.length
        ? await supabase.rpc("get_hospital_request_fulfillment", {
            p_request_id: null,
          })
        : { data: [], error: null }

      if (fulfillmentResult.error) throw fulfillmentResult.error

      const fulfillmentByRequest = new Map(
        ((fulfillmentResult.data ?? []) as HospitalFulfillmentSnapshot[]).map(
          (snapshot) => [snapshot.request_id, snapshot],
        ),
      )

      const responsesByRequest = new Map<string, {
        donorId: string
        status: string
      }[]>()
      ;(responseResult.data ?? []).forEach((response) => {
        const current = responsesByRequest.get(response.request_id) ?? []
        current.push({ donorId: response.donor_id, status: response.status })
        responsesByRequest.set(response.request_id, current)
      })

      const hospitalRequests: BloodRequest[] = data.map((request) => ({
        id: request.id,
        hospitalId: request.hospital_id,
        hospitalName:
          typeof roleDetails?.hospital_name === "string"
            ? roleDetails.hospital_name
            : currentUser.name,
        bloodGroup: request.blood_group as BloodRequest["bloodGroup"],
        component: request.component as BloodRequest["component"],
        searchRadiusKm: request.search_radius_km ?? 25,
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
        hospitalContactPerson: request.hospital_contact_person ?? undefined,
        hospitalContactPhone: request.hospital_contact_phone ?? undefined,
        hospitalContactEmail: request.hospital_contact_email ?? undefined,
        patientAge: request.patient_age ?? undefined,
        notes: request.notes ?? undefined,
        validDonorResponseCount:
          fulfillmentByRequest.get(request.id)?.valid_unique_response_count ??
          countValidUniqueDonorResponses(
            (responsesByRequest.get(request.id) ?? []).map((response) => ({
              donor_id: response.donorId,
              response_status: response.status,
            })),
          ),
        verifiedDonationCount:
          fulfillmentByRequest.get(request.id)?.verified_donation_count ?? 0,
        donationCompletedAndVerified:
          fulfillmentByRequest.get(request.id)
            ?.donation_completed_and_verified ?? false,
        fulfillmentQualified:
          fulfillmentByRequest.get(request.id)?.fulfillment_qualified ?? false,
        donationCompletedAt:
          fulfillmentByRequest.get(request.id)?.donation_completed_at ??
          undefined,
        donationVerifiedBy:
          fulfillmentByRequest.get(request.id)?.donation_verified_by ??
          undefined,
        fulfillmentReviewRequired:
          fulfillmentByRequest.get(request.id)?.fulfillment_review_required ??
          false,
        matchedDonors: [
          ...new Set([
            ...(request.matched_donor ? [request.matched_donor] : []),
            ...(responsesByRequest.get(request.id) ?? [])
              .filter((response) =>
                [
                  "Response Sent",
                  "Hospital Confirmed",
                  "Coordination in Progress",
                  "Completed",
                ].includes(response.status),
              )
              .map((response) => response.donorId),
          ]),
        ],
      }))

      lastHospitalRequestError.current = null
      setRequestList(hospitalRequests)
    } catch (error) {
      if (loadVersion !== hospitalRequestLoadVersion.current) return

      const details =
        error && typeof error === "object"
          ? error as HospitalRequestErrorDetails
          : null
      const errorKey = [
        details?.code,
        details?.message,
        details?.details,
        error instanceof Error ? error.message : "",
      ]
        .filter(Boolean)
        .join(":")

      if (lastHospitalRequestError.current !== errorKey) {
        console.error("Unable to load hospital requests:", error)
        lastHospitalRequestError.current = errorKey
      }

      setHospitalRequestsError(
        "Hospital requests could not be loaded. Check your connection or try again; if the problem continues, contact support.",
      )

      throw error
    } finally {
      if (loadVersion === hospitalRequestLoadVersion.current) {
        setHospitalRequestsLoading(false)
      }
    }
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

      hospitalContactPerson: request.hospital_contact_person ?? undefined,

      hospitalContactPhone: request.hospital_contact_phone ?? undefined,

      hospitalContactEmail: request.hospital_contact_email ?? undefined,

      patientAge: request.patient_age ?? undefined,

      notes: request.notes ?? undefined,

      matchedDonors: request.matched_donor ? [request.matched_donor] : [],
    }))

    setRequestList(ngoRequests)
  }

  useEffect(() => {
    if (authLoading) return

    if (!currentUser?.id) {
      setRequestList([])
      setRequestFeedError(null)
      setHospitalRequestsError(null)
      setHospitalRequestsLoading(false)
      return
    }

    const refresh = () => {
      if (role === "hospital") {
        void refreshHospitalRequests().catch(() => undefined)
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

    return () => {
      window.clearInterval(interval)
      hospitalRequestLoadVersion.current += 1
    }
  }, [authLoading, role, currentUser?.id, hospitalRecordId])

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

    const { data: hospitalContact, error: hospitalContactError } =
      await supabase
        .from("hospitals")
        .select("contact_person, phone, email")
        .eq("id", hospitalRecordId)
        .single()

    if (hospitalContactError) throw hospitalContactError

    const { data, error } = await supabase

      .from("blood_requests")

      .insert({
        hospital_id: hospitalRecordId,

        blood_group: request.bloodGroup,

        component: request.component ?? "WHOLE_BLOOD",

        search_radius_km: request.searchRadiusKm ?? 25,

        units: request.units,

        urgency: request.urgency,

        area: request.area,

        patient_age: request.patientAge ?? null,

        notes: request.notes ?? null,

        department: request.department ?? null,

        required_by: request.requiredBy?.trim() || null,

        latitude: request.latitude ?? null,

        longitude: request.longitude ?? null,

        location_address: request.locationAddress ?? null,

        hospital_contact_person: hospitalContact.contact_person,

        hospital_contact_phone: hospitalContact.phone,

        hospital_contact_email: hospitalContact.email,

        status: "Matching",
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

      component: data.component as BloodRequest["component"],

      searchRadiusKm: data.search_radius_km ?? 25,

      hospitalName:
        typeof roleDetails?.hospital_name === "string"
          ? roleDetails.hospital_name
          : currentUser.name,

      createdAt: data.created_at,

      fulfilledAt: data.fulfilled_at ?? undefined,

      latitude: data.latitude ?? undefined,

      longitude: data.longitude ?? undefined,

      locationAddress: data.location_address ?? undefined,

      hospitalContactPerson: data.hospital_contact_person ?? undefined,

      hospitalContactPhone: data.hospital_contact_phone ?? undefined,

      hospitalContactEmail: data.hospital_contact_email ?? undefined,

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

    const { error } = await supabase.rpc(
      "update_hospital_blood_request_status",
      { p_request_id: requestId, p_status: status },
    )
    if (error) throw error
    await refreshHospitalRequests()
  }

  const updateHospitalRequestDetails = async (
    requestId: string,

    values: Partial<Pick<BloodRequest, "bloodGroup" | "component" | "searchRadiusKm" | "units" | "urgency" | "area" | "department" | "requiredBy" | "patientAge" | "notes" | "latitude" | "longitude" | "locationAddress">>,
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

        ...(values.component !== undefined && {
          component: values.component,
        }),

        ...(values.searchRadiusKm !== undefined && {
          search_radius_km: values.searchRadiusKm,
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

              component: data.component as BloodRequest["component"],

              searchRadiusKm: data.search_radius_km ?? 25,

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

  const updateHospitalProfile = async (profile: {
    hospital_name: string
    hospital_type: string
    street_address: string
    city: string
    phone: string
    email: string
  }) => {
    if (!currentUser?.id || role !== "hospital" || !hospitalRecordId) {
      throw new Error("Your hospital profile is not linked to this account.")
    }

    const { data, error } = await supabase
      .from("hospitals")
      .update({
        hospital_name: profile.hospital_name.trim(),
        hospital_type: profile.hospital_type.trim() || null,
        street_address: profile.street_address.trim() || null,
        city: profile.city.trim() || null,
        phone: profile.phone.trim() || null,
        email: profile.email.trim() || null,
      })
      .eq("user_id", currentUser.id)
      .select("*")
      .single()

    if (error) throw error

    setRoleDetails(data as Record<string, unknown>)
  }

  const updateDonorProfile = async (profile: {
    name: string
    phone: string
    bloodGroup: Donor["bloodGroup"]
    city: string
    area: string
    emergencyContact: string
    latitude: number | null
    longitude: number | null
    mapLocation: string
  }) => {
    if (!currentUser?.id || role !== "donor" || !donorRecordId) {
      throw new Error("Your donor profile is not linked to this account.")
    }

    const { error } = await supabase.rpc("update_donor_profile", {
      p_full_name: profile.name.trim(),
      p_phone: profile.phone.trim() || null,
      p_blood_group: profile.bloodGroup,
      p_city: profile.city.trim() || null,
      p_area: profile.area.trim() || null,
      p_emergency_contact: profile.emergencyContact.trim() || null,
      p_latitude: profile.latitude,
      p_longitude: profile.longitude,
      p_map_location: profile.mapLocation.trim() || null,
    })

    if (error) throw error

    setCurrentUser((current) =>
      current ? { ...current, name: profile.name.trim() } : current,
    )
    setRoleDetails((current) =>
      current
        ? {
            ...current,
            full_name: profile.name.trim(),
            phone: profile.phone.trim() || null,
            blood_group: profile.bloodGroup,
            city: profile.city.trim() || null,
            area: profile.area.trim() || null,
            emergency_contact: profile.emergencyContact.trim() || null,
            approximate_latitude:
              profile.latitude === null
                ? null
                : Number(profile.latitude.toFixed(2)),
            approximate_longitude:
              profile.longitude === null
                ? null
                : Number(profile.longitude.toFixed(2)),
            map_location: profile.mapLocation.trim() || null,
          }
        : current,
    )
    setDonorList((current) =>
      current.map((donor) =>
        donor.id === currentUser.id
          ? {
              ...donor,
              name: profile.name.trim(),
              phone: "",
              bloodGroup: profile.bloodGroup,
              city: profile.city.trim(),
              area: profile.area.trim(),
              latitude: profile.latitude ?? undefined,
              longitude: profile.longitude ?? undefined,
              locationAddress: profile.mapLocation,
            }
          : donor,
      ),
    )
  }

  const loadProfile = async (userId: string): Promise<{
    role: Exclude<Role, null>

    name: string
  }> => {
    const commitProfile = (
      profileRole: Exclude<Role, null>,
      name: string,
      details: Record<string, unknown>,
    ) => {
      if (details.user_id !== userId || typeof details.id !== "string") {
        throw new Error(
          "Your organisation record is not linked to the authenticated account.",
        )
      }

      setRoleDetails(details)
      setCurrentUser({ id: userId, name })
      setRoleState(profileRole)
      void loadNotifications(userId)

      return { role: profileRole, name }
    }

    const { data: profile, error: profileError } = await supabase

      .from("profiles")

      .select("*")

      .eq("id", userId)

      .maybeSingle()

    if (profileError) {
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

      return commitProfile(
        repairedProfile.role,
        repairedProfile.name,
        repairedProfile.roleDetails,
      )
    }

    if (!profile.role || !VALID_ROLES.has(profile.role)) {
      throw new Error("Your account has an invalid role.")
    }

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

    if (!roleDetails) {
      throw new Error(
        "The authenticated organisation record could not be loaded.",
      )
    }

    return commitProfile(profile.role, profile.full_name, roleDetails)
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

        requestId: notification.request_id ?? null,

        timestamp: notification.created_at,

        read: notification.read,
      })),
    )
  }

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        console.error("Unable to restore Supabase session:", error.message)
        if (mounted) setAuthLoading(false)
        return
      }

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
          hospitalRequestLoadVersion.current += 1
          setRoleState(null)

          setCurrentUser(null)

          setRoleDetails(null)

          setRequestList([])

          setHospitalRequestsError(null)

          setHospitalRequestsLoading(false)

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
    setAuthLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),

        password,
      })

      if (error) throw error

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError

      const user = userData.user

      if (!user)
        throw new Error("Supabase did not return an authenticated user.")

      hospitalRequestLoadVersion.current += 1
      setRoleState(null)
      setCurrentUser(null)
      setRoleDetails(null)
      setRequestList([])
      setHospitalRequestsLoading(true)
      setHospitalRequestsError(null)
      setRequestFeedError(null)
      setNotifList([])
      setNotificationsError(null)

      const actualProfile = await loadProfile(user.id)
      const actualRole = actualProfile.role

      if (expectedRole && actualRole !== expectedRole) {
        await supabase.auth.signOut()
        setRoleState(null)
        setCurrentUser(null)
        setRoleDetails(null)

        throw new RoleMismatchError(
          "The selected role does not match your account.",
        )
      }

      if (actualRole === "donor") {
        void loadDonorDetails(user.id, actualProfile.name)
      }

      return actualRole
    } finally {
      setAuthLoading(false)
    }
  }

  const register = async (
    selectedRole: Exclude<Role, null>,

    values: Record<string, string>,

    selectedBloodGroup: string,

    consent: boolean,
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

    if (!response.data.session) {
      return { requiresEmailConfirmation: true }
    }

    const registeredProfile = await syncCurrentUserProfile(user.id)

    setRoleDetails(registeredProfile.roleDetails)

    setCurrentUser({ id: user.id, name: registeredProfile.name })

    setRoleState(selectedRole)

    return { requiresEmailConfirmation: false }
  }

  const logout = () => {
    void supabase.auth.signOut()

    hospitalRequestLoadVersion.current += 1

    setRoleState(null)

    setCurrentUser(null)

    setRoleDetails(null)

    setDonorAvailability(null)

    setRequestList([])

    setHospitalRequestsError(null)

    setHospitalRequestsLoading(false)

    setDonorList([])

    setNotifList([])

    setRequestFeedError(null)

    setNotificationsError(null)
  }

  const createRequest = (
    req: Omit<BloodRequest, "id" | "createdAt" | "status">,
  ) => {
    const newReq: BloodRequest = {
      ...req,

      id: `REQ-${1030 + requestList.length}`,

      createdAt: new Date().toISOString(),

      status: "Matching",
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

    if (role === "ngo")
      throw new Error(
        "NGOs can update their own coordination response, but only the hospital can verify donations and fulfil a request.",
      )

    throw new Error("This role cannot update the request status.")
  }

  const toggleDonorAvailability = async (donorId: string) => {
    if (!currentUser?.id || donorId !== currentUser.id) {
      throw new Error("You can only update your own donor availability.")
    }

    const current =
      donorAvailability ??
      (typeof roleDetails?.available === "boolean"
        ? roleDetails.available
        : false)
    const next = !current
    const { data, error } = await supabase
      .from("donors")
      .update({ available: next })
      .eq("user_id", currentUser.id)
      .select("id")
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error("Your donor availability could not be updated.")

    setDonorAvailability(next)
    if (donorRecordId) {
      setDonorList((prev) =>
        prev.map((donor) =>
          donor.id === donorRecordId
            ? {
                ...donor,
                available: next,
                status: next ? "Active" : "Temporarily Unavailable",
              }
            : donor,
        ),
      )
    }
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

        createRequest,

        updateRequestStatus,

        refreshHospitalRequests,

        createHospitalRequest,

        updateHospitalRequest,

        refreshRequests,

        updateHospitalRequestDetails,

        updateHospitalLocation,

        updateHospitalProfile,

        updateDonorProfile,

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
