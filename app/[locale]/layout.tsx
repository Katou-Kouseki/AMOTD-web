'use client';

import LanguageSwitcher from '../../src/components/LanguageSwitcher';

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <LanguageSwitcher />
    </div>
  );
} 