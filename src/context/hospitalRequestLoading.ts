export type HospitalAccountContext = {
  authLoading: boolean
  role: string | null
  userId: string | null
  roleDetails: Record<string, unknown> | null
}

export type HospitalRequestLoadResult<T> =
  | { state: "deferred" }
  | { state: "signed-out" }
  | { state: "not-hospital" }
  | { state: "unregistered" }
  | { state: "loaded"; requests: T[] }
  | { state: "failed"; error: unknown }

export function resolveHospitalRecordId({
  authLoading,
  role,
  userId,
  roleDetails,
}: HospitalAccountContext): string | null {
  if (
    authLoading ||
    role !== "hospital" ||
    !userId ||
    roleDetails?.user_id !== userId ||
    typeof roleDetails.id !== "string" ||
    !roleDetails.id.trim()
  ) {
    return null
  }

  return roleDetails.id
}

export async function loadHospitalRequests<T>({
  account,
  fetchRequests,
}: {
  account: HospitalAccountContext
  fetchRequests: (
    hospitalId: string,
  ) => Promise<{ data: T[] | null; error: unknown | null }>
}): Promise<HospitalRequestLoadResult<T>> {
  if (account.authLoading) return { state: "deferred" }
  if (!account.userId) return { state: "signed-out" }
  if (account.role !== "hospital") return { state: "not-hospital" }

  const hospitalId = resolveHospitalRecordId(account)
  if (!hospitalId) return { state: "unregistered" }

  try {
    const { data, error } = await fetchRequests(hospitalId)
    if (error) return { state: "failed", error }

    return { state: "loaded", requests: data ?? [] }
  } catch (error) {
    return { state: "failed", error }
  }
}
