import type { Analysis, Session, Transcript } from '../types';
import { formatDuration, formatWhen } from '../format';
import { useI18n } from '../language';
import type { MessageKey } from '../i18n';
import { Bars } from './ui';
import { coverageRows, downloadAnalysisReport } from '../reportExport';

function speakerName(speaker: string, t: (key: MessageKey) => string) {
  if (speaker === 'counsellor' || speaker === 'parent' || speaker === 'student') return t(`owner.${speaker}`);
  return t('transcript.unknownSpeaker');
}

function Lines({ items }: { items: string[] }) {
  const { t } = useI18n();
  if (!items.length) return <p className="muted">{t('common.none')}</p>;
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TranscriptView({ transcript }: { transcript: Transcript | null }) {
  const { t } = useI18n();
  if (!transcript) return <div className="card empty">{t('transcript.empty')}</div>;
  return (
    <section className="card stack">
      <div className="row-between">
        <h2>{t('transcript.original')}</h2>
        <span className={`badge ${transcript.language}`}>{t(`lang.${transcript.language}` as MessageKey)}</span>
      </div>
      {transcript.isPlaceholder ? <div className="banner">{transcript.placeholderMessage || t('transcript.placeholder')}</div> : null}
      {transcript.segments.some((segment) => segment.speaker && segment.speaker !== 'unknown') ? (
        <p className="muted">{t('transcript.identified')}</p>
      ) : null}
      {transcript.segments.length ? (
        <div>
          {transcript.segments.map((segment, index) => (
            <article className="segment" key={`${segment.speaker}-${index}`}>
              <div className="row-between">
                <strong>{speakerName(segment.speaker, t)}</strong>
                {segment.endMs > 0 ? (
                  <span className="muted">
                    {formatDuration(segment.startMs / 1000)} – {formatDuration(segment.endMs / 1000)}
                  </span>
                ) : null}
              </div>
              <p className="quote">{segment.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="quote">{transcript.text || t('common.none')}</p>
      )}
    </section>
  );
}

function Ring({ covered, missed, open }: { covered: number; missed: number; open: number }) {
  const total = Math.max(1, covered + missed + open);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const parts = [
    { value: covered, color: '#0e7c66' },
    { value: missed, color: '#b5522a' },
    { value: open, color: '#c4a15a' },
  ];
  let offset = 0;
  const percent = Math.round((covered / total) * 100);
  return (
    <svg className="ring" viewBox="0 0 140 140" role="img" aria-label={`${percent}%`}>
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#efe8da" strokeWidth="14" />
      {parts.map((part) => {
        const length = (part.value / total) * circ;
        const circle = part.value ? (
          <circle
            key={part.color}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={part.color}
            strokeWidth="14"
            strokeDasharray={`${length} ${circ - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
          />
        ) : null;
        offset += length;
        return circle;
      })}
      <text x="70" y="76" textAnchor="middle" fontSize="28" fill="#1a1714">{percent}%</text>
    </svg>
  );
}

export function AnalysisView({ analysis, session }: { analysis: Analysis | null; session?: Pick<Session, 'title' | 'studentName' | 'parentName' | 'startedAt'> }) {
  const { t, lang } = useI18n();
  if (!analysis) return <div className="card empty">{t('analysis.empty')}</div>;
  const rows = coverageRows(analysis);
  const covered = rows.filter((row) => row.evidence).length;
  const missed = rows.filter((row) => !row.evidence && row.lossReason).length;
  const open = rows.length - covered - missed;
  const total = Math.max(1, rows.length);
  const concernCount = (level: 'high' | 'medium' | 'low') => analysis.parentConcerns.filter((item) => item.severity === level).length;
  const sentimentCount = (level: 'high' | 'medium' | 'low') => analysis.sentimentIndicators.filter((item) => item.intensity === level).length;

  return (
    <section className="stack">
      {analysis.isPlaceholder ? <div className="banner">{t('analysis.placeholder')}</div> : null}
      <div className="row-between no-print">
        <h2 className="section-title">{t('analysis.title')}</h2>
        <button
          type="button"
          onClick={() => {
            void downloadAnalysisReport({
            studentName: session?.studentName || '',
            parentName: session?.parentName || '',
            sessionTitle: session?.title || t('analysis.title'),
            when: formatWhen(session?.startedAt, lang),
            analysis,
            labels: {
              brand: 'PW Vidyapeeth',
              title: t('analysis.title'),
              student: t('sessions.studentName'),
              parent: t('sessions.parentName'),
              set: t('analysis.set'),
              covered: t('analysis.covered'),
              missed: t('analysis.missedPoints'),
              open: t('analysis.openPoint'),
              rate: t('analysis.rate'),
              summary: t('analysis.summary'),
              loss: t('analysis.businessLoss'),
              concerns: t('analysis.chartConcerns'),
              objections: t('analysis.chartObjections'),
              sentiment: t('analysis.chartSentiment'),
              addressed: t('analysis.addressed'),
              stillOpen: t('analysis.open'),
              topics: t('analysis.topics'),
              intent: t('analysis.intent'),
              strengths: t('analysis.strengths'),
              improvements: t('analysis.improvements'),
              recommendations: t('analysis.recommendations'),
              actions: t('analysis.actions'),
              high: t('priority.high'),
              medium: t('priority.medium'),
              low: t('priority.low'),
            },
            }).catch(() => undefined);
          }}
        >
          {t('analysis.export')}
        </button>
      </div>
      <article className="card">
        <h2>{t('analysis.summary')}</h2>
        <p className="quote">{analysis.summary || t('common.none')}</p>
        <div className="chips" style={{ marginTop: '0.8rem' }}>
          <span className={`badge ${analysis.language}`}>{t(`lang.${analysis.language}` as MessageKey)}</span>
          {analysis.provider ? <span className="chip">{analysis.provider}</span> : null}
        </div>
      </article>
      <article className="card">
        <h2>{t('analysis.coverage')}</h2>
        {rows.length ? (
          <>
            <div className="scoreboard">
              <div>
                <div className="score-nums">
                  <div><span>{t('analysis.set')}</span><strong>{rows.length}</strong></div>
                  <div><span>{t('analysis.covered')}</span><strong>{covered}</strong></div>
                  <div><span>{t('analysis.missedPoints')}</span><strong>{missed}</strong></div>
                </div>
                <div className="stack-bar" aria-hidden="true">
                  <span className="ok" style={{ width: `${(covered / total) * 100}%` }} />
                  <span className="miss" style={{ width: `${(missed / total) * 100}%` }} />
                  <span className="open" style={{ width: `${(open / total) * 100}%` }} />
                </div>
                <div className="legend">
                  <span><i className="ok" />{t('analysis.covered')}</span>
                  <span><i className="miss" />{t('analysis.missedPoints')}</span>
                  <span><i className="open" />{t('analysis.openPoint')}</span>
                </div>
              </div>
              <Ring covered={covered} missed={missed} open={open} />
            </div>
            <div className="point-board">
              {rows.map((row, index) => {
                const state = row.evidence ? 'covered' : row.lossReason ? 'missed' : 'open';
                return (
                  <article className={`point-card ${state}`} key={row.point}>
                    <strong>{index + 1}. {row.point}</strong>
                    {row.evidence || row.lossReason ? <p>{row.evidence || row.lossReason}</p> : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="muted">{t('analysis.noPoints')}</p>
        )}
      </article>
      <div className="grid charts-3">
        <article className="card">
          <h2>{t('analysis.chartConcerns')}</h2>
          <Bars rows={[
            { label: t('priority.high'), value: concernCount('high'), tone: 'miss' },
            { label: t('priority.medium'), value: concernCount('medium'), tone: 'open' },
            { label: t('priority.low'), value: concernCount('low'), tone: 'ok' },
          ]} />
        </article>
        <article className="card">
          <h2>{t('analysis.chartObjections')}</h2>
          <Bars rows={[
            { label: t('analysis.addressed'), value: analysis.objections.filter((item) => item.status === 'addressed').length, tone: 'ok' },
            { label: t('analysis.open'), value: analysis.objections.filter((item) => item.status !== 'addressed').length, tone: 'miss' },
          ]} />
        </article>
        <article className="card">
          <h2>{t('analysis.chartSentiment')}</h2>
          <Bars rows={[
            { label: t('priority.high'), value: sentimentCount('high'), tone: 'miss' },
            { label: t('priority.medium'), value: sentimentCount('medium'), tone: 'open' },
            { label: t('priority.low'), value: sentimentCount('low'), tone: 'ok' },
          ]} />
        </article>
      </div>
      {analysis.businessLoss ? (
        <article className="card">
          <h2>{t('analysis.businessLoss')}</h2>
          <p className="quote">{analysis.businessLoss}</p>
        </article>
      ) : null}
      <div className="grid cards-2">
        <article className="card">
          <h2>{t('analysis.topics')}</h2>
          {analysis.topics.length ? (
            <div className="chips">
              {analysis.topics.map((topic) => (
                <span className="chip" key={topic}>
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">{t('common.none')}</p>
          )}
        </article>
        <article className="card">
          <h2>{t('analysis.concerns')}</h2>
          {analysis.parentConcerns.length ? (
            <ul className="list">
              {analysis.parentConcerns.map((item) => (
                <li key={item.concern}>
                  {item.concern} <span className={`badge ${item.severity}`}>{t(`priority.${item.severity}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.none')}</p>
          )}
        </article>
        <article className="card">
          <h2>{t('analysis.intent')}</h2>
          <p>{analysis.studentIntent.summary || t('common.none')}</p>
          <h3 className="muted">{t('analysis.signals')}</h3>
          <Lines items={analysis.studentIntent.signals} />
        </article>
        <article className="card">
          <h2>{t('analysis.objections')}</h2>
          {analysis.objections.length ? (
            <ul className="list">
              {analysis.objections.map((item) => (
                <li key={item.objection}>
                  {item.objection}{' '}
                  <span className={`badge ${item.status}`}>{item.status === 'addressed' ? t('analysis.addressed') : t('analysis.open')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.none')}</p>
          )}
        </article>
        <article className="card">
          <h2>{t('analysis.sentiment')}</h2>
          {analysis.sentimentIndicators.length ? (
            <ul className="list">
              {analysis.sentimentIndicators.map((item) => (
                <li key={`${item.aspect}-${item.indicator}`}>
                  <strong>{item.aspect}.</strong> {item.indicator}{' '}
                  <span className={`badge ${item.intensity}`}>{t(`priority.${item.intensity}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.none')}</p>
          )}
        </article>
        <article className="card">
          <h2>{t('analysis.unanswered')}</h2>
          <Lines items={analysis.unansweredQuestions} />
        </article>
      </div>
      <div className="grid cards-2">
        <article className="card">
          <h2>{t('analysis.strengths')}</h2>
          <Lines items={analysis.counsellorStrengths} />
        </article>
        <article className="card">
          <h2>{t('analysis.improvements')}</h2>
          <Lines items={analysis.counsellorImprovements} />
        </article>
        <article className="card">
          <h2>{t('analysis.missed')}</h2>
          <Lines items={analysis.missedOpportunities} />
        </article>
        <article className="card">
          <h2>{t('analysis.recommendations')}</h2>
          <Lines items={analysis.recommendations} />
        </article>
      </div>
      <article className="card">
        <h2>{t('analysis.actions')}</h2>
        {analysis.followUpActions.length ? (
          <ul className="list">
            {analysis.followUpActions.map((item) => (
              <li key={item.action}>
                {item.action} <span className={`badge ${item.priority}`}>{t(`priority.${item.priority}`)}</span>{' '}
                <span className="chip">{t(`owner.${item.suggestedOwner}`)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('common.none')}</p>
        )}
      </article>
    </section>
  );
}
