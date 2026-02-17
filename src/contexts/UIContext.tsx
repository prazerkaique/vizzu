import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// Types (mesmos do App.tsx)
export type Page = 'dashboard' | 'create' | 'studio' | 'provador' | 'look-composer' | 'lifestyle' | 'creative-still' | 'product-studio' | 'models' | 'products' | 'clients' | 'settings' | 'gallery';
export type SettingsTab = 'profile' | 'plan' | 'integrations' | 'history';
export type VizzuTheme = 'light' | 'dark' | 'high-contrast' | 'v2';

const VALID_THEMES: VizzuTheme[] = ['light', 'dark', 'high-contrast', 'v2'];

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
}

interface UIContextType {
  // Theme
  theme: VizzuTheme;
  selectedTheme: VizzuTheme;
  isV2: boolean;
  setTheme: React.Dispatch<React.SetStateAction<VizzuTheme>>;

  // Navigation
  currentPage: Page;
  navigateTo: (page: Page) => void;
  goBack: () => void;

  // Settings
  settingsTab: SettingsTab;
  setSettingsTab: React.Dispatch<React.SetStateAction<SettingsTab>>;
  showSettingsDropdown: boolean;
  setShowSettingsDropdown: React.Dispatch<React.SetStateAction<boolean>>;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  // Toast
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info', action?: ToastAction) => void;
  dismissToast: () => void;

  // Success notification
  successNotification: string | null;
  setSuccessNotification: React.Dispatch<React.SetStateAction<string | null>>;

  // Video tutorial
  showVideoTutorial: 'studio' | 'provador' | null;
  setShowVideoTutorial: React.Dispatch<React.SetStateAction<'studio' | 'provador' | null>>;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Theme — selectedTheme is the real stored value; theme is the "render" base (v2 → light)
  const [selectedTheme, setSelectedTheme] = useState<VizzuTheme>(() => {
    const saved = localStorage.getItem('vizzu_theme');
    if (saved && VALID_THEMES.includes(saved as VizzuTheme)) return saved as VizzuTheme;
    return 'light';
  });
  const theme: VizzuTheme = selectedTheme === 'v2' ? 'light' : selectedTheme;
  const isV2 = selectedTheme === 'v2';

  // Navigation
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('vizzu_currentPage');
    return (saved as Page) || 'dashboard';
  });
  const [pageHistory, setPageHistory] = useState<Page[]>([]);

  const navigateTo = useCallback((page: Page) => {
    setCurrentPage(prev => {
      if (page === prev) return prev;
      setPageHistory(h => [...h, prev]);
      return page;
    });
  }, []);

  const goBack = useCallback(() => {
    setPageHistory(prev => {
      if (prev.length === 0) {
        setCurrentPage(current => current !== 'dashboard' ? 'dashboard' : current);
        return prev;
      }
      const newHistory = [...prev];
      const previousPage = newHistory.pop()!;
      setCurrentPage(previousPage);
      return newHistory;
    });
  }, []);

  // Settings
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('vizzu_sidebar') === 'collapsed';
  });

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', action?: ToastAction) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, action });
    const duration = action ? 6000 : type === 'error' ? 10000 : 3000;
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);
  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // Success notification
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Video tutorial
  const [showVideoTutorial, setShowVideoTutorial] = useState<'studio' | 'provador' | null>(null);

  // Persist currentPage
  useEffect(() => {
    localStorage.setItem('vizzu_currentPage', currentPage);
  }, [currentPage]);

  // Persist theme + update PWA meta + toggle HC/V2 class
  useEffect(() => {
    localStorage.setItem('vizzu_theme', selectedTheme);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])') || document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isV2 ? '#F9FAFB' : theme === 'light' ? '#F8F6F2' : '#000000');
    }
    document.documentElement.classList.toggle('theme-hc', selectedTheme === 'high-contrast');
    document.documentElement.classList.toggle('theme-v2', isV2);
  }, [selectedTheme, theme, isV2]);

  // Persist sidebar
  useEffect(() => {
    localStorage.setItem('vizzu_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  return (
    <UIContext.Provider value={{
      theme, selectedTheme, isV2, setTheme: setSelectedTheme,
      currentPage, navigateTo, goBack,
      settingsTab, setSettingsTab,
      showSettingsDropdown, setShowSettingsDropdown,
      sidebarCollapsed, setSidebarCollapsed,
      toast, showToast, dismissToast,
      successNotification, setSuccessNotification,
      showVideoTutorial, setShowVideoTutorial,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
}
