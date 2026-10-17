import type { BloodRequest } from "../data/mockData.ts"

export const MINIMUM_VALID_DONOR_RESPONSES = 1

export const FULFILLMENT_RESPONSE_STATUSES = new Set([
  "Response Sent",
  "Hospital Confirmed",
  "Coordination in Progress",
  "Completed",
])

export type DonorResponseForFulfillment = {
  donor_id: string
  response_status: string
}

export function countValidUniqueDonorResponses(
  responses: DonorResponseForFulfillment[],
) {
  return new Set(
    responses
      .filter((response) =>
        FULFILLMENT_RESPONSE_STATUSES.has(response.response_status),
      )
      .map((response) => response.donor_id)
      .filter(Boolean),
  ).size
}

export function hasVerifiedRequiredDonation(request: BloodRequest) {
  if (request.donationCompletedAndVerified !== undefined) {
    return request.donationCompletedAndVerified
  }
  return (
    (request.verifiedDonationCount ?? 0) >= request.units &&
    request.units > 0
  )
}

export function qualifiesForFulfillment(request: BloodRequest) {
  if (request.fulfillmentQualified !== undefined) {
    return request.fulfillmentQualified
  }
  return (
    (request.validDonorResponseCount ?? 0) >=
      MINIMUM_VALID_DONOR_RESPONSES &&
    hasVerifiedRequiredDonation(request)
  )
}

export function isRequestFulfilled(request: BloodRequest) {
  return request.status === "Fulfilled" && qualifiesForFulfillment(request)
}

export function requestDisplayStatus(request: BloodRequest) {
  if (request.status === "Fulfilled" && !qualifiesForFulfillment(request)) {
    return "Fulfillment Review"
  }
  return request.status
}
