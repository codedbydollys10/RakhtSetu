export interface DonorBadgeStats {
  totalDonations: number

  emergencyResponses: number

  successfulResponses: number

  communityContributions: number
}

export interface DonorBadge {
  id: string

  name: string

  description: string

  icon: string

  requirement: string

  earned: boolean

  earnedAt?: string

  progress: number

  target: number
}

export function getDonorBadgeStats({
  totalDonations,

  donorId,

  requests,

  responses,
}: {
  totalDonations: number

  donorId: string

  requests: {
    id: string

    urgency: "CRITICAL" | "URGENT" | "NORMAL"

    status: string

    confirmedDonor?: string
  }[]

  responses: { requestId: string; status: string }[]
}): DonorBadgeStats {
  const donationTotal = Number.isFinite(totalDonations)
    ? Math.max(0, totalDonations)
    : 0
  const respondedIds = new Set(
    responses

      .filter((response) => response.status !== "Cancelled")

      .map((response) => response.requestId),
  )

  const successfulIds = new Set(
    requests

      .filter(
        (request) =>
          request.status === "Fulfilled" && request.confirmedDonor === donorId,
      )

      .map((request) => request.id),
  )

  responses

    .filter((response) => response.status === "Completed")

    .forEach((response) => successfulIds.add(response.requestId))

  const emergencyIds = new Set(
    requests

      .filter(
        (request) =>
          request.urgency !== "NORMAL" && successfulIds.has(request.id),
      )

      .map((request) => request.id),
  )

  return {
    totalDonations: donationTotal,

    emergencyResponses: emergencyIds.size,

    successfulResponses: successfulIds.size,

    communityContributions: donationTotal + respondedIds.size,
  }
}

interface BadgeDefinition {
  id: string

  name: string

  description: string

  icon: string

  requirement: string

  stat: keyof DonorBadgeStats

  target: number
}

export const donorBadgeDefinitions: BadgeDefinition[] = [
  {
    id: "first-drop",

    name: "FIRST DROP",

    description: "Completed your first successful blood donation.",

    icon: "🩸",

    requirement: "Complete your first successful blood donation.",

    stat: "totalDonations",

    target: 1,
  },

  {
    id: "emergency-hero",

    name: "EMERGENCY HERO",

    description: "Successfully responded to an emergency blood request.",

    icon: "🚨",

    requirement: "Successfully respond to an emergency blood request.",

    stat: "emergencyResponses",

    target: 1,
  },

  {
    id: "life-saver",

    name: "LIFE SAVER",

    description: "Supported 5 verified blood requests.",

    icon: "❤️",

    requirement: "Support 5 verified blood requests.",

    stat: "successfulResponses",

    target: 5,
  },

  {
    id: "regular-donor",

    name: "REGULAR DONOR",

    description: "Completed 5 successful blood donations.",

    icon: "🏅",

    requirement: "Complete 5 successful blood donations.",

    stat: "totalDonations",

    target: 5,
  },

  {
    id: "community-champion",

    name: "COMMUNITY CHAMPION",

    description: "Made a strong contribution to the RakhtSetu donor community.",

    icon: "🌟",

    requirement:
      "Make 10 contributions through donations and request responses.",

    stat: "communityContributions",

    target: 10,
  },

  {
    id: "consistent-donor",

    name: "CONSISTENT DONOR",

    description: "Maintained consistent donation activity.",

    icon: "🔥",

    requirement: "Complete 10 successful blood donations.",

    stat: "totalDonations",

    target: 10,
  },
]

export function getEarnedBadges(
  donorStats: DonorBadgeStats,

  earnedBadgeDates: Record<string, string> = {},
): DonorBadge[] {
  return donorBadgeDefinitions.map((definition) => {
    const progress = Math.max(0, donorStats[definition.stat])

    return {
      id: definition.id,

      name: definition.name,

      description: definition.description,

      icon: definition.icon,

      requirement: definition.requirement,

      earned: progress >= definition.target,

      earnedAt: earnedBadgeDates[definition.id],

      progress: Math.min(progress, definition.target),

      target: definition.target,
    }
  })
}
