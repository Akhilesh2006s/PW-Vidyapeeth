import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Analysis } from './types';

export interface ReportPoint {
  point: string;
  evidence: string;
  lossReason: string;
}

export interface ReportLabels {
  brand: string;
  title: string;
  student: string;
  parent: string;
  set: string;
  covered: string;
  missed: string;
  open: string;
  rate: string;
  summary: string;
  loss: string;
  concerns: string;
  objections: string;
  sentiment: string;
  addressed: string;
  stillOpen: string;
  topics: string;
  intent: string;
  strengths: string;
  improvements: string;
  recommendations: string;
  actions: string;
  high: string;
  medium: string;
  low: string;
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileSafe(value: string) {
  const cleaned = value.replace(/[^\w\u0C00-\u0C7F.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned.slice(0, 48) || 'session';
}

export function coverageRows(analysis: Analysis): ReportPoint[] {
  const required = analysis.requiredPoints || [];
  const names = required.length
    ? required
    : [
        ...(analysis.coveredPoints || []).map((item) => item.point),
        ...(analysis.missedPoints || []).map((item) => item.point),
      ];
  const seen = new Set<string>();
  return names.flatMap((point) => {
    if (seen.has(point)) return [];
    seen.add(point);
    return [{
      point,
      evidence: (analysis.coveredPoints || []).find((item) => item.point === point)?.evidence || '',
      lossReason: (analysis.missedPoints || []).find((item) => item.point === point)?.lossReason || '',
    }];
  });
}

function ringSvg(covered: number, missed: number, open: number) {
  const total = Math.max(1, covered + missed + open);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const parts = [
    { value: covered, color: '#0e7c66' },
    { value: missed, color: '#b5522a' },
    { value: open, color: '#c4a15a' },
  ];
  let offset = 0;
  const arcs = parts.map((part) => {
    const length = (part.value / total) * circ;
    const dash = `${length} ${circ - length}`;
    const circle = `<circle cx="70" cy="70" r="${radius}" fill="none" stroke="${part.color}" stroke-width="14" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)" />`;
    offset += length;
    return part.value ? circle : '';
  }).join('');
  const percent = Math.round((covered / total) * 100);
  return `<svg viewBox="0 0 140 140" width="160" height="160" role="img">${arcs}<text x="70" y="76" text-anchor="middle" font-size="28" font-family="Georgia, serif" fill="#1a1714">${percent}%</text></svg>`;
}

function list(items: string[]) {
  if (!items.length) return '<p class="muted">—</p>';
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

const reportCss = `
.pdf-sheet { width: 880px; background: #f3efe6; color: #1a1714; font: 16px/1.5 "Noto Sans Telugu", Outfit, sans-serif; }
.pdf-sheet main { padding: 32px 20px 48px; }
.pdf-sheet h1, .pdf-sheet h2 { font-family: Fraunces, "Noto Sans Telugu", serif; margin: 0 0 8px; }
.pdf-sheet h1 { font-size: 34px; }
.pdf-sheet .lede { color: #5e584f; margin: 0 0 18px; }
.pdf-sheet .card { background: #fffdf8; border-radius: 18px; padding: 18px; margin: 0 0 14px; }
.pdf-sheet .board { display: grid; grid-template-columns: 1fr 180px; gap: 16px; align-items: center; }
.pdf-sheet .nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pdf-sheet .nums div { background: #f7f3ea; border-radius: 14px; padding: 12px; }
.pdf-sheet .nums strong { display: block; font-size: 28px; font-family: Fraunces, "Noto Sans Telugu", serif; }
.pdf-sheet .meter { display: flex; height: 16px; border-radius: 99px; overflow: hidden; background: #efe8da; margin-top: 12px; }
.pdf-sheet .meter i { display: block; height: 100%; }
.pdf-sheet .meter i.ok, .pdf-sheet .legend b.ok { background: #0e7c66; }
.pdf-sheet .meter i.miss, .pdf-sheet .legend b.miss { background: #b5522a; }
.pdf-sheet .meter i.open, .pdf-sheet .legend b.open { background: #c4a15a; }
.pdf-sheet .legend { display: flex; gap: 14px; color: #5e584f; font-size: 13px; margin-top: 8px; }
.pdf-sheet .legend b { display: inline-block; width: 10px; height: 10px; border-radius: 99px; margin-right: 6px; }
.pdf-sheet .point { border-left: 8px solid #efe8da; padding: 8px 0 8px 12px; }
.pdf-sheet .point.ok { border-color: #0e7c66; } .pdf-sheet .point.miss { border-color: #b5522a; } .pdf-sheet .point.open { border-color: #c4a15a; }
.pdf-sheet .point p, .pdf-sheet .muted { color: #5e584f; margin: 4px 0 0; }
.pdf-sheet .loss { background: #f8e8e4; }
.pdf-sheet .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pdf-sheet .bar { display: grid; grid-template-columns: 90px 1fr 24px; gap: 8px; align-items: center; margin: 6px 0; }
.pdf-sheet .bar i { display: block; height: 8px; background: #efe8da; border-radius: 99px; overflow: hidden; }
.pdf-sheet .bar b { display: block; height: 100%; background: #0e7c66; }
.pdf-sheet .bar b.high, .pdf-sheet .bar b.miss { background: #b5522a; } .pdf-sheet .bar b.medium { background: #8d6a28; }
.pdf-sheet ul { margin: 8px 0 0; padding-left: 18px; }
`;

async function savePdf(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#f3efe6',
    useCORS: true,
    windowWidth: 880,
  });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const pxPerMm = canvas.width / printableWidth;
  const pageSlicePx = Math.floor(printableHeight * pxPerMm);
  let offset = 0;
  let page = 0;
  while (offset < canvas.height) {
    const sliceHeight = Math.min(pageSlicePx, canvas.height - offset);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const context = pageCanvas.getContext('2d');
    if (!context) break;
    context.fillStyle = '#f3efe6';
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, printableWidth, sliceHeight / pxPerMm);
    offset += sliceHeight;
    page += 1;
  }
  pdf.save(filename);
}

export async function downloadAnalysisReport(input: {
  studentName: string;
  parentName: string;
  sessionTitle: string;
  when: string;
  labels: ReportLabels;
  analysis: Analysis;
}) {
  const rows = coverageRows(input.analysis);
  const covered = rows.filter((row) => row.evidence).length;
  const missed = rows.filter((row) => !row.evidence && row.lossReason).length;
  const open = rows.length - covered - missed;
  const total = Math.max(1, rows.length);
  const labels = input.labels;
  const points = rows.map((row, index) => {
    const state = row.evidence ? 'ok' : row.lossReason ? 'miss' : 'open';
    const note = row.evidence || row.lossReason;
    return `<article class="point ${state}"><strong>${index + 1}. ${esc(row.point)}</strong>${note ? `<p>${esc(note)}</p>` : ''}</article>`;
  }).join('');
  const concernRows = (['high', 'medium', 'low'] as const).map((level) => {
    const value = input.analysis.parentConcerns.filter((item) => item.severity === level).length;
    return `<div class="bar"><span>${esc(labels[level])}</span><i><b class="${level}" style="width:${(value / Math.max(1, input.analysis.parentConcerns.length)) * 100}%"></b></i><em>${value}</em></div>`;
  }).join('');
  const html = `<style>${reportCss}</style>
<main>
  <p class="lede">${esc(labels.brand)}</p>
  <h1>${esc(input.sessionTitle || labels.title)}</h1>
  <p class="lede">${esc(labels.student)}: ${esc(input.studentName)} · ${esc(labels.parent)}: ${esc(input.parentName)} · ${esc(input.when)}</p>
  <section class="card">
    <div class="board">
      <div>
        <div class="nums">
          <div><span>${esc(labels.set)}</span><strong>${rows.length}</strong></div>
          <div><span>${esc(labels.covered)}</span><strong>${covered}</strong></div>
          <div><span>${esc(labels.missed)}</span><strong>${missed}</strong></div>
        </div>
        <div class="meter"><i class="ok" style="width:${(covered / total) * 100}%"></i><i class="miss" style="width:${(missed / total) * 100}%"></i><i class="open" style="width:${(open / total) * 100}%"></i></div>
        <div class="legend"><span><b class="ok"></b>${esc(labels.covered)}</span><span><b class="miss"></b>${esc(labels.missed)}</span><span><b class="open"></b>${esc(labels.open)}</span></div>
      </div>
      ${ringSvg(covered, missed, open)}
    </div>
    ${points || `<p class="muted">${esc(labels.open)}</p>`}
  </section>
  ${input.analysis.businessLoss ? `<section class="card loss"><h2>${esc(labels.loss)}</h2><p>${esc(input.analysis.businessLoss)}</p></section>` : ''}
  <section class="card"><h2>${esc(labels.summary)}</h2><p>${esc(input.analysis.summary || '—')}</p></section>
  <div class="grid">
    <section class="card"><h2>${esc(labels.concerns)}</h2>${concernRows}</section>
    <section class="card"><h2>${esc(labels.topics)}</h2>${list(input.analysis.topics)}</section>
    <section class="card"><h2>${esc(labels.strengths)}</h2>${list(input.analysis.counsellorStrengths)}</section>
    <section class="card"><h2>${esc(labels.improvements)}</h2>${list(input.analysis.counsellorImprovements)}</section>
  </div>
  <section class="card"><h2>${esc(labels.recommendations)}</h2>${list(input.analysis.recommendations)}</section>
  <section class="card"><h2>${esc(labels.actions)}</h2>${list(input.analysis.followUpActions.map((item) => item.action))}</section>
</main>`;
  const host = document.createElement('div');
  host.className = 'pdf-sheet';
  host.style.position = 'fixed';
  host.style.left = '-12000px';
  host.style.top = '0';
  host.style.width = '880px';
  host.style.background = '#f3efe6';
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await savePdf(host, `PW-Vidyapeeth-${fileSafe(input.studentName)}-analysis.pdf`);
  } finally {
    host.remove();
  }
}
