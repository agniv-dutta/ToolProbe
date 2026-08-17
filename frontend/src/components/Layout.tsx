import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  dark: boolean;
  onToggleDark: () => void;
  loading: boolean;
  tabs: readonly string[];
}

export function Layout({
  children,
  activeTab,
  onTabChange,
  onRefresh,
  dark,
  onToggleDark,
  loading,
  tabs,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-secondary-50 dark:bg-secondary-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-secondary-200/60 dark:border-secondary-700/60 backdrop-blur-xl bg-white/80 dark:bg-secondary-900/80">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-light to-primary-500 flex items-center justify-center text-white font-display font-bold text-sm shadow-card-sm">
                TP
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="font-display text-lg font-semibold tracking-tight text-secondary-900 dark:text-white">
                  Tool<span className="text-primary-500 dark:text-primary-light">Probe</span>
                </h1>
                <span className="hidden sm:inline font-serif italic text-xs text-secondary-400 dark:text-secondary-500">
                  AI Research Dashboard
                </span>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-serif italic font-medium tracking-wide transition-all duration-150 ${
                    activeTab === tab
                      ? "bg-primary-50 dark:bg-primary-50/10 text-primary-500 dark:text-primary-light"
                      : "text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="btn-ghost text-xs !px-3 !py-2 gap-1.5"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={onToggleDark}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all duration-150 text-secondary-500 dark:text-secondary-400"
                aria-label="Toggle dark mode"
              >
                {dark ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-secondary-100 dark:border-secondary-800 px-4 py-2 overflow-x-auto">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif italic font-medium whitespace-nowrap transition-all duration-150 ${
                  activeTab === tab
                    ? "bg-primary-50 dark:bg-primary-50/10 text-primary-500 dark:text-primary-light"
                    : "text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-10 flex items-center justify-center">
          <p className="text-xs text-secondary-400 dark:text-secondary-500 font-serif italic">
            Built with AI · Verified accuracy · Open source
          </p>
        </div>
      </footer>
    </div>
  );
}
