export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

export const statusBadgeStyles: Record<
  string,
  "success" | "warning" | "danger" | "info" | "default"
> = {
  Delivered: "success",
  Pending: "warning",
  Failed: "danger",
  Sent: "info",
  Scheduled: "info",
  Draft: "default",
};

export const typeBadgeStyles: Record<
  string,
  "success" | "warning" | "danger" | "info" | "default"
> = {
  OTP: "info",
  Promotional: "success",
  Transactional: "default",
  Alert: "warning",
};
