import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Field } from '../components/ui';
import { messageOf } from '../format';
import { useI18n } from '../language';

export function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  if (user) return <Navigate to="/" replace />;

  return (
    <AuthFrame>
      <form
        className="auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError('');
          try {
            await login(email, password);
          } catch (err) {
            setError(messageOf(err));
          } finally {
            setPending(false);
          }
        }}
      >
        <h2>{t('auth.welcome')}</h2>
        <p className="muted">{t('auth.subtitle')}</p>
        {error ? <div className="banner danger">{error}</div> : null}
        <Field label={t('auth.email')}>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label={t('auth.password')}>
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('auth.signIn')}
        </button>
        <p>
          {t('auth.noAccount')} <Link className="linkish" to="/register">{t('auth.signUp')}</Link>
        </p>
        <LanguageRow lang={lang} setLang={setLang} />
      </form>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { t, lang, setLang } = useI18n();
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', preferredLanguage: lang });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  if (user) return <Navigate to="/" replace />;

  return (
    <AuthFrame>
      <form
        className="auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError('');
          try {
            await register(form);
          } catch (err) {
            setError(messageOf(err));
          } finally {
            setPending(false);
          }
        }}
      >
        <h2>{t('auth.create')}</h2>
        <p className="muted">{t('auth.registerSubtitle')}</p>
        {error ? <div className="banner danger">{error}</div> : null}
        <Field label={t('auth.name')}>
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label={t('auth.email')}>
          <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label={t('auth.phone')}>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
        <Field label={t('auth.password')}>
          <input type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </Field>
        <Field label={t('auth.uiLanguage')}>
          <select
            value={form.preferredLanguage}
            onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as 'en' | 'te' })}
          >
            <option value="en">{t('lang.en')}</option>
            <option value="te">{t('lang.te')}</option>
          </select>
        </Field>
        <button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('auth.signUp')}
        </button>
        <p>
          {t('auth.hasAccount')} <Link className="linkish" to="/login">{t('auth.signIn')}</Link>
        </p>
        <LanguageRow lang={lang} setLang={setLang} />
      </form>
    </AuthFrame>
  );
}

function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div>
          <div className="brand-mark">PW</div>
          <h1>PW Vidyapeeth</h1>
          <p>{t('brand.aside')}</p>
        </div>
        <p className="muted">{t('brand.tagline')}</p>
      </aside>
      <section className="auth-panel">{children}</section>
    </div>
  );
}

function LanguageRow({ lang, setLang }: { lang: 'en' | 'te'; setLang: (lang: 'en' | 'te') => void }) {
  const { t } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label={t('common.language')}>
      <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" className={lang === 'te' ? 'active' : ''} onClick={() => setLang('te')}>
        తె
      </button>
    </div>
  );
}
