export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", ASSIGNED: "Assigned", ACKNOWLEDGED: "Acknowledged", IN_PROGRESS: "In Progress", BLOCKED: "Blocked",
  SUBMITTED_FOR_REVIEW: "Submitted for Review", CHANGES_REQUESTED: "Changes Requested", COMPLETED: "Completed", CANCELLED: "Cancelled"
};
export const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO", FINANCE_DIRECTOR: "Finance Director", OPERATIONS_DIRECTOR: "Operations Director", DEPARTMENT_HEAD: "Department Head",
  SUPERVISOR: "Supervisor", EMPLOYEE: "Employee", SYSTEM_ADMIN: "System Administrator"
};
export type Serialize<T> = T extends Date ? string : T extends Array<infer U> ? Serialize<U>[] : T extends object ? { [K in keyof T]: Serialize<T[K]> } : T;
