export type Permission = string;

export const PERMISSIONS = {
  CUSTOMER_ADMIN: {
    organization: ['read', 'update'],
    users: ['read', 'create', 'update', 'deactivate'],
    requests: ['read', 'create', 'update', 'cancel'],
    quotes: ['read', 'accept', 'reject'],
    invoices: ['read', 'download'],
    certificates: ['read', 'download'],
    creditAccount: ['read', 'apply'],
    tolerances: ['read', 'create', 'update', 'delete'],
    chat: ['read', 'create'],
    notifications: ['read', 'markRead'],
  },
  CUSTOMER_USER: {
    organization: ['read'],
    users: [] as string[],
    requests: ['read', 'create'],
    quotes: ['read'],
    invoices: ['read', 'download'],
    certificates: ['read', 'download'],
    creditAccount: ['read'],
    tolerances: ['read'],
    chat: ['read', 'create'],
    notifications: ['read', 'markRead'],
  },
  LAB_ADMIN: {
    labRequests: ['read', 'accept', 'reject', 'update'],
    sampleIssues: ['read', 'create'],
    certificates: ['read', 'upload'],
    labUsers: ['read', 'create', 'update', 'deactivate'],
    notifications: ['read', 'markRead'],
  },
  LAB_TECHNICIAN: {
    labRequests: ['read', 'accept', 'update'],
    sampleIssues: ['read', 'create'],
    certificates: ['read', 'upload'],
    notifications: ['read', 'markRead'],
  },
  GOLAB_ADMIN: {
    all: ['read', 'create', 'update', 'delete'],
    testCatalogue: ['read', 'create', 'update', 'deactivate'],
    laboratories: ['read', 'create', 'update', 'deactivate'],
    requests: ['read', 'update', 'escalate', 'reassign'],
    certificates: ['read', 'review', 'approve', 'reject', 'replicate'],
    organizations: ['read', 'update'],
    reports: ['read', 'export'],
  },
  GOLAB_REVIEWER: {
    requests: ['read'],
    certificates: ['read', 'review', 'approve', 'reject', 'replicate'],
    notifications: ['read', 'markRead'],
  },
  GOLAB_FINANCE: {
    creditAccounts: ['read', 'approve', 'decline', 'adjust'],
    invoices: ['read', 'create', 'update', 'credit'],
    payments: ['read', 'confirm', 'refund'],
    organizations: ['read'],
    reports: ['read', 'export'],
    notifications: ['read', 'markRead'],
  },
} as const;

export type UserRole = keyof typeof PERMISSIONS;

export function hasPermission(
  role: string,
  resource: string,
  action: string,
): boolean {
  const rolePerms = PERMISSIONS[role as UserRole];
  if (!rolePerms) return false;

  const resourcePerms = (rolePerms as Record<string, readonly string[]>)[resource];
  if (!resourcePerms) {
    // Check 'all' permission for admin roles
    const allPerms = (rolePerms as Record<string, readonly string[]>)['all'];
    if (allPerms) return allPerms.includes(action);
    return false;
  }

  return resourcePerms.includes(action);
}
