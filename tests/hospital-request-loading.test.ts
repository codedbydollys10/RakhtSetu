import assert from "node:assert/strict"
import test from "node:test"

import {
  loadHospitalRequests,
  resolveHospitalRecordId,
  type HospitalAccountContext,
} from "../src/context/hospitalRequestLoading.ts"

const registeredHospital: HospitalAccountContext = {
  authLoading: false,
  role: "hospital",
  userId: "user-1",
  roleDetails: { id: "hospital-1", user_id: "user-1" },
}

test("does not query while authentication is loading", async () => {
  let queried = false
  const result = await loadHospitalRequests({
    account: { ...registeredHospital, authLoading: true },
    fetchRequests: async () => {
      queried = true
      return { data: [], error: null }
    },
  })

  assert.equal(result.state, "deferred")
  assert.equal(queried, false)
})

test("does not query without an authenticated user", async () => {
  let queried = false
  const result = await loadHospitalRequests({
    account: { ...registeredHospital, userId: null },
    fetchRequests: async () => {
      queried = true
      return { data: [], error: null }
    },
  })

  assert.equal(result.state, "signed-out")
  assert.equal(queried, false)
})

test("donor and NGO roles never trigger hospital request queries", async () => {
  for (const role of ["donor", "ngo"]) {
    let queried = false
    const result = await loadHospitalRequests({
      account: { ...registeredHospital, role },
      fetchRequests: async () => {
        queried = true
        return { data: [], error: null }
      },
    })

    assert.equal(result.state, "not-hospital")
    assert.equal(queried, false)
  }
})

test("treats an unlinked hospital account explicitly", async () => {
  const result = await loadHospitalRequests({
    account: { ...registeredHospital, roleDetails: null },
    fetchRequests: async () => ({ data: [], error: null }),
  })

  assert.equal(result.state, "unregistered")
})

test("requires the hospital record to belong to the authenticated user", () => {
  assert.equal(
    resolveHospitalRecordId({
      ...registeredHospital,
      roleDetails: { id: "hospital-other", user_id: "user-other" },
    }),
    null,
  )
})

test("returns an empty list as a successful registered-hospital result", async () => {
  const result = await loadHospitalRequests({
    account: registeredHospital,
    fetchRequests: async (hospitalId) => {
      assert.equal(hospitalId, "hospital-1")
      return { data: null, error: null }
    },
  })

  assert.deepEqual(result, { state: "loaded", requests: [] })
})

test("returns requests for the authenticated hospital only", async () => {
  const requests = [{ id: "request-1", hospital_id: "hospital-1" }]
  const result = await loadHospitalRequests({
    account: registeredHospital,
    fetchRequests: async (hospitalId) => {
      assert.equal(hospitalId, "hospital-1")
      return { data: requests, error: null }
    },
  })

  assert.deepEqual(result, { state: "loaded", requests })
})

test("preserves database permission failures", async () => {
  const permissionError = { code: "42501", message: "permission denied" }
  const result = await loadHospitalRequests({
    account: registeredHospital,
    fetchRequests: async () => ({ data: null, error: permissionError }),
  })

  assert.deepEqual(result, { state: "failed", error: permissionError })
})

test("preserves rejected network requests", async () => {
  const networkError = new Error("network unavailable")
  const result = await loadHospitalRequests({
    account: registeredHospital,
    fetchRequests: async () => {
      throw networkError
    },
  })

  assert.deepEqual(result, { state: "failed", error: networkError })
})
