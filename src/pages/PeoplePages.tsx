import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Field, Modal, Page, TranslatedBadge } from '../components/ui';
import { formatWhen, messageOf, personName } from '../format';
import { useI18n } from '../language';
import type { Admission, Parent, ParentAnalysis, Session, SpokenLanguage, Student } from '../types';

const languages: SpokenLanguage[] = ['te', 'en', 'mixed'];
const relations = ['mother', 'father', 'guardian', 'other'] as const;

export function StudentsPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    grade: '',
    targetProgram: '',
    phone: '',
    email: '',
    preferredLanguage: 'mixed' as SpokenLanguage,
    notes: '',
    parentName: '',
    parentRelation: 'mother' as (typeof relations)[number],
    parentPhone: '',
  });

  async function load() {
    const response = await api<{ data: Student[] }>(`/students${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    setStudents(response.data);
  }

  useEffect(() => {
    load().catch((err) => setError(messageOf(err)));
  }, []);

  return (
    <Page
      title={t('students.title')}
      action={<button type="button" onClick={() => setOpen(true)}>{t('students.add')}</button>}
    >
      {error ? <div className="banner danger">{error}</div> : null}
      <form
        className="search-row"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch((err) => setError(messageOf(err)));
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('common.search')} />
        <button type="submit" className="secondary">{t('common.search')}</button>
      </form>
      <section className="card table-wrap">
        {students.length ? (
          <table>
            <thead>
              <tr>
                <th>{t('students.name')}</th>
                <th>{t('students.grade')}</th>
                <th>{t('students.program')}</th>
                <th>{t('common.language')}</th>
                <th>{t('parents.title')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td><Link to={`/students/${student.id}`}>{student.fullName}</Link></td>
                  <td>{student.grade || '—'}</td>
                  <td>{student.targetProgram || '—'}</td>
                  <td><TranslatedBadge prefix="lang" value={student.preferredLanguage} /></td>
                  <td>{student.parents?.map((parent) => parent.fullName).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">{t('students.empty')}</p>
        )}
      </section>
      {open ? (
        <Modal title={t('students.add')} onClose={() => setOpen(false)}>
          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              try {
                await api('/students', {
                  method: 'POST',
                  body: JSON.stringify({
                    fullName: form.fullName,
                    grade: form.grade,
                    targetProgram: form.targetProgram,
                    phone: form.phone,
                    email: form.email,
                    preferredLanguage: form.preferredLanguage,
                    notes: form.notes,
                    newParent: form.parentName
                      ? { fullName: form.parentName, relation: form.parentRelation, phone: form.parentPhone, preferredLanguage: form.preferredLanguage }
                      : undefined,
                  }),
                });
                setOpen(false);
                await load();
              } catch (err) {
                setError(messageOf(err));
              }
            }}
          >
            <Field label={t('students.name')}><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>
            <Field label={t('students.grade')}><input value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} /></Field>
            <Field label={t('students.program')}><input value={form.targetProgram} onChange={(event) => setForm({ ...form, targetProgram: event.target.value })} /></Field>
            <Field label={t('common.language')}>
              <select value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as SpokenLanguage })}>
                {languages.map((language) => <option key={language} value={language}>{t(`lang.${language}`)}</option>)}
              </select>
            </Field>
            <Field label={t('students.phone')}><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label={t('students.email')}><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label={t('students.parentName')}><input value={form.parentName} onChange={(event) => setForm({ ...form, parentName: event.target.value })} /></Field>
            <Field label={t('students.parentRelation')}>
              <select value={form.parentRelation} onChange={(event) => setForm({ ...form, parentRelation: event.target.value as (typeof relations)[number] })}>
                {relations.map((relation) => <option key={relation} value={relation}>{t(`relation.${relation}`)}</option>)}
              </select>
            </Field>
            <Field label={t('students.parentPhone')}><input value={form.parentPhone} onChange={(event) => setForm({ ...form, parentPhone: event.target.value })} /></Field>
            <Field label={t('common.notes')}><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="submit">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [student, setStudent] = useState<Student | null>(null);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<{ data: Student }>(`/students/${id}`),
      api<{ data: Admission[] }>('/admissions'),
      api<{ data: Session[] }>('/sessions'),
    ])
      .then(([studentRes, admissionRes, sessionRes]) => {
        setStudent(studentRes.data);
        setAdmissions(admissionRes.data.filter((item) => personName(item.student) === studentRes.data.fullName || (typeof item.student !== 'string' && item.student?.id === id)));
        setSessions(sessionRes.data.filter((item) => personName(item.student) === studentRes.data.fullName || (typeof item.student !== 'string' && item.student?.id === id)));
      })
      .catch((err) => setError(messageOf(err)));
  }, [id]);

  if (error) return <Page title={t('students.detail')}><div className="banner danger">{error}</div></Page>;
  if (!student) return <Page title={t('common.loading')}><span className="spinner" /></Page>;

  return (
    <Page
      title={student.fullName}
      lede={t('students.detail')}
      action={<Link className="btn" to={`/sessions/new?student=${student.id}`}>{t('sessions.start')}</Link>}
    >
      <section className="grid cards-2">
        <article className="card stack">
          <div className="row-between"><span className="muted">{t('students.grade')}</span><strong>{student.grade || '—'}</strong></div>
          <div className="row-between"><span className="muted">{t('students.program')}</span><strong>{student.targetProgram || '—'}</strong></div>
          <div className="row-between"><span className="muted">{t('common.language')}</span><TranslatedBadge prefix="lang" value={student.preferredLanguage} /></div>
          <div className="row-between"><span className="muted">{t('students.phone')}</span><strong>{student.phone || '—'}</strong></div>
          <p>{student.notes}</p>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              await api(`/students/${student.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) });
              navigate('/students');
            }}
          >
            {t('students.archive')}
          </button>
        </article>
        <article className="card">
          <h2>{t('students.linkedParents')}</h2>
          {student.parents?.length ? (
            <ul className="list">
              {student.parents.map((parent) => (
                <li key={parent.id}>{parent.fullName} · {t(`relation.${parent.relation}`)} · {t(`lang.${parent.preferredLanguage}`)}</li>
              ))}
            </ul>
          ) : <p className="muted">{t('common.none')}</p>}
        </article>
      </section>
      <section className="card">
        <h2>{t('students.admissions')}</h2>
        {admissions.length ? admissions.map((item) => (
          <div className="row-between" key={item.id}>
            <span>{item.program}</span>
            <TranslatedBadge prefix="stage" value={item.stage} />
          </div>
        )) : <p className="muted">{t('admissions.empty')}</p>}
      </section>
      <section className="card">
        <h2>{t('students.sessions')}</h2>
        {sessions.length ? sessions.map((item) => (
          <div className="row-between" key={item.id}>
            <Link to={`/sessions/${item.id}`}>{item.title}</Link>
            <TranslatedBadge prefix="status" value={item.status} />
          </div>
        )) : <p className="muted">{t('sessions.empty')}</p>}
      </section>
    </Page>
  );
}

export function ParentsPage() {
  const { t } = useI18n();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', relation: 'mother' as (typeof relations)[number], preferredLanguage: 'mixed' as SpokenLanguage, studentIds: [] as string[] });

  async function load() {
    const [parentRes, studentRes] = await Promise.all([
      api<{ data: Parent[] }>('/parents'),
      api<{ data: Student[] }>('/students'),
    ]);
    setParents(parentRes.data);
    setStudents(studentRes.data);
  }
  useEffect(() => { load().catch((err) => setError(messageOf(err))); }, []);

  return (
    <Page title={t('parents.title')} action={<button type="button" onClick={() => setOpen(true)}>{t('parents.add')}</button>}>
      {error ? <div className="banner danger">{error}</div> : null}
      <section className="card table-wrap">
        {parents.length ? (
          <table>
            <thead>
              <tr>
                <th>{t('parents.name')}</th>
                <th>{t('students.parentRelation')}</th>
                <th>{t('common.language')}</th>
                <th>{t('students.phone')}</th>
                <th>{t('parents.link')}</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((parent) => (
                <tr key={parent.id}>
                  <td><Link to={`/parents/${parent.id}`}>{parent.fullName}</Link></td>
                  <td>{t(`relation.${parent.relation}`)}</td>
                  <td><TranslatedBadge prefix="lang" value={parent.preferredLanguage} /></td>
                  <td>{parent.phone || '—'}</td>
                  <td>{(parent.students || []).map((student) => personName(student)).filter(Boolean).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty">{t('parents.empty')}</p>}
      </section>
      {open ? (
        <Modal title={t('parents.add')} onClose={() => setOpen(false)}>
          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api('/parents', { method: 'POST', body: JSON.stringify(form) });
                setOpen(false);
                await load();
              } catch (err) {
                setError(messageOf(err));
              }
            }}
          >
            <Field label={t('parents.name')}><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>
            <Field label={t('students.parentRelation')}>
              <select value={form.relation} onChange={(event) => setForm({ ...form, relation: event.target.value as (typeof relations)[number] })}>
                {relations.map((relation) => <option key={relation} value={relation}>{t(`relation.${relation}`)}</option>)}
              </select>
            </Field>
            <Field label={t('common.language')}>
              <select value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as SpokenLanguage })}>
                {languages.map((language) => <option key={language} value={language}>{t(`lang.${language}`)}</option>)}
              </select>
            </Field>
            <Field label={t('students.phone')}><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label={t('students.email')}><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label={t('parents.link')}>
              <div className="check-list">
                {students.map((student) => (
                  <label key={student.id}>
                    <input
                      type="checkbox"
                      checked={form.studentIds.includes(student.id)}
                      onChange={(event) => {
                        const studentIds = event.target.checked
                          ? [...form.studentIds, student.id]
                          : form.studentIds.filter((item) => item !== student.id);
                        setForm({ ...form, studentIds });
                      }}
                    />
                    {student.fullName}
                  </label>
                ))}
              </div>
            </Field>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="submit">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}

export function ParentDetailPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const [data, setData] = useState<ParentAnalysis | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ data: ParentAnalysis }>(`/parents/${id}/analysis`)
      .then((response) => setData(response.data))
      .catch((err) => setError(messageOf(err)));
  }, [id]);
  if (!data && !error) return <Page title={t('common.loading')}><span className="spinner" /></Page>;
  if (!data) return <Page title={t('parents.analysis')}><div className="banner danger">{error}</div></Page>;
  return (
    <Page title={data.parent.fullName} lede={t('parents.analysisLede')} action={<Link className="btn secondary" to="/parents">{t('common.back')}</Link>}>
      <section className="grid stats">
        <article className="card stat"><span>{t('parents.totalSessions')}</span><strong>{data.summary.totalSessions}</strong></article>
        <article className="card stat"><span>{t('parents.counsellorsSeen')}</span><strong>{data.summary.counsellorsSeen}</strong></article>
        <article className="card stat"><span>{t('parents.satisfaction')}</span><strong>{data.summary.satisfactionScore == null ? '—' : `${data.summary.satisfactionScore}%`}</strong></article>
        <article className="card stat"><span>{t('parents.bestCounsellor')}</span><strong className="stat-name">{data.summary.bestCounsellor?.counsellorName || '—'}</strong></article>
      </section>
      <section className="card"><h2>{t('parents.whyDifferent')}</h2><p className="lede">{data.summary.differenceReason}</p></section>
      <section className="card table-wrap">
        <h2>{t('parents.comparison')}</h2>
        <table>
          <thead><tr><th>{t('performance.counsellor')}</th><th>{t('analytics.sessions')}</th><th>{t('parents.satisfaction')}</th><th>{t('parents.reasons')}</th></tr></thead>
          <tbody>{data.counsellorComparison.map((row) => (
            <tr key={row.counsellorId}><td><strong>{row.counsellorName}</strong></td><td>{row.sessions}</td><td>{row.satisfactionScore == null ? '—' : `${row.satisfactionScore}%`}</td><td>{row.reasons.join(' · ') || '—'}</td></tr>
          ))}</tbody>
        </table>
      </section>
      <section className="card stack">
        <h2>{t('parents.history')}</h2>
        {data.timeline.length ? data.timeline.map((item) => (
          <article className="history-item" key={item.sessionId}>
            <div className="row-between"><Link to={`/sessions/${item.sessionId}`}>{item.title}</Link><strong>{item.satisfactionScore == null ? '—' : `${item.satisfactionScore}%`}</strong></div>
            <div className="muted">{item.counsellorName} · {item.studentName} · {formatWhen(item.startedAt, lang)}</div>
            {item.summary ? <p>{item.summary}</p> : null}
          </article>
        )) : <p className="empty">{t('parents.noHistory')}</p>}
      </section>
    </Page>
  );
}

const stages = ['enquiry', 'application', 'counselling', 'offered', 'enrolled', 'withdrawn'] as const;

export function AdmissionsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Admission[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    studentName: '',
    parentName: '',
    program: '',
    intake: '2026',
    stage: 'enquiry' as (typeof stages)[number],
    notes: '',
  });

  async function load() {
    const admissionRes = await api<{ data: Admission[] }>('/admissions');
    setRows(admissionRes.data);
  }
  useEffect(() => { load().catch((err) => setError(messageOf(err))); }, []);

  return (
    <Page title={t('admissions.title')} action={<button type="button" onClick={() => setOpen(true)}>{t('admissions.add')}</button>}>
      {error ? <div className="banner danger">{error}</div> : null}
      <section className="card table-wrap">
        {rows.length ? (
          <table>
            <thead>
              <tr>
                <th>{t('sessions.studentName')}</th>
                <th>{t('sessions.parentName')}</th>
                <th>{t('admissions.program')}</th>
                <th>{t('admissions.intake')}</th>
                <th>{t('admissions.stage')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentName || personName(row.student) || '—'}</td>
                  <td>{row.parentName || '—'}</td>
                  <td>{row.program}</td>
                  <td>{row.intake || '—'}</td>
                  <td>
                    <select
                      value={row.stage}
                      onChange={async (event) => {
                        const stage = event.target.value;
                        await api(`/admissions/${row.id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
                        await load();
                      }}
                    >
                      {stages.map((stage) => <option key={stage} value={stage}>{t(`stage.${stage}`)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty">{t('admissions.empty')}</p>}
      </section>
      {open ? (
        <Modal title={t('admissions.add')} onClose={() => setOpen(false)}>
          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api('/admissions', { method: 'POST', body: JSON.stringify(form) });
                setOpen(false);
                setForm({ studentName: '', parentName: '', program: '', intake: '2026', stage: 'enquiry', notes: '' });
                await load();
              } catch (err) {
                setError(messageOf(err));
              }
            }}
          >
            <Field label={t('sessions.studentName')}>
              <input required minLength={2} value={form.studentName} onChange={(event) => setForm({ ...form, studentName: event.target.value })} />
            </Field>
            <Field label={t('sessions.parentName')}>
              <input required minLength={2} value={form.parentName} onChange={(event) => setForm({ ...form, parentName: event.target.value })} />
            </Field>
            <Field label={t('admissions.program')}><input required value={form.program} onChange={(event) => setForm({ ...form, program: event.target.value })} /></Field>
            <Field label={t('admissions.intake')}><input value={form.intake} onChange={(event) => setForm({ ...form, intake: event.target.value })} /></Field>
            <Field label={t('admissions.stage')}>
              <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as (typeof stages)[number] })}>
                {stages.map((stage) => <option key={stage} value={stage}>{t(`stage.${stage}`)}</option>)}
              </select>
            </Field>
            <Field label={t('common.notes')}><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="submit">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}
