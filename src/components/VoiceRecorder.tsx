import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../format';
import { useI18n } from '../language';

type RecorderState = 'idle' | 'recording' | 'paused' | 'ready';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export function VoiceRecorder({
  disabled,
  submitting,
  onSubmit,
}: {
  disabled?: boolean;
  submitting?: boolean;
  onSubmit: (blob: Blob, durationSeconds: number, filename: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 12 }, () => 8));
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const filenameRef = useRef('counselling.webm');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  function currentElapsed() {
    const extra = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    return accumulatedRef.current + extra;
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      stopTracks();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // Cleanup only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    timerRef.current = window.setInterval(() => setElapsed(currentElapsed()), 200);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [state]);

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('recorder.unsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        blobRef.current = blob;
        setAudioUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        stopTracks();
        setState('ready');
      };
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioContextRef.current = context;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const paint = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(data);
        const next = Array.from({ length: 12 }, (_, index) => {
          const value = data[index] || 0;
          return 8 + Math.round((value / 255) * 44);
        });
        setLevels(next);
        if (recorder.state === 'recording') requestAnimationFrame(paint);
      };
      requestAnimationFrame(paint);
      accumulatedRef.current = 0;
      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start();
      recorderRef.current = recorder;
      setState('recording');
    } catch {
      setError(t('recorder.permission'));
      stopTracks();
    }
  }

  function pause() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    accumulatedRef.current = currentElapsed();
    startedAtRef.current = null;
    setElapsed(accumulatedRef.current);
    setState('paused');
  }

  function resume() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    startedAtRef.current = Date.now();
    setState('recording');
  }

  function stop() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    accumulatedRef.current = currentElapsed();
    startedAtRef.current = null;
    setElapsed(accumulatedRef.current);
    recorder.stop();
  }

  function discard() {
    blobRef.current = null;
    filenameRef.current = 'counselling.webm';
    if (fileInputRef.current) fileInputRef.current.value = '';
    accumulatedRef.current = 0;
    startedAtRef.current = null;
    setElapsed(0);
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setState('idle');
  }

  function selectFile(file: File | undefined) {
    setError('');
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      setError(t('recorder.fileTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.type && !file.type.startsWith('audio/') && file.type !== 'video/webm') {
      setError(t('recorder.invalidFile'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    blobRef.current = file;
    filenameRef.current = file.name;
    accumulatedRef.current = 0;
    startedAtRef.current = null;
    setElapsed(0);
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
    setState('ready');

    const probe = new Audio();
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) {
        const durationMs = Math.round(probe.duration * 1000);
        accumulatedRef.current = durationMs;
        setElapsed(durationMs);
      }
      probe.src = '';
    };
    probe.onerror = () => setError(t('recorder.invalidFile'));
    probe.src = url;
  }

  async function submit() {
    if (!blobRef.current) return;
    await onSubmit(blobRef.current, Math.round(currentElapsed() / 1000), filenameRef.current);
    discard();
  }

  const label =
    state === 'recording' ? t('recorder.live') : state === 'paused' ? t('recorder.paused') : state === 'ready' ? t('recorder.ready') : t('recorder.idle');

  return (
    <section className="recorder">
      <div className="recorder-top">
        <div>
          <strong>{label}</strong>
          <p>{t('recorder.hint')}</p>
        </div>
        <div>
          <div className="muted">{t('recorder.duration')}</div>
          <div className="timer">{formatDuration(elapsed / 1000)}</div>
        </div>
      </div>
      <div className="meter" aria-hidden="true">
        {levels.map((height, index) => (
          <i key={index} style={{ height }} />
        ))}
      </div>
      {error ? <div className="banner danger">{error}</div> : null}
      {audioUrl ? <audio controls src={audioUrl} /> : null}
      <div className="recorder-actions">
        {state === 'idle' ? (
          <>
            <button type="button" onClick={start} disabled={disabled || submitting}>
              {t('recorder.start')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || submitting}
            >
              {t('recorder.upload')}
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </>
        ) : null}
        {state === 'recording' ? (
          <>
            <button type="button" className="secondary" onClick={pause}>
              {t('recorder.pause')}
            </button>
            <button type="button" className="danger" onClick={stop}>
              {t('recorder.stop')}
            </button>
          </>
        ) : null}
        {state === 'paused' ? (
          <>
            <button type="button" onClick={resume}>
              {t('recorder.resume')}
            </button>
            <button type="button" className="danger" onClick={stop}>
              {t('recorder.stop')}
            </button>
          </>
        ) : null}
        {state === 'ready' ? (
          <>
            {filenameRef.current !== 'counselling.webm' ? (
              <span className="selected-audio" title={filenameRef.current}>
                {t('recorder.selected')}: {filenameRef.current}
              </span>
            ) : null}
            <button type="button" onClick={submit} disabled={submitting || disabled}>
              {submitting ? t('common.loading') : t('recorder.submit')}
            </button>
            <button type="button" className="secondary" onClick={discard} disabled={submitting}>
              {t('recorder.delete')}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
