export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badgeKey?: string;
}

export const CUSTOMER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/customer', icon: 'LayoutDashboard' },
  { label: 'New Request', href: '/customer/requests/new', icon: 'Plus' },
  {
    label: 'My Requests',
    href: '/customer/requests',
    icon: 'ClipboardList',
    badgeKey: 'pendingActions',
  },
  { label: 'Certificates', href: '/customer/certificates', icon: 'FileCheck' },
  { label: 'Finances', href: '/customer/finances', icon: 'Wallet' },
  { label: 'Tolerances', href: '/customer/tolerances', icon: 'SlidersHorizontal' },
  {
    label: 'Support',
    href: '/customer/chat',
    icon: 'MessageCircle',
    badgeKey: 'unreadMessages',
  },
  { label: 'Settings', href: '/customer/settings', icon: 'Settings' },
];

export const LAB_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/lab', icon: 'LayoutDashboard' },
  {
    label: 'Incoming Samples',
    href: '/lab/incoming',
    icon: 'PackageCheck',
    badgeKey: 'awaitingSamples',
  },
  { label: 'In Progress', href: '/lab/in-progress', icon: 'FlaskConical' },
  { label: 'Upload Results', href: '/lab/upload', icon: 'Upload' },
  { label: 'Issues', href: '/lab/issues', icon: 'AlertTriangle' },
];

export const GOLAB_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Requests', href: '/admin/requests', icon: 'ClipboardList' },
  {
    label: 'Review Queue',
    href: '/admin/review',
    icon: 'CheckSquare',
    badgeKey: 'awaitingReview',
  },
  { label: 'Laboratories', href: '/admin/labs', icon: 'Building2' },
  { label: 'Test Catalogue', href: '/admin/tests', icon: 'FlaskConical' },
  { label: 'Customers', href: '/admin/customers', icon: 'Users' },
  { label: 'KPIs & Reports', href: '/admin/reports', icon: 'BarChart3' },
  { label: 'Disclaimers', href: '/admin/disclaimers', icon: 'FileText' },
  { label: 'Audit Trail', href: '/admin/audit', icon: 'Shield' },
];

export const FINANCE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/finance', icon: 'LayoutDashboard' },
  {
    label: 'Credit Applications',
    href: '/finance/credit',
    icon: 'CreditCard',
    badgeKey: 'pendingCredit',
  },
  { label: 'Invoices', href: '/finance/invoices', icon: 'Receipt' },
  { label: 'Payments', href: '/finance/payments', icon: 'Banknote' },
  { label: 'Accounts', href: '/finance/accounts', icon: 'Building' },
];

export function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case 'CUSTOMER_ADMIN':
    case 'CUSTOMER_USER':
      return CUSTOMER_NAV;
    case 'LAB_ADMIN':
    case 'LAB_TECHNICIAN':
      return LAB_NAV;
    case 'GOLAB_ADMIN':
    case 'GOLAB_REVIEWER':
      return GOLAB_ADMIN_NAV;
    case 'GOLAB_FINANCE':
      return FINANCE_NAV;
    default:
      return [];
  }
}
