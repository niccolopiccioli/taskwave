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
  | 'boardBranding'
  | 'globalSearch'
  | 'aiAssistant'
  | 'calendarView'
  | 'ganttView'
  | 'listView'
  | 'taskDependencies'
  | 'recurringTasks'
  | 'automationRules'
  | 'timeTracking'
  | 'bulkOperations'
  | 'goals'
  | 'gitIntegration'
  | 'templatesMarketplace'
  | 'savedFilters'
  | 'labels'
  | 'taskChecklists'
  | 'taskTags'
  | 'taskReminders';

export interface PlanConfig {
  maxWorkspaces: number;
  maxMembersPerWorkspace: number;
  maxBoardsPerWorkspace: number;
  maxAttachmentBytes: number;
  features: PlanFeature[];
  aiDailyLimit: number;
  maxDependenciesPerBoard: number;
  maxAutomationRules: number;
  maxGoals: number;
  maxGitRepos: number;
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
    features: [
      'boardBranding',
      'globalSearch',
      'calendarView',
      'bulkOperations',
      'taskChecklists',
      'taskTags',
    ],
    aiDailyLimit: 5,
    maxDependenciesPerBoard: 3,
    maxAutomationRules: 0,
    maxGoals: 0,
    maxGitRepos: 0,
    price: '€0',
    priceMonthly: 0,
    description: 'Perfetto per progetti personali',
    marketingFeatures: [
      'Fino a 3 workspace',
      '5 membri per workspace',
      'Max 3 board per workspace',
      'Vista Kanban standard',
      'Task con titolo e priorità',
      'Ricerca globale e filtri',
      'Checklist e tag sui task',
      'Vista calendario',
      'Operazioni in massa',
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
      'globalSearch',
      'aiAssistant',
      'calendarView',
      'listView',
      'taskDependencies',
      'recurringTasks',
      'automationRules',
      'timeTracking',
      'bulkOperations',
      'goals',
      'gitIntegration',
      'savedFilters',
      'labels',
      'taskChecklists',
      'taskTags',
      'taskReminders',
    ],
    aiDailyLimit: 50,
    maxDependenciesPerBoard: Infinity,
    maxAutomationRules: 3,
    maxGoals: 3,
    maxGitRepos: 1,
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
      'Inviti al team email + link',
      'Accent color per workspace',
      'AI Assistant (50 richieste/giorno)',
      'Vista Kanban + Lista + Calendario',
      'Dipendenze tra task',
      'Task ricorrenti',
      'Automazioni (3 regole)',
      'Time tracking',
      'OKR & Goals (3 obiettivi)',
      'GitHub/GitLab (1 repo)',
      'Filtri salvati e label',
      'Checklist e tag',
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
      'globalSearch',
      'aiAssistant',
      'calendarView',
      'ganttView',
      'listView',
      'taskDependencies',
      'recurringTasks',
      'automationRules',
      'timeTracking',
      'bulkOperations',
      'goals',
      'gitIntegration',
      'templatesMarketplace',
      'savedFilters',
      'labels',
      'taskChecklists',
      'taskTags',
      'taskReminders',
    ],
    aiDailyLimit: 999999,
    maxDependenciesPerBoard: Infinity,
    maxAutomationRules: Infinity,
    maxGoals: Infinity,
    maxGitRepos: Infinity,
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
      'Vista Gantt/Timeline',
      'Automazioni illimitate',
      'AI Assistant illimitato',
      'OKR & Goals illimitati',
      'GitHub/GitLab illimitato',
      'Template marketplace',
      'SSO / SAML (su richiesta)',
    ],
  },
};

export const PLAN_LIMITS = {
  free: { maxWorkspaces: 3, maxMembersPerWorkspace: 5, maxBoardsPerWorkspace: 3 },
  pro: { maxWorkspaces: Infinity, maxMembersPerWorkspace: 20, maxBoardsPerWorkspace: Infinity },
  business: { maxWorkspaces: Infinity, maxMembersPerWorkspace: Infinity, maxBoardsPerWorkspace: Infinity },
};

export const PLAN_ORDER: PlanTier[] = ['free', 'pro', 'business'];

export const COMPARISON_MATRIX: Array<{
  category: string;
  rows: Array<{ label: string; free: string | boolean; pro: string | boolean; business: string | boolean }>;
}> = [
  {
    category: 'Team',
    rows: [
      { label: 'Workspace', free: '3', pro: 'Illimitati', business: 'Illimitati' },
      { label: 'Membri per workspace', free: '5', pro: '20', business: 'Illimitati' },
      { label: 'Inviti al team', free: false, pro: true, business: true },
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
      { label: 'Dipendenze task', free: '3/board', pro: true, business: true },
      { label: 'Checklist & Tag', free: true, pro: true, business: true },
      { label: 'Task ricorrenti', free: false, pro: true, business: true },
    ],
  },
  {
    category: 'Viste',
    rows: [
      { label: 'Kanban', free: true, pro: true, business: true },
      { label: 'Calendario', free: true, pro: true, business: true },
      { label: 'Lista', free: false, pro: true, business: true },
      { label: 'Timeline / Gantt', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'AI & Automazione',
    rows: [
      { label: 'AI Assistant', free: '5/giorno', pro: '50/giorno', business: 'Illimitato' },
      { label: 'Ricerca globale', free: true, pro: true, business: true },
      { label: 'Filtri salvati', free: false, pro: true, business: true },
      { label: 'Automazioni', free: false, pro: '3 regole', business: 'Illimitate' },
    ],
  },
  {
    category: 'Produttività',
    rows: [
      { label: 'Time tracking', free: false, pro: true, business: true },
      { label: 'OKR & Goals', free: false, pro: '3 obiettivi', business: 'Illimitati' },
      { label: 'GitHub/GitLab', free: false, pro: '1 repo', business: 'Illimitati' },
      { label: 'Operazioni in massa', free: true, pro: true, business: true },
    ],
  },
  {
    category: 'Enterprise',
    rows: [
      { label: 'Audit log', free: false, pro: false, business: true },
      { label: 'API keys', free: false, pro: false, business: true },
      { label: 'Webhook outbound', free: false, pro: false, business: true },
      { label: 'Template marketplace', free: false, pro: false, business: true },
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

export function getAiDailyLimit(plan: PlanTier): number {
  return PLAN_CONFIG[plan].aiDailyLimit;
}

export function getMaxDependencies(plan: PlanTier): number {
  return PLAN_CONFIG[plan].maxDependenciesPerBoard;
}

export function getMaxAutomationRules(plan: PlanTier): number {
  return PLAN_CONFIG[plan].maxAutomationRules;
}

export function getMaxGoals(plan: PlanTier): number {
  return PLAN_CONFIG[plan].maxGoals;
}

export function getMaxGitRepos(plan: PlanTier): number {
  return PLAN_CONFIG[plan].maxGitRepos;
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
