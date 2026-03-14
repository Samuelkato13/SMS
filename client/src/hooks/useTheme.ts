import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getTheme, RoleTheme } from '@/lib/roleThemes';

// Applies CSS custom properties to :root so Sidebar/Header can read them
function applyThemeVars(theme: RoleTheme) {
  const root = document.documentElement;
  root.style.setProperty('--theme-sidebar-from', theme.sidebarFrom);
  root.style.setProperty('--theme-sidebar-to', theme.sidebarTo);
  root.style.setProperty('--theme-active-from', theme.activeFrom);
  root.style.setProperty('--theme-active-to', theme.activeTo);
  root.style.setProperty('--theme-accent-from', theme.accentFrom);
  root.style.setProperty('--theme-accent-to', theme.accentTo);
  root.style.setProperty('--theme-glow', theme.glowColor);
  root.style.setProperty('--theme-header-accent', theme.headerAccentColor);
}

export function useTheme(): RoleTheme {
  const { profile } = useAuth();
  const theme = getTheme(profile?.role);

  useEffect(() => {
    applyThemeVars(theme);
  }, [profile?.role, theme]);

  return theme;
}
