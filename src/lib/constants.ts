export const APP_NAME = "GymOS";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export const GYM_ROLES = ["owner", "staff"] as const;
export const GYM_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export const SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;
