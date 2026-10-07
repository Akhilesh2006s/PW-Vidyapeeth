import { useEffect, useState, type FormEvent } from 'react';
import { api, authApi } from '../api';
import { useAuth } from '../auth';
import { Field, Page } from '../components/ui';
import { messageOf } from '../format';
import { useI18n } from '../language';
import type { StaffAccount, UiLanguage } from '../types';

const emptyMember = {
  name: '',
  email: '',
  jobTitle: 'Counsellor',
  phone: '',
  preferredLanguage: 'en' as UiLanguage,
  password: '',
};

export function SettingsPage() {
  const { t } = useI18n();
  const { user, counsellor, refresh } = useAuth();
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [member, setMember] = useState(emptyMember);
  const [team, setTeam] = useState<StaffAccount[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);

  async function loadTeam() {
    if (user?.role !== 'admin') return;
    const response = await api<{ data: StaffAccount[] }>('/users');
    setTeam(response.data);
  }

  useEffect(() => {
    loadTeam().catch((err) => setError(messageOf(err)));
  }, [user?.role]);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password.newPassword !== password.confirmPassword) {
      setError(t('settings.passwordMismatch'));
      return;
    }
    setPending(true);
    try {
      await authApi.changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refresh();
      setSuccess(t('settings.passwordChanged'));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  async function createMember(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setPending(true);
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(member) });
      setMember(emptyMember);
      await loadTeam();
      setSuccess(t('settings.accountCreated'));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page title={t('settings.title')} lede={t('settings.lede')}>
      {error ? <div className="banner danger">{error}</div> : null}
      {success ? <div className="banner ok">{success}</div> : null}
      <section className="grid cards-2">
        <article className="card stack">
          <h2>{t('settings.profile')}</h2>
          <div><strong>{user?.name}</strong><div className="muted">{user?.email}</div></div>
          <div className="row-between"><span>{t('settings.designation')}</span><strong>{user?.role === 'admin' ? t('settings.superAdmin') : counsellor?.jobTitle || t('settings.counsellor')}</strong></div>
          <div className="row-between"><span>{t('common.language')}</span><strong>{user?.preferredLanguage === 'te' ? t('lang.te') : t('lang.en')}</strong></div>
        </article>

        <form className="card form-grid" onSubmit={changePassword}>
          <h2>{t('settings.changePassword')}</h2>
          {user?.mustChangePassword ? <div className="banner">{t('settings.temporaryPassword')}</div> : null}
          <Field label={t('settings.currentPassword')}>
            <input type="password" required value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
          </Field>
          <Field label={t('settings.newPassword')} hint={t('settings.passwordHint')}>
            <input type="password" required minLength={10} value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
          </Field>
          <Field label={t('settings.confirmPassword')}>
            <input type="password" required minLength={10} value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} />
          </Field>
          <div className="form-actions"><button type="submit" disabled={pending}>{pending ? t('common.loading') : t('settings.updatePassword')}</button></div>
        </form>
      </section>

      {user?.role === 'admin' ? (
        <>
          <form className="card form-grid" onSubmit={createMember}>
            <h2>{t('settings.addTeamMember')}</h2>
            <p className="muted">{t('settings.addTeamHint')}</p>
            <div className="grid cards-2">
              <Field label={t('auth.name')}><input required value={member.name} onChange={(event) => setMember({ ...member, name: event.target.value })} /></Field>
              <Field label={t('auth.email')}><input type="email" required value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} /></Field>
              <Field label={t('settings.designation')}><input required value={member.jobTitle} onChange={(event) => setMember({ ...member, jobTitle: event.target.value })} /></Field>
              <Field label={t('auth.phone')}><input value={member.phone} onChange={(event) => setMember({ ...member, phone: event.target.value })} /></Field>
              <Field label={t('auth.uiLanguage')}>
                <select value={member.preferredLanguage} onChange={(event) => setMember({ ...member, preferredLanguage: event.target.value as UiLanguage })}>
                  <option value="en">{t('lang.en')}</option>
                  <option value="te">{t('lang.te')}</option>
                </select>
              </Field>
              <Field label={t('settings.temporaryPassword')} hint={t('settings.passwordHint')}>
                <input type="password" required minLength={10} value={member.password} onChange={(event) => setMember({ ...member, password: event.target.value })} />
              </Field>
            </div>
            <div className="form-actions"><button type="submit" disabled={pending}>{pending ? t('common.loading') : t('settings.createAccount')}</button></div>
          </form>

          <section className="card table-wrap">
            <h2>{t('settings.teamAccounts')}</h2>
            <table>
              <thead><tr><th>{t('auth.name')}</th><th>{t('auth.email')}</th><th>{t('settings.designation')}</th><th>{t('common.status')}</th></tr></thead>
              <tbody>
                {team.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong><div className="muted">{item.employeeCode}</div></td>
                    <td>{item.email}</td>
                    <td>{item.jobTitle}</td>
                    <td><span className={`badge ${item.mustChangePassword ? 'open' : 'completed'}`}>{item.mustChangePassword ? t('settings.changeRequired') : t('settings.ready')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </Page>
  );
}
