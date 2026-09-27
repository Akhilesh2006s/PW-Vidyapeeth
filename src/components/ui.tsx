import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { useI18n } from '../language';
import type { MessageKey } from '../i18n';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Badge({ value }: { value: string }) {
  return <span className={`badge ${value}`}>{value.replaceAll('_', ' ')}</span>;
}

export function TranslatedBadge({ value, prefix }: { value: string; prefix: 'status' | 'stage' | 'priority' | 'lang' | 'relation' | 'owner' }) {
  const { t } = useI18n();
  const key = `${prefix}.${value}` as MessageKey;
  const label = key in { [`${prefix}.${value}`]: true } ? value : value;
  void label;
  return <span className={`badge ${value}`}>{t(key)}</span>;
}

const links: Array<{ to: string; key: MessageKey; end?: boolean; admin?: boolean }> = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/sessions', key: 'nav.sessions' },
  { to: '/admissions', key: 'nav.admissions' },
  { to: '/points', key: 'nav.points', admin: true },
];

export function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PW</div>
          <div>
            <strong>PW Vidyapeeth</strong>
            <span>{t('brand.tagline')}</span>
          </div>
        </div>
        <nav className="nav">
          {links
            .filter((link) => !link.admin || user?.role === 'admin')
            .map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end}>
                {t(link.key)}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="ghost" onClick={logout}>
            {t('common.logout')}
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="who">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div className="lang-toggle" role="group" aria-label={t('common.language')}>
              <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                EN
              </button>
              <button type="button" className={lang === 'te' ? 'active' : ''} onClick={() => setLang('te')}>
                తె
              </button>
            </div>
            <button type="button" className="secondary" onClick={logout}>
              {t('common.logout')}
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export function Page({ title, lede, action, children }: { title: string; lede?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}

export function LoadingBlock() {
  const { t } = useI18n();
  return (
    <div className="center-screen">
      <span className="spinner" />
      <span>{t('common.loading')}</span>
    </div>
  );
}

export function Bars({ rows }: { rows: Array<{ label: string; value: number; tone?: 'ok' | 'miss' | 'open' }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return null;
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track">
            <div className={row.tone || ''} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}
