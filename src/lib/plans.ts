import type { PlanTier } from '@/lib/database.types';

export type PlanFeature =
  | 'customColumns'
  | 'taskDueDates'
  | 'taskComments'
  | 'emailInvites'
  | 'advancedAnalytics'
  | 'csvExport'
  | 'privateWorkspace'
  | 'auditLog'
  | 'apiKeys'
  | 'guestLinks'
  | 'taskAttachments'
  | 'workspaceAccent'
  | 'boardBranding';

export interface PlanConfig {
  maxWorkspaces: number;
  maxMembersPerWorkspace: number;
  maxBoardsPerWorkspace: number;
  maxAttachmentBytes: number;
  features: PlanFeature[];
  price: string;
  priceMonthly: number;
  description: string;
  marketingFeatures: string[];
}

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  free: {
    maxWorkspaces: 3,
    maxMembersPerWorkspace: 5,
    maxBoardsPerWorkspace: 3,
    maxAttachmentBytes: 0,
    features: ['boardBranding'],
    price: '€0',
    priceMonthly: 0,
    description: 'Perfetto per progetti personali',
    marketingFeatures: [
      'Fino a 3 workspace',
      '5 membri per workspace',
      'Max 3 board per workspace',
      'Colonne Kanban standard',
      'Task con titolo e priorità',
      'Branding TaskWave sulle board',
    ],
  },
  pro: {
    maxWorkspaces: Infinity,
    maxMembersPerWorkspace: 20,
    maxBoardsPerWorkspace: Infinity,
    maxAttachmentBytes: 25 * 1024 * 1024,
    features: [
      'customColumns',
      'taskDueDates',
      'taskComments',
      'emailInvites',
      'advancedAnalytics',
      'csvExport',
      'taskAttachments',
      'workspaceAccent',
    ],
    price: '€12',
    priceMonthly: 12,
    description: 'Per team in crescita',
    marketingFeatures: [
      'Workspace illimitati',
      '20 membri per workspace',
      'Board illimitate',
      'Colonne personalizzate',
      'Scadenze e commenti sui task',
      'Allegati fino a 25 MB',
      'Analytics e export CSV',
      'Inviti email al team',
      'Accent color per workspace',
    ],
  },
  business: {
    maxWorkspaces: Infinity,
    maxMembersPerWorkspace: Infinity,
    maxBoardsPerWorkspace: Infinity,
    maxAttachmentBytes: 100 * 1024 * 1024,
    features: [
      'customColumns',
      'taskDueDates',
      'taskComments',
      'emailInvites',
      'advancedAnalytics',
      'csvExport',
      'privateWorkspace',
      'auditLog',
      'apiKeys',
      'guestLinks',
      'taskAttachments',
      'workspaceAccent',
    ],
    price: '€29',
    priceMonthly: 29,
    description: 'Per team professionali',
    marketingFeatures: [
      'Tutto in Pro',
      'Membri illimitati',
      'Workspace privati',
      'Audit log completo',
      'API keys e REST API',
      'Guest link view-only',
      'Allegati fino a 100 MB',
      'Webhooks outbound su eventi task',
      'SSO / SAML (configurazione su richiesta)',
      'Supporto dedicato',
    ],
  },
};

export const PLAN_LIMITS = {
  free: {
    maxWorkspaces: PLAN_CONFIG.free.maxWorkspaces,
    maxMembersPerWorkspace: PLAN_CONFIG.free.maxMembersPerWorkspace,
    maxBoardsPerWorkspace: PLAN_CONFIG.free.maxBoardsPerWorkspace,
  },
  pro: {
    maxWorkspaces: PLAN_CONFIG.pro.maxWorkspaces,
    maxMembersPerWorkspace: PLAN_CONFIG.pro.maxMembersPerWorkspace,
    maxBoardsPerWorkspace: PLAN_CONFIG.pro.maxBoardsPerWorkspace,
  },
  business: {
    maxWorkspaces: PLAN_CONFIG.business.maxWorkspaces,
    maxMembersPerWorkspace: PLAN_CONFIG.business.maxMembersPerWorkspace,
    maxBoardsPerWorkspace: PLAN_CONFIG.business.maxBoardsPerWorkspace,
  },
};

export const PLAN_ORDER: PlanTier[] = ['free', 'pro', 'business'];

export const COMPARISON_MATRIX: Array<{
  category: string;
  rows: Array<{
    label: string;
    free: string | boolean;
    pro: string | boolean;
    business: string | boolean;
  }>;
}> = [
  {
    category: 'Team',
    rows: [
      { label: 'Workspace', free: '3', pro: 'Illimitati', business: 'Illimitati' },
      { label: 'Membri per workspace', free: '5', pro: '20', business: 'Illimitati' },
      { label: 'Inviti email', free: false, pro: true, business: true },
      { label: 'Workspace privato', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'Board & Task',
    rows: [
      { label: 'Board per workspace', free: '3', pro: 'Illimitate', business: 'Illimitate' },
      { label: 'Colonne custom', free: false, pro: true, business: true },
      { label: 'Scadenze task', free: false, pro: true, business: true },
      { label: 'Commenti task', free: false, pro: true, business: true },
      { label: 'Allegati', free: false, pro: '25 MB', business: '100 MB' },
    ],
  },
  {
    category: 'Automazione',
    rows: [
      { label: 'Analytics avanzate', free: false, pro: true, business: true },
      { label: 'Export CSV', free: false, pro: true, business: true },
      { label: 'Guest link', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'Enterprise',
    rows: [
      { label: 'Audit log', free: false, pro: false, business: true },
      { label: 'API keys', free: false, pro: false, business: true },
      { label: 'SSO / SAML', free: false, pro: false, business: 'Su richiesta' },
    ],
  },
];

export function hasFeature(plan: PlanTier, feature: PlanFeature): boolean {
  return PLAN_CONFIG[plan].features.includes(feature);
}

export function canCreateWorkspace(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_CONFIG[plan].maxWorkspaces;
}

export function canAddMember(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_CONFIG[plan].maxMembersPerWorkspace;
}

export function canCreateBoard(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_CONFIG[plan].maxBoardsPerWorkspace;
}

export function canSendEmailInvites(plan: PlanTier): boolean {
  return hasFeature(plan, 'emailInvites');
}

export function canUseCustomColumns(plan: PlanTier): boolean {
  return hasFeature(plan, 'customColumns');
}

export function canAttachFile(plan: PlanTier, fileSizeBytes: number): boolean {
  const max = PLAN_CONFIG[plan].maxAttachmentBytes;
  return max > 0 && fileSizeBytes <= max;
}

export function maxAttachmentBytes(plan: PlanTier): number {
  return PLAN_CONFIG[plan].maxAttachmentBytes;
}

export function planLabel(plan: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    free: 'Gratuito',
    pro: 'Pro',
    business: 'Business',
  };
  return labels[plan];
}

export function recommendPlan(teamSize: number): PlanTier {
  if (teamSize <= 3) return 'free';
  if (teamSize <= 15) return 'pro';
  return 'business';
}

export function nextPlan(plan: PlanTier): PlanTier | null {
  if (plan === 'free') return 'pro';
  if (plan === 'pro') return 'business';
  return null;
}
