import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { useApp } from "./AppContext"

import type { BloodGroup } from "../data/mockData"

import { supabase } from "../lib/supabase"

export type DonorResponseStatus = "Response Sent" | "Hospital Confirmed" | "Coordination in Progress" | "Completed" | "Cancelled"

export type DonorAvailabilityStatus = "available" | "temporary" | "unavailable"

export interface DonorResponse {
  requestId: string

  status: DonorResponseStatus

  updatedAt: string
}

export interface DonorProfileEdits {
  name?: string

  phone?: string

  bloodGroup?: BloodGroup

  city?: string

  area?: string

  emergencyContact?: string
}

export interface DonorSettings {
  emergencyNotifications: boolean

  nearbyNotifications: boolean

  communityUpdates: boolean

  rewardNotifications: boolean

  showAvailability: boolean

  showApproximateDistance: boolean

  allowVerifiedContact: boolean
}

interface DonorPortalData {
  available: boolean | null

  availabilityStatus: DonorAvailabilityStatus | null

  availabilityUntil: string

  responses: DonorResponse[]

  responsesError: string | null

  profile: DonorProfileEdits

  settings: DonorSettings

  readNotifications: string[]

  deletedNotifications: string[]

  earnedBadgeDates: Record<string, string>
}

interface DonorPortalContextValue extends DonorPortalData {
  setAvailability: (
    available: boolean,

    until?: string,

    status?: DonorAvailabilityStatus,
  ) => void

  recordResponse: (requestId: string) => Promise<void>

  updateResponse: (
    requestId: string,

    status: DonorResponseStatus,
  ) => Promise<void>

  updateProfile: (profile: DonorProfileEdits) => void

  updateSettings: (settings: DonorSettings) => void

  markRead: (id: string) => void

  markAllRead: (ids: string[]) => void

  deleteNotification: (id: string) => void

  recordEarnedBadges: (badgeIds: string[]) => string[]
}

const STORAGE_PREFIX = "rakhtsetu:donor-portal:"

const defaultSettings: DonorSettings = {
  emergencyNotifications: true,

  nearbyNotifications: true,

  communityUpdates: true,

  rewardNotifications: true,

  showAvailability: true,

  showApproximateDistance: true,

  allowVerifiedContact: true,
}

const emptyData: DonorPortalData = {
  available: null,

  availabilityStatus: null,

  availabilityUntil: "",

  responses: [],

  responsesError: null,

  profile: {},

  settings: defaultSettings,

  readNotifications: [],

  deletedNotifications: [],

  earnedBadgeDates: {},
}

const DonorPortalContext = createContext<DonorPortalContextValue | null>(null)

export function DonorPortalProvider({ children }: { children: ReactNode }) {
  const { currentUser, donorRecordId, refreshRequests } = useApp()

  const userId = currentUser?.id ?? "guest"

  const [data, setData] = useState<DonorPortalData>(emptyData)

  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)

  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${userId}`

    try {
      const stored = window.localStorage.getItem(storageKey)

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<DonorPortalData>

        setData({
          ...emptyData,

          ...parsed,

          responses: [],

          settings: { ...defaultSettings, ...parsed.settings },
        })
      } else {
        setData(emptyData)
      }
    } catch (error) {
      console.warn("Unable to load saved donor portal preferences:", error)

      setData(emptyData)
    }

    setLoadedUserId(userId)
  }, [userId])

  useEffect(() => {
    if (!currentUser?.id) {
      setData((current) => ({
        ...current,

        responses: [],

        responsesError: null,
      }))

      return
    }

    if (!donorRecordId) {
      setData((current) => ({
        ...current,
        responses: [],
        responsesError:
          "Your donor profile is not linked to this account. Complete donor registration before loading responses.",
      }))
      return
    }

    let active = true

    const refreshResponses = async () => {
      try {
        const { data: responseRows, error } = await supabase

          .from("donor_responses")

          .select("request_id,status,updated_at")

          .eq("donor_id", donorRecordId)

          .order("updated_at", { ascending: false })

        if (!active) return

        if (error) {
          setData((current) => ({
            ...current,

            responsesError: error.message,
          }))

          return
        }

        setData((current) => ({
          ...current,

          responsesError: null,

          responses: (responseRows ?? []).map((response) => ({
            requestId: response.request_id,

            status: response.status as DonorResponseStatus,

            updatedAt: response.updated_at,
          })),
        }))
      } catch (error) {
        if (!active) return

        setData((current) => ({
          ...current,

          responsesError:
            error instanceof Error
              ? error.message
              : "Unable to load donor responses.",
        }))
      }
    }

    void refreshResponses()

    const interval = window.setInterval(() => {
      void refreshResponses()
    }, 30000)

    return () => {
      active = false

      window.clearInterval(interval)
    }
  }, [currentUser?.id, donorRecordId])

  useEffect(() => {
    if (loadedUserId !== userId) return

    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${userId}`,

        JSON.stringify({ ...data, responses: [] }),
      )
    } catch (error) {
      console.warn("Unable to save donor portal preferences:", error)
    }
  }, [data, loadedUserId, userId])

  const value = useMemo<DonorPortalContextValue>(
    () => ({
      ...(loadedUserId === userId ? data : emptyData),

      setAvailability: (
        available,

        until = "",

        status = available ? "available" : "unavailable",
      ) =>
        setData((current) => ({
          ...current,

          available,

          availabilityStatus: status,

          availabilityUntil: until,
        })),

      recordResponse: async (requestId) => {
        if (!currentUser?.id)
          throw new Error("Sign in to respond to a blood request.")

        const respondedAt = new Date().toISOString()

        const { data: responseStatus, error } = await supabase.rpc(
          "respond_to_blood_request",

          { p_request_id: requestId },
        )

        if (error) throw error

        void refreshRequests().catch((refreshError: unknown) => {
          console.error(
            "Response saved but requests could not be refreshed:",
            refreshError,
          )
        })

        setData((current) => ({
          ...current,

          responsesError: null,

          responses: [
            {
              requestId,

              status: responseStatus as DonorResponseStatus,

              updatedAt: respondedAt,
            },

            ...current.responses.filter(
              (response) => response.requestId !== requestId,
            ),
          ],
        }))
      },

      updateResponse: async (requestId, status) => {
        if (!currentUser?.id)
          throw new Error("Sign in to update your response.")
        if (!donorRecordId)
          throw new Error("Your donor profile is not linked to this account.")

        if (status !== "Cancelled")
          throw new Error("Only withdrawal is available from the donor portal.")

        const updatedAt = new Date().toISOString()

        const { data: updatedRows, error } = await supabase

          .from("donor_responses")

          .update({ status, updated_at: updatedAt })

          .eq("request_id", requestId)

          .eq("donor_id", donorRecordId)

          .select("id")

        if (error) throw error

        if (!updatedRows?.length) {
          throw new Error("Your response could not be found.")
        }

        void refreshRequests().catch((refreshError: unknown) => {
          console.error(
            "Response updated but requests could not be refreshed:",
            refreshError,
          )
        })

        setData((current) => ({
          ...current,

          responsesError: null,

          responses: current.responses.map((response) =>
            response.requestId === requestId
              ? { ...response, status, updatedAt }
              : response,
          ),
        }))
      },

      updateProfile: (profile) =>
        setData((current) => ({
          ...current,

          profile: { ...current.profile, ...profile },
        })),

      updateSettings: (settings) =>
        setData((current) => ({ ...current, settings })),

      markRead: (id) =>
        setData((current) => ({
          ...current,

          readNotifications: current.readNotifications.includes(id)
            ? current.readNotifications
            : [...current.readNotifications, id],
        })),

      markAllRead: (ids) =>
        setData((current) => ({
          ...current,

          readNotifications: [
            ...new Set([...current.readNotifications, ...ids]),
          ],
        })),

      deleteNotification: (id) =>
        setData((current) => ({
          ...current,

          deletedNotifications: current.deletedNotifications.includes(id)
            ? current.deletedNotifications
            : [...current.deletedNotifications, id],
        })),

      recordEarnedBadges: (badgeIds) => {
        const newlyEarned = badgeIds.filter((id) => !data.earnedBadgeDates[id])

        if (newlyEarned.length) {
          setData((current) => {
            const earnedBadgeDates = { ...current.earnedBadgeDates }

            newlyEarned.forEach((id) => {
              earnedBadgeDates[id] ??= new Date().toISOString()
            })

            return { ...current, earnedBadgeDates }
          })
        }

        return newlyEarned
      },
    }),

    [data, loadedUserId, userId, currentUser?.id, refreshRequests],
  )

  return (
    <DonorPortalContext.Provider value={value}>
      {children}
    </DonorPortalContext.Provider>
  )
}

export function useDonorPortal() {
  const context = useContext(DonorPortalContext)

  if (!context)
    throw new Error("useDonorPortal must be used within DonorPortalProvider")

  return context
}
