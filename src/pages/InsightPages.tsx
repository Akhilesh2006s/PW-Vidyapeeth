import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Bars, Page, TranslatedBadge } from '../components/ui';
import { FollowList } from './SessionPages';
import { formatWhen, messageOf } from '../format';
import { useI18n } from '../language';
import type { AnalyticsOverview, CounsellorPerformance, CoveragePoint, FollowUp, Student } from '../types';
import { useAuth } from '../auth';

export function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [points, setPoints] = useState<CoveragePoint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: AnalyticsOverview }>('/analytics/overview')
      .then((response) => setData(response.data))
      .catch((err) => setError(messageOf(err)));
    api<{ data: CoveragePoint[] }>('/coverage-points')
      .then((response) => setPoints(response.data))
      .catch((err) => setError(messageOf(err)));
  }, []);

  return (
    <Page
      title={`${t('dashboard.hello')}, ${user?.name?.split(' ')[0] || ''}`.trim()}
      lede={t('brand.tagline')}
      action={<Link className="btn" to="/sessions/new">{t('dashboard.start')}</Link>}
    >
      {error ? <div className="banner danger">{error}</div> : null}
      {data ? (
        <div className={`banner ${data.ai.configured ? 'ok' : ''}`}>
          {data.ai.configured ? t('dashboard.aiOn') : t('dashboard.aiOff')}
        </div>
      ) : null}
      <section className="grid stats">
        <Stat label={t('analytics.admissions')} value={data?.counts.admissions} />
        <Stat label={t('analytics.sessions')} value={data?.counts.sessions} />
        <Stat label={t('analytics.completed')} value={data?.counts.completedSessions} />
        <Stat label={t('analytics.openFollow')} value={data?.counts.openFollowUps} />
      </section>
      <section className="card">
        <h2>{t('dashboard.points')}</h2>
        {points.length ? (
          <ol className="point-pills">
            {points.map((point, index) => (
              <li key={point.id}><span>{index + 1}</span>{point.text}</li>
            ))}
          </ol>
        ) : (
          <p className="empty">{t('dashboard.pointsEmpty')}</p>
        )}
      </section>
      <section className="grid two">
        <article className="card">
          <h2>{t('dashboard.recent')}</h2>
          {data?.recentSessions.length ? data.recentSessions.map((session) => (
            <div className="row-between" key={session.id}>
              <div>
                <Link to={`/sessions/${session.id}`}>{session.title}</Link>
                <div className="muted">{session.studentName} · {session.parentName} · {formatWhen(session.startedAt, lang)}</div>
              </div>
              <TranslatedBadge prefix="status" value={session.status} />
            </div>
          )) : <p className="empty">{t('dashboard.emptySessions')}</p>}
        </article>
        <article className="card">
          <h2>{t('dashboard.follow')}</h2>
          {data?.followUpsDue.length ? <FollowList rows={data.followUpsDue} /> : <p className="empty">{t('dashboard.emptyFollow')}</p>}
        </article>
      </section>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <article className="card stat">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </article>
  );
}

export function FollowUpsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ studentId: '', action: '', priority: 'medium' });

  async function load() {
    const [followRes, studentRes] = await Promise.all([
      api<{ data: FollowUp[] }>('/follow-ups'),
      api<{ data: Student[] }>('/students'),
    ]);
    setRows(followRes.data);
    setStudents(studentRes.data);
    setForm((current) => ({ ...current, studentId: current.studentId || studentRes.data[0]?.id || '' }));
  }

  useEffect(() => { load().catch((err) => setError(messageOf(err))); }, []);

  return (
    <Page title={t('follow.title')}>
      {error ? <div className="banner danger">{error}</div> : null}
      <form
        className="card form-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await api('/follow-ups', { method: 'POST', body: JSON.stringify(form) });
            setForm({ ...form, action: '' });
            await load();
          } catch (err) {
            setError(messageOf(err));
          }
        }}
      >
        <div className="grid cards-2">
          <label className="field">
            <span>{t('sessions.student')}</span>
            <select value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}>
              {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('follow.action')}</span>
            <input required value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })} />
          </label>
        </div>
        <div className="form-actions"><button type="submit">{t('follow.add')}</button></div>
      </form>
      <section className="card">
        <FollowList rows={rows} onChanged={load} />
      </section>
    </Page>
  );
}

export function AnalyticsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ data: AnalyticsOverview }>('/analytics/overview')
      .then((response) => setData(response.data))
      .catch((err) => setError(messageOf(err)));
  }, []);

  const languageRows = Object.entries(data?.sessionsByLanguage || {}).map(([key, value]) => ({ label: t(`lang.${key}` as 'lang.en'), value }));
  const stageRows = Object.entries(data?.admissionsByStage || {}).map(([key, value]) => ({ label: t(`stage.${key}` as 'stage.enquiry'), value }));
  const statusRows = Object.entries(data?.sessionsByStatus || {}).map(([key, value]) => ({ label: t(`status.${key}` as 'status.completed'), value }));

  return (
    <Page title={t('analytics.title')}>
      {error ? <div className="banner danger">{error}</div> : null}
      <section className="grid stats">
        <article className="card stat"><span>{t('analytics.students')}</span><strong>{data?.counts.students ?? '—'}</strong></article>
        <article className="card stat"><span>{t('analytics.parents')}</span><strong>{data?.counts.parents ?? '—'}</strong></article>
        <article className="card stat"><span>{t('analytics.admissions')}</span><strong>{data?.counts.admissions ?? '—'}</strong></article>
        <article className="card stat"><span>{t('analytics.real')}</span><strong>{data?.ai.realAnalyses ?? '—'}</strong></article>
      </section>
      <section className="grid cards-2">
        <article className="card"><h2>{t('analytics.language')}</h2><Bars rows={languageRows} /></article>
        <article className="card"><h2>{t('analytics.stage')}</h2><Bars rows={stageRows} /></article>
        <article className="card"><h2>{t('analytics.status')}</h2><Bars rows={statusRows} /></article>
        <article className="card stack">
          <h2>{t('analysis.title')}</h2>
          <div className="row-between"><span>{t('analytics.real')}</span><strong>{data?.ai.realAnalyses ?? 0}</strong></div>
          <div className="row-between"><span>{t('analytics.placeholderCount')}</span><strong>{data?.ai.placeholderAnalyses ?? 0}</strong></div>
          <div className={`banner ${data?.ai.configured ? 'ok' : ''}`}>{data?.ai.configured ? t('dashboard.aiOn') : t('dashboard.aiOff')}</div>
        </article>
      </section>
    </Page>
  );
}

export function CounsellorPerformancePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<CounsellorPerformance | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ data: CounsellorPerformance }>('/analytics/counsellors')
      .then((response) => setData(response.data))
      .catch((err) => setError(messageOf(err)));
  }, []);
  const pct = (value: number | null) => value == null ? '—' : `${value}%`;
  const individual = data?.counsellors[0];
  const teamView = user?.role === 'admin' && data?.scope === 'team';
  return (
    <Page title={teamView ? t('performance.title') : t('performance.myTitle')} lede={teamView ? t('performance.lede') : t('performance.myLede')}>
      {error ? <div className="banner danger">{error}</div> : null}
      <section className="grid stats">
        <article className="card stat"><span>{teamView ? t('performance.teamScore') : t('performance.score')}</span><strong>{pct(teamView ? data?.summary.teamPerformanceScore ?? null : individual?.performanceScore ?? null)}</strong></article>
        {teamView ? <article className="card stat"><span>{t('performance.counsellors')}</span><strong>{data?.summary.counsellors ?? '—'}</strong></article> : <article className="card stat"><span>{t('parents.satisfaction')}</span><strong>{pct(individual?.satisfactionScore ?? null)}</strong></article>}
        <article className="card stat"><span>{t('analytics.sessions')}</span><strong>{teamView ? data?.summary.totalSessions ?? '—' : individual?.sessions ?? '—'}</strong></article>
        <article className="card stat"><span>{t('performance.enrollments')}</span><strong>{teamView ? data?.summary.enrollments ?? '—' : individual?.enrollments ?? '—'}</strong></article>
      </section>
      {teamView ? <section className="card table-wrap">
        <table>
          <thead><tr><th>{t('performance.counsellor')}</th><th>{t('performance.score')}</th><th>{t('parents.satisfaction')}</th><th>{t('performance.coverage')}</th><th>{t('performance.followUp')}</th><th>{t('performance.conversion')}</th><th>{t('analytics.sessions')}</th></tr></thead>
          <tbody>{data?.counsellors.map((row) => (
            <tr key={row.counsellorId}>
              <td><strong>{row.counsellorName}</strong><div className="muted">{row.employeeCode}</div></td>
              <td><strong>{pct(row.performanceScore)}</strong></td><td>{pct(row.satisfactionScore)}</td><td>{pct(row.coverageRate)}</td><td>{pct(row.followUpRate)}</td><td>{pct(row.conversionRate)}</td><td>{row.sessions}</td>
            </tr>
          ))}</tbody>
        </table>
      </section> : individual ? (
        <section className="grid stats">
          <article className="card stat"><span>{t('performance.coverage')}</span><strong>{pct(individual.coverageRate)}</strong></article>
          <article className="card stat"><span>{t('performance.followUp')}</span><strong>{pct(individual.followUpRate)}</strong></article>
          <article className="card stat"><span>{t('performance.conversion')}</span><strong>{pct(individual.conversionRate)}</strong></article>
          <article className="card stat"><span>{t('analytics.completed')}</span><strong>{individual.completedSessions}</strong></article>
        </section>
      ) : null}
      <section className="grid cards-2">
        {(teamView ? data?.counsellors : individual ? [individual] : []).map((row) => (
          <article className="card" key={`${row.counsellorId}-detail`}>
            <div className="row-between"><h2>{row.counsellorName}</h2><span className="badge ok">{pct(row.performanceScore)}</span></div>
            <h3>{t('performance.strengths')}</h3><ul className="list">{row.strengths.length ? row.strengths.map((item) => <li key={item}>{item}</li>) : <li>{t('common.none')}</li>}</ul>
            <h3>{t('performance.improvements')}</h3><ul className="list">{row.improvements.length ? row.improvements.map((item) => <li key={item}>{item}</li>) : <li>{t('common.none')}</li>}</ul>
          </article>
        ))}
      </section>
    </Page>
  );
}
