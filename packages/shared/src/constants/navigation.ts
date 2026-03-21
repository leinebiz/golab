export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badgeKey?: string;
}

export const CUSTOMER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portal/customer', icon: 'LayoutDashboard' },
  { label: 'New Request', href: '/portal/customer/requests/new', icon: 'Plus' },
  {
    label: 'My Requests',
    href: '/portal/customer/requests',
    icon: 'ClipboardList',
    badgeKey: 'pendingActions',
  },
  { label: 'Certificates', href: '/portal/customer/certificates', icon: 'FileCheck' },
  { label: 'Finances', href: '/portal/customer/finances', icon: 'Wallet' },
  { label: 'Tolerances', href: '/portal/customer/tolerances', icon: 'SlidersHorizontal' },
  {
    label: 'Support',
    href: '/portal/customer/chat',
    icon: 'MessageCircle',
    badgeKey: 'unreadMessages',
  },
  { label: 'Settings', href: '/portal/customer/settings', icon: 'Settings' },
  {
    label: "What's New",
    href: '/portal/customer/whats-new',
    icon: 'Sparkles',
    badgeKey: 'unreadReleases',
  },
];

export const LAB_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portal/lab', icon: 'LayoutDashboard' },
  {
    label: 'Incoming Samples',
    href: '/portal/lab/incoming',
    icon: 'PackageCheck',
    badgeKey: 'awaitingSamples',
  },
  { label: 'In Progress', href: '/portal/lab/in-progress', icon: 'FlaskConical' },
  { label: 'Upload Results', href: '/portal/lab/upload', icon: 'Upload' },
  { label: 'Issues', href: '/portal/lab/issues', icon: 'AlertTriangle' },
];

export const GOLAB_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portal/admin', icon: 'LayoutDashboard' },
  { label: 'Requests', href: '/portal/admin/requests', icon: 'ClipboardList' },
  {
    label: 'Review Queue',
    href: '/portal/admin/review',
    icon: 'CheckSquare',
    badgeKey: 'awaitingReview',
  },
  { label: 'Laboratories', href: '/portal/admin/labs', icon: 'Building2' },
  { label: 'Test Catalogue', href: '/portal/admin/tests', icon: 'FlaskConical' },
  { label: 'Customers', href: '/portal/admin/customers', icon: 'Users' },
  { label: 'KPIs & Reports', href: '/portal/admin/reports', icon: 'BarChart3' },
  { label: 'Disclaimers', href: '/portal/admin/disclaimers', icon: 'FileText' },
];

export const FINANCE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portal/finance', icon: 'LayoutDashboard' },
  {
    label: 'Credit Applications',
    href: '/portal/finance/credit',
    icon: 'CreditCard',
    badgeKey: 'pendingCredit',
  },
  { label: 'Invoices', href: '/portal/finance/invoices', icon: 'Receipt' },
  { label: 'Payments', href: '/portal/finance/payments', icon: 'Banknote' },
  { label: 'Accounts', href: '/portal/finance/accounts', icon: 'Building' },
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
