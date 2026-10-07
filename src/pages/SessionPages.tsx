import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiBlob } from '../api';
import { useAuth } from '../auth';
import { AnalysisView, TranscriptView } from '../components/AnalysisView';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { Field, Page, TranslatedBadge } from '../components/ui';
import { formatDuration, formatWhen, messageOf, personName } from '../format';
import { useI18n } from '../language';
import type { CoveragePoint, FollowUp, Parent, Session, SessionBundle, SpokenLanguage, Student } from '../types';
import type { MessageKey } from '../i18n';
import { sampleConversation } from '../sampleConversation';

const languages: SpokenLanguage[] = ['te', 'en', 'mixed'];

export function SessionsPage() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ data: Session[] }>('/sessions')
      .then((response) => setSessions(response.data))
      .catch((err) => setError(messageOf(err)));
  }, []);

  return (
    <Page title={t('sessions.title')} action={<Link className="btn" to="/sessions/new">{t('sessions.new')}</Link>}>
      {error ? <div className="banner danger">{error}</div> : null}
      <section className="card table-wrap">
        {sessions.length ? (
          <table>
            <thead>
              <tr>
                <th>{t('sessions.titleField')}</th>
                <th>{t('sessions.studentName')}</th>
                <th>{t('sessions.parentName')}</th>
                <th>{t('common.language')}</th>
                <th>{t('common.status')}</th>
                <th>{t('recorder.duration')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.title}</td>
                  <td>{session.studentName}</td>
                  <td>{session.parentName}</td>
                  <td><TranslatedBadge prefix="lang" value={session.language} /></td>
                  <td><TranslatedBadge prefix="status" value={session.status} /></td>
                  <td>{formatDuration(session.durationSeconds)}</td>
                  <td><Link to={`/sessions/${session.id}`}>{t('common.open')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty">{t('sessions.empty')}</p>}
      </section>
    </Page>
  );
}

export function NewSessionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [form, setForm] = useState({
    studentId: '',
    parentId: '',
    studentName: '',
    parentName: '',
    language: 'mixed' as SpokenLanguage,
    title: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      api<{ data: Student[] }>('/students'),
      api<{ data: Parent[] }>('/parents'),
    ]).then(([studentResponse, parentResponse]) => {
      setStudents(studentResponse.data);
      setParents(parentResponse.data);
    }).catch((err) => setError(messageOf(err)));
  }, []);

  return (
    <Page title={t('sessions.new')} lede={t('sessions.languageHint')}>
      {error ? <div className="banner danger">{error}</div> : null}
      <form
        className="card form-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const response = await api<{ data: Session }>('/sessions', {
              method: 'POST',
              body: JSON.stringify(form),
            });
            navigate(`/sessions/${response.data.id}`);
          } catch (err) {
            setError(messageOf(err));
          }
        }}
      >
        <Field label={t('sessions.student')}>
          <select value={form.studentId} onChange={(event) => {
            const student = students.find((item) => item.id === event.target.value);
            setForm({ ...form, studentId: event.target.value, studentName: student?.fullName || form.studentName });
          }}>
            <option value="">{t('sessions.manualEntry')}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
          </select>
        </Field>
        <Field label={t('sessions.studentName')}>
          <input required minLength={2} value={form.studentName} onChange={(event) => setForm({ ...form, studentName: event.target.value })} />
        </Field>
        <Field label={t('sessions.parentRecord')}>
          <select value={form.parentId} onChange={(event) => {
            const parent = parents.find((item) => item.id === event.target.value);
            setForm({ ...form, parentId: event.target.value, parentName: parent?.fullName || form.parentName });
          }}>
            <option value="">{t('sessions.manualEntry')}</option>
            {parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.fullName}{parent.phone ? ` · ${parent.phone}` : ''}</option>)}
          </select>
        </Field>
        <Field label={t('sessions.parentName')}>
          <input required minLength={2} value={form.parentName} onChange={(event) => setForm({ ...form, parentName: event.target.value })} />
        </Field>
        <Field label={t('common.language')} hint={t('sessions.languageHint')}>
          <select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value as SpokenLanguage })}>
            {languages.map((language) => <option key={language} value={language}>{t(`lang.${language}`)}</option>)}
          </select>
        </Field>
        <Field label={t('sessions.titleField')}>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <Field label={t('common.notes')}>
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
        <div className="form-actions">
          <button type="submit">{t('sessions.start')}</button>
        </div>
      </form>
    </Page>
  );
}

export function SessionPage() {
  const { id, panel } = useParams();
  const { t, lang } = useI18n();
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [playback, setPlayback] = useState<string | null>(null);
  const [conversation, setConversation] = useState('');
  const [followAction, setFollowAction] = useState('');
  const [points, setPoints] = useState<string[]>([]);

  async function load(quiet = false) {
    try {
      const response = await api<{ data: SessionBundle }>(`/sessions/${id}`);
      setBundle(response.data);
      setError('');
      if (response.data.session.status === 'processing') setPhase('processing');
      else if (phase === 'processing') setPhase('idle');
    } catch (err) {
      if (!quiet) setError(messageOf(err));
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
    api<{ data: CoveragePoint[] }>('/coverage-points')
      .then((response) => setPoints(response.data.map((point) => point.text)))
      .catch(() => setPoints([]));
  }, [id]);

  useEffect(() => {
    if (bundle?.transcript?.source === 'text' && bundle.transcript.text) {
      setConversation(bundle.transcript.text);
    }
  }, [bundle?.transcript?.source, bundle?.transcript?.text]);

  useEffect(() => {
    if (bundle?.session.status !== 'processing') return;
    const timer = window.setInterval(() => {
      load(true).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [bundle?.session.status, id]);

  useEffect(() => {
    if (!bundle?.audio || !id) {
      setPlayback(null);
      return;
    }
    let url = '';
    let cancelled = false;
    apiBlob(`/sessions/${id}/audio`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPlayback(url);
      })
      .catch(() => setPlayback(null));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bundle?.audio?.id, id]);

  if (!bundle && !error) return <Page title={t('common.loading')}><span className="spinner" /></Page>;
  if (!bundle) return <Page title={t('sessions.workspace')}><div className="banner danger">{error}</div></Page>;

  const session = bundle.session;
  const active = panel || (session.status === 'completed' ? 'analysis' : 'record');
  const steps: Array<{ key: MessageKey; on: boolean; bad?: boolean }> = [
    { key: 'pipeline.record', on: true },
    { key: 'pipeline.upload', on: session.status !== 'in_progress' },
    { key: 'pipeline.transcribe', on: ['processing', 'completed', 'failed'].includes(session.status) },
    { key: 'pipeline.analyse', on: ['processing', 'completed', 'failed'].includes(session.status), bad: session.status === 'failed' },
    { key: 'pipeline.done', on: session.status === 'completed' },
  ];

  async function submit(blob: Blob, durationSeconds: number, filename: string) {
    setPhase('uploading');
    setError('');
    try {
      const form = new FormData();
      form.append('audio', blob, filename || 'counselling.webm');
      form.append('durationSeconds', String(durationSeconds));
      await api(`/sessions/${id}/audio`, { method: 'POST', body: form });
      setPhase('processing');
      await api(`/sessions/${id}/process`, { method: 'POST' });
      await load();
    } catch (err) {
      setPhase('idle');
      setError(messageOf(err));
    }
  }

  async function submitText(event: FormEvent) {
    event.preventDefault();
    setPhase('processing');
    setError('');
    try {
      await api(`/sessions/${id}/text`, { method: 'POST', body: JSON.stringify({ text: conversation }) });
      await load();
    } catch (err) {
      setPhase('idle');
      setError(messageOf(err));
    }
  }

  return (
    <Page
      title={session.title || t('sessions.workspace')}
      lede={`${session.studentName} · ${session.parentName} · ${formatWhen(session.startedAt, lang)}`}
      action={<Link className="btn secondary" to="/sessions">{t('common.back')}</Link>}
    >
      <div className="row-between">
        <div className="pipeline">
          {steps.map((step) => (
            <span key={step.key} className={`step ${step.bad ? 'bad' : ''} ${step.on ? 'on' : ''}`}>{t(step.key)}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <TranslatedBadge prefix="lang" value={session.language} />
          <TranslatedBadge prefix="status" value={session.status} />
        </div>
      </div>
      {error ? <div className="banner danger">{error}</div> : null}
      {session.status === 'failed' ? <div className="banner danger">{session.processingError || t('sessions.failed')}</div> : null}
      {phase === 'uploading' ? <div className="card processing-card"><span className="spinner" /> {t('sessions.uploading')}</div> : null}
      {session.status === 'processing' || phase === 'processing' ? (
        <div className="card processing-card"><span className="spinner" /> {t('sessions.processing')}</div>
      ) : null}

      <div className="tabs">
        {(['record', 'transcript', 'analysis', 'follow'] as const).map((item) => (
          <Link key={item} className={`btn ${active === item ? '' : 'secondary'}`} to={item === 'record' ? `/sessions/${id}` : `/sessions/${id}/${item}`}>
            {t(`panel.${item}`)}
          </Link>
        ))}
      </div>

      {active === 'record' ? (
        <div className="stack">
          {points.length ? (
            <section className="card">
              <h2>{t('points.onSession')}</h2>
              <ol className="list">
                {points.map((point) => <li key={point}>{point}</li>)}
              </ol>
            </section>
          ) : null}
          {playback ? (
            <section className="card stack">
              <div className="row-between">
                <strong>{formatDuration(bundle.audio?.durationSeconds || session.durationSeconds)}</strong>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {session.status !== 'processing' ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        await api(`/sessions/${id}/audio`, { method: 'DELETE' });
                        await load();
                      }}
                    >
                      {t('sessions.discard')}
                    </button>
                  ) : null}
                  {session.status !== 'processing' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setPhase('processing');
                        try {
                          await api(`/sessions/${id}/process`, { method: 'POST' });
                          await load();
                        } catch (err) {
                          setPhase('idle');
                          setError(messageOf(err));
                        }
                      }}
                    >
                      {session.status === 'completed' ? t('sessions.reprocess') : t('recorder.submit')}
                    </button>
                  ) : null}
                </div>
              </div>
              <audio controls src={playback} />
            </section>
          ) : null}
          {!playback && session.status !== 'processing' ? <VoiceRecorder disabled={phase !== 'idle'} submitting={phase === 'uploading'} onSubmit={submit} /> : null}
          {!bundle.transcript && session.status !== 'processing' ? (
            <form className="card stack" onSubmit={submitText}>
              <h2>{t('text.heading')}</h2>
              <p className="muted">{t('text.hint')}</p>
              <textarea
                required
                minLength={10}
                value={conversation}
                placeholder={t('text.placeholder')}
                onChange={(event) => setConversation(event.target.value)}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConversation(sampleConversation)}
                >
                  {t('text.example')}
                </button>
                <button type="submit" disabled={phase !== 'idle' || conversation.trim().length < 10}>
                  {t('text.submit')}
                </button>
              </div>
            </form>
          ) : null}
          {bundle.transcript ? <TranscriptView transcript={bundle.transcript} /> : null}
        </div>
      ) : null}
      {active === 'transcript' ? <TranscriptView transcript={bundle.transcript} /> : null}
      {active === 'analysis' ? <AnalysisView analysis={bundle.analysis} session={session} /> : null}
      {active === 'follow' ? (
        <section className="card stack">
          <h2>{t('follow.title')}</h2>
          <form
            className="search-row"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!followAction.trim()) return;
              await api('/follow-ups', { method: 'POST', body: JSON.stringify({ sessionId: id, action: followAction }) });
              setFollowAction('');
              await load();
            }}
          >
            <input value={followAction} onChange={(event) => setFollowAction(event.target.value)} placeholder={t('follow.action')} />
            <button type="submit">{t('follow.add')}</button>
          </form>
          <FollowList rows={bundle.followUps} onChanged={load} />
        </section>
      ) : null}
    </Page>
  );
}

export function FollowList({ rows, onChanged }: { rows: FollowUp[]; onChanged?: () => Promise<void> }) {
  const { t, lang } = useI18n();
  if (!rows.length) return <p className="empty">{t('follow.empty')}</p>;
  return (
    <div className="stack">
      {rows.map((row) => (
        <article className="row-between" key={row.id}>
          <div>
            <strong>{row.action}</strong>
            <div className="muted">
              {row.studentName || personName(row.student) || '—'} · {t(row.source === 'ai' ? 'follow.sourceAi' : 'follow.sourceManual')}
              {row.dueAt ? ` · ${formatWhen(row.dueAt, lang)}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <TranslatedBadge prefix="priority" value={row.priority} />
            <TranslatedBadge prefix="status" value={row.status} />
            {row.status === 'open' ? (
              <button
                type="button"
                className="secondary"
                onClick={async () => {
                  await api(`/follow-ups/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'done' }) });
                  await onChanged?.();
                }}
              >
                {t('follow.markDone')}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function parsePointLines(raw: string) {
  const texts: string[] = [];
  let tooShort = false;
  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line.trim().replace(/^(?:\d+[.)\:\-]\s*|[-*•]\s+)/, '').trim();
    if (!cleaned) continue;
    if (cleaned.length < 3) tooShort = true;
    else texts.push(cleaned);
  }
  return { texts, tooShort };
}

export function PointsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [points, setPoints] = useState<CoveragePoint[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await api<{ data: CoveragePoint[] }>('/coverage-points');
    setPoints(response.data);
  }

  useEffect(() => {
    load().catch((err) => setError(messageOf(err)));
  }, []);

  return (
    <Page title={t('points.title')} lede={t('points.lede')}>
      {error ? <div className="banner danger">{error}</div> : null}
      {user?.role === 'admin' ? (
        <form
          className="card form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            const parsed = parsePointLines(text);
            if (parsed.tooShort) {
              setError(t('points.lineShort'));
              return;
            }
            if (!parsed.texts.length) {
              setError(t('points.needText'));
              return;
            }
            try {
              await api('/coverage-points', { method: 'POST', body: JSON.stringify({ texts: parsed.texts }) });
              setText('');
              await load();
            } catch (err) {
              setError(messageOf(err));
            }
          }}
        >
          <textarea required rows={6} value={text} placeholder={t('points.placeholder')} onChange={(event) => setText(event.target.value)} />
          <div className="form-actions">
            <button type="submit">{t('points.add')}</button>
          </div>
        </form>
      ) : null}
      <section className="card">
        {points.length ? (
          <ol className="list">
            {points.map((point, index) => (
              <li key={point.id} className="row-between">
                <span>{index + 1}. {point.text}</span>
                {user?.role === 'admin' ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={async () => {
                      await api(`/coverage-points/${point.id}`, { method: 'DELETE' });
                      await load();
                    }}
                  >
                    {t('points.remove')}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">{t('points.empty')}</p>
        )}
      </section>
    </Page>
  );
}
