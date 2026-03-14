// ─── Centralized Role Theme Configuration ────────────────────────────────────
// Change colors here — all UI accents update automatically.
//
// Each theme controls:
//   sidebarFrom / sidebarTo   — sidebar background gradient (dark shades)
//   activeFrom / activeTo     — active nav item gradient
//   accentFrom / accentTo     — avatar, logo icon, button gradient
//   glowColor                 — subtle box-shadow on active item
//   badgeClasses              — Tailwind classes for the role badge in the header
//   headerDotColor            — hex for the small accent dot/indicator in header

export interface RoleTheme {
  label: string;
  sidebarFrom: string;
  sidebarTo: string;
  activeFrom: string;
  activeTo: string;
  accentFrom: string;
  accentTo: string;
  glowColor: string;
  badgeClasses: string;
  headerAccentColor: string;
}

export const roleThemes: Record<string, RoleTheme> = {
  // ── System Admin → Red ──────────────────────────────────────────────────────
  admin: {
    label: 'System Admin',
    sidebarFrom: '#1e0505',
    sidebarTo: '#0d0d0d',
    activeFrom: '#dc2626',
    activeTo: '#991b1b',
    accentFrom: '#ef4444',
    accentTo: '#dc2626',
    glowColor: 'rgba(220,38,38,0.35)',
    badgeClasses: 'bg-red-100 text-red-700',
    headerAccentColor: '#dc2626',
  },

  // ── Director → Dark Blue ────────────────────────────────────────────────────
  director: {
    label: 'Director',
    sidebarFrom: '#030b1a',
    sidebarTo: '#0a1628',
    activeFrom: '#1d4ed8',
    activeTo: '#1e3a8a',
    accentFrom: '#3b82f6',
    accentTo: '#1d4ed8',
    glowColor: 'rgba(29,78,216,0.35)',
    badgeClasses: 'bg-blue-100 text-blue-800',
    headerAccentColor: '#1d4ed8',
  },

  // ── Head Teacher → Purple ───────────────────────────────────────────────────
  head_teacher: {
    label: 'Head Teacher',
    sidebarFrom: '#13052e',
    sidebarTo: '#0d0a1a',
    activeFrom: '#7c3aed',
    activeTo: '#5b21b6',
    accentFrom: '#8b5cf6',
    accentTo: '#7c3aed',
    glowColor: 'rgba(124,58,237,0.35)',
    badgeClasses: 'bg-purple-100 text-purple-700',
    headerAccentColor: '#7c3aed',
  },

  // ── Class Teacher → Green ───────────────────────────────────────────────────
  class_teacher: {
    label: 'Class Teacher',
    sidebarFrom: '#031a0a',
    sidebarTo: '#061208',
    activeFrom: '#16a34a',
    activeTo: '#14532d',
    accentFrom: '#22c55e',
    accentTo: '#16a34a',
    glowColor: 'rgba(22,163,74,0.35)',
    badgeClasses: 'bg-green-100 text-green-700',
    headerAccentColor: '#16a34a',
  },

  // ── Subject Teacher → Teal ──────────────────────────────────────────────────
  subject_teacher: {
    label: 'Subject Teacher',
    sidebarFrom: '#021a18',
    sidebarTo: '#041210',
    activeFrom: '#0d9488',
    activeTo: '#115e59',
    accentFrom: '#14b8a6',
    accentTo: '#0d9488',
    glowColor: 'rgba(13,148,136,0.35)',
    badgeClasses: 'bg-teal-100 text-teal-700',
    headerAccentColor: '#0d9488',
  },

  // ── Bursar → Orange ─────────────────────────────────────────────────────────
  bursar: {
    label: 'Bursar',
    sidebarFrom: '#1c0900',
    sidebarTo: '#110600',
    activeFrom: '#ea580c',
    activeTo: '#9a3412',
    accentFrom: '#f97316',
    accentTo: '#ea580c',
    glowColor: 'rgba(234,88,12,0.35)',
    badgeClasses: 'bg-orange-100 text-orange-700',
    headerAccentColor: '#ea580c',
  },
};

// Fallback for unknown roles
export const defaultTheme: RoleTheme = roleThemes.director;

export const getTheme = (role?: string | null): RoleTheme =>
  role ? (roleThemes[role] ?? defaultTheme) : defaultTheme;
