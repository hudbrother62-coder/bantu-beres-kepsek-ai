'use client';

import {
  BarChart3,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '@/app/actions';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generator', label: 'Generator AI', icon: Sparkles },
  { href: '/dokumen', label: 'Pustaka Dokumen', icon: FileStack },
  { href: '/profil-sekolah', label: 'Profil Sekolah', icon: UserCog },
  { href: '/program-kerja', label: 'Program Kerja', icon: CalendarRange },
  { href: '/kehadiran', label: 'Kehadiran Guru', icon: UsersRound },
  { href: '/kinerja', label: 'Kinerja & Supervisi', icon: ClipboardCheck },
  { href: '/analisis-mutu', label: 'Mutu & PBD', icon: BarChart3 },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
] as const;

export function AppShell({
  children,
  schoolName,
  principalName,
  email,
}: {
  children: React.ReactNode;
  schoolName: string;
  principalName: string;
  email: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const current = navigation.find(
    (item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)),
  );

  return (
    <div className="workspace-shell">
      <aside className={drawerOpen ? 'workspace-sidebar is-open' : 'workspace-sidebar'}>
        <div className="sidebar-brand-row">
          <Brand href="/dashboard" />
          <button className="icon-button sidebar-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Tutup menu">
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="workspace-nav" aria-label="Navigasi utama">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link className={active ? 'workspace-nav__item is-active' : 'workspace-nav__item'} href={item.href} key={item.href} onClick={() => setDrawerOpen(false)} aria-current={active ? 'page' : undefined}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
                {active ? <ChevronRight className="workspace-nav__chevron" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <span className="avatar">{principalName.trim().charAt(0).toUpperCase() || 'K'}</span>
          <span className="sidebar-account__copy">
            <strong>{principalName}</strong>
            <small>{email || schoolName}</small>
          </span>
          <form action={logoutAction}>
            <button className="icon-button icon-button--quiet" type="submit" aria-label="Keluar">
              <LogOut aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      {drawerOpen ? <button className="sidebar-backdrop" type="button" onClick={() => setDrawerOpen(false)} aria-label="Tutup menu" /> : null}

      <div className="workspace-main">
        <header className="workspace-header">
          <button className="icon-button mobile-menu" type="button" onClick={() => setDrawerOpen(true)} aria-label="Buka menu">
            <Menu aria-hidden="true" />
          </button>
          <div className="workspace-header__title">
            <span>{current?.label || 'Bantu Beres Kepsek AI'}</span>
            <small>{schoolName}</small>
          </div>
          <div className="workspace-header__actions">
            <ThemeToggle />
            <Link className="button button--primary button--small header-generate" href="/generator">
              <Sparkles aria-hidden="true" />
              <span>Buat dokumen</span>
            </Link>
          </div>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
