import { useEffect, useState } from "react"

import { useApp } from "../context/AppContext"

import { supabase } from "../lib/supabase"

export interface DonationHistoryRecord {
  donation_id: string

  request_id: string

  hospital_name: string

  donated_at: string

  component: string

  volume_ml: number | null
}

export function useDonationHistory() {
  const { currentUser } = useApp()

  const [records, setRecords] = useState<DonationHistoryRecord[]>([])

  const [loading, setLoading] = useState(Boolean(currentUser))

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) {
      setRecords([])

      setLoading(false)

      setError(null)

      return
    }

    let active = true

    const load = async () => {
      const { data, error: loadError } = await supabase.rpc(
        "get_my_donation_recovery",
      )

      if (!active) return

      if (loadError) {
        setError(loadError.message)

        setRecords([])
      } else {
        setError(null)

        setRecords(data ?? [])
      }

      setLoading(false)
    }

    setLoading(true)

    void load().catch((loadError: unknown) => {
      if (!active) return

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load donation history.",
      )

      setRecords([])

      setLoading(false)
    })

    const interval = window.setInterval(() => void load(), 30000)

    return () => {
      active = false

      window.clearInterval(interval)
    }
  }, [currentUser?.id])

  return { records, loading, error }
}
