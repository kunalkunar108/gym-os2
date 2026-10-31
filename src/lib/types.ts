export type PlatformRole = "super_admin" | "user";
export type GymRole = "owner" | "staff";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";

export interface GymWorkspace {
  id: string;
  name: string;
  slug: string;
  approvalStatus: ApprovalStatus;
}

export interface GymMember {
  id: string;
  gymId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  status: "active" | "inactive";
}
