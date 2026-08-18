'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, ShieldCheck, UserCog } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import AccountInfoTab from './AccountInfoTab';
import SecurityTab from './SecurityTab';
import PurchaseHistoryTab from './PurchaseHistoryTab';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Tabbed profile hub. Owns only tab selection — data and mutations come from
 * `useStudentProfile`, and each tab renders one slice of it.
 */
export default function StudentProfileClient({ dictionary, lang }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  const labels = useMemo(
    () => ({ ...(dictionary.auth || {}), ...(dictionary.dashboard || {}) }),
    [dictionary]
  );

  const {
    profile,
    orders,
    isLoading,
    isOrdersLoading,
    saveAccountInfo,
    saveAvatar,
    savePassword,
    saveNotifications,
  } = useStudentProfile(user, { enabled: !isAuthLoading });

  const tabs = [
    { id: 'account', label: labels.accountTab, icon: UserCog },
    { id: 'security', label: labels.securityTab, icon: ShieldCheck },
    { id: 'purchases', label: labels.purchasesTab, icon: Receipt },
  ];

  return (
    <DashboardShell dictionary={dictionary} lang={lang}>
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{labels.profileHubTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">{labels.profileHubSubtitle}</p>
      </header>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label={labels.profileHubTitle}
        className="mt-7 flex w-full gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90 dark:shadow-xl dark:shadow-black/30"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200'
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="profileTabIndicator"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 shadow-lg shadow-plum-900/40"
                  aria-hidden
                />
              ) : null}
              <tab.icon className="relative z-10 h-4 w-4" aria-hidden />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-4" aria-hidden>
            <div className="h-32 animate-pulse rounded-3xl bg-gray-200 dark:bg-white/5" />
            <div className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-white/5" />
          </div>
        ) : (
          <>
            <section
              role="tabpanel"
              id="panel-account"
              aria-labelledby="tab-account"
              hidden={activeTab !== 'account'}
            >
              {activeTab === 'account' ? (
                <AccountInfoTab
                  profile={profile}
                  labels={labels}
                  lang={lang}
                  onSave={saveAccountInfo}
                  onSaveAvatar={saveAvatar}
                />
              ) : null}
            </section>

            <section
              role="tabpanel"
              id="panel-security"
              aria-labelledby="tab-security"
              hidden={activeTab !== 'security'}
            >
              {activeTab === 'security' ? (
                <SecurityTab
                  profile={profile}
                  labels={labels}
                  authLabels={dictionary.auth || {}}
                  lang={lang}
                  onSavePassword={savePassword}
                  onSaveNotifications={saveNotifications}
                />
              ) : null}
            </section>

            <section
              role="tabpanel"
              id="panel-purchases"
              aria-labelledby="tab-purchases"
              hidden={activeTab !== 'purchases'}
            >
              {activeTab === 'purchases' ? (
                <PurchaseHistoryTab
                  orders={orders}
                  isLoading={isOrdersLoading}
                  labels={labels}
                  lang={lang}
                />
              ) : null}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
