import type { UserProfile } from './store/authStore';

export const ALL_MODULES = [
  'leads',
  'clients',
  'projects',
  'tasks',
  'followups',
  'team',
  'people',
  'billing',
  'reports',
  'whatsapp',
  'marketing',
  'seo',
  'products',
  'servers',
  'knowledge',
  'settings',
  'office',
] as const;

export type ModuleKey = (typeof ALL_MODULES)[number];

const ALIASES: Record<string, ModuleKey> = {
  finance: 'billing',
  infrastructure: 'servers',
};

const ROLE_MODULES: Record<string, readonly ModuleKey[]> = {
  superadmin: ALL_MODULES,
  admin: ALL_MODULES,
  manager: ['leads', 'clients', 'projects', 'tasks', 'followups', 'team', 'people', 'reports', 'whatsapp', 'knowledge', 'office'],
  hr: ['tasks', 'team', 'people', 'knowledge', 'office'],
  finance: ['clients', 'tasks', 'team', 'billing', 'reports', 'knowledge', 'office'],
  developer: ['projects', 'tasks', 'products', 'whatsapp', 'knowledge', 'team', 'office'],
  designer: ['projects', 'tasks', 'products', 'whatsapp', 'knowledge', 'team', 'office'],
  marketer: ['leads', 'tasks', 'followups', 'marketing', 'seo', 'whatsapp', 'knowledge', 'team', 'office'],
  support: ['clients', 'tasks', 'followups', 'whatsapp', 'knowledge', 'team', 'office'],
};

export const DESKS: Record<string, { name: string; blurb: string }> = {
  superadmin: { name: 'Agency desk', blurb: 'The whole studio, in one place.' },
  admin: { name: 'Agency desk', blurb: 'The team, the work, and the money.' },
  manager: { name: 'Studio desk', blurb: 'Delivery, the pipeline, and the people on the floor.' },
  hr: { name: 'People desk', blurb: 'Who is in, who is missing, and which leave needs a decision.' },
  finance: { name: 'Money desk', blurb: 'What is collected, what is still owed, and what to chase today.' },
  developer: { name: 'Build desk', blurb: 'Punch in, then finish the tasks that are due today.' },
  designer: { name: 'Build desk', blurb: 'Punch in, then finish the tasks that are due today.' },
  marketer: { name: 'Growth desk', blurb: 'Today’s leads, follow-ups, and campaigns.' },
  support: { name: 'Care desk', blurb: 'Clients who are waiting, and the next follow-up.' },
};

export function deskFor(role?: string) {
  return DESKS[role || 'developer'] || DESKS.developer;
}

export function modulesFor(user: Pick<UserProfile, 'role' | 'modules' | 'custom_permissions'> | null | undefined): ModuleKey[] {
  if (user?.modules?.length) {
    return user.modules.filter((item): item is ModuleKey => (ALL_MODULES as readonly string[]).includes(item));
  }
  const role = user?.role || 'developer';
  const base = new Set<ModuleKey>(ROLE_MODULES[role] || ROLE_MODULES.developer);
  for (const item of user?.custom_permissions || []) {
    const key = ALIASES[item] || item;
    if ((ALL_MODULES as readonly string[]).includes(key)) base.add(key as ModuleKey);
  }
  return [...base];
}

export function can(user: Pick<UserProfile, 'role' | 'modules' | 'custom_permissions'> | null | undefined, module: ModuleKey) {
  return modulesFor(user).includes(module);
}
