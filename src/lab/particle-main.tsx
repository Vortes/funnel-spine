import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { renderFunnel } from '../../dist/lab/lab-engine.js';
import { createStudy, parseStudy } from '../../dist/lab/vertical-particles/study-config.js';
import { addParticles, particleGaps } from '../../dist/lab/vertical-particles/particles.js';
import { roundContainers } from '../../dist/lab/vertical-particles/containers.js';
import { animateTransfer } from '../../dist/lab/vertical-particles/motion.js';
import { download } from './utils';
import type { ParticleStudy } from './types';

type ParticleKey = keyof ParticleStudy['particles'];
type ContainerKey = 'stageGap' | 'capCurve' | 'cornerRadius';
type Slider = { key: ParticleKey | ContainerKey; label: string; min: number; max: number; step: number; format: (value: number) => string };

const particleSliders: Slider[] = [
  { key: 'size', label: 'Dot radius', min: .5, max: 2.5, step: .1, format: value => `${value.toFixed(1)} px` },
  { key: 'count', label: 'Particle count', min: 6, max: 124, step: 1, format: value => `${value} max` },
  { key: 'duration', label: 'Fall time', min: 160, max: 1200, step: 20, format: value => `${value} ms` },
  { key: 'drift', label: 'Sideways drift', min: 0, max: 8, step: .5, format: value => `${value.toFixed(1)} px` },
  { key: 'edgeAngle', label: 'Edge angle', min: 0, max: 70, step: 1, format: value => `${value}° inward` },
];
const surfaceSliders: Slider[] = [
  { key: 'absorption', label: 'Absorption', min: 0, max: 1, step: .05, format: value => `${Math.round(value * 100)}%` },
  { key: 'tension', label: 'Release tension', min: 0, max: 4, step: .1, format: value => `${value.toFixed(1)} px` },
  { key: 'recoil', label: 'Container recoil', min: 0, max: 3, step: .1, format: value => `${value.toFixed(1)} px` },
];
const containerSliders: Slider[] = [
  { key: 'stageGap', label: 'Container gap', min: 6, max: 20, step: 1, format: value => `${value} px` },
  { key: 'capCurve', label: 'Rim curvature', min: 0, max: 20, step: 1, format: value => `${value} px` },
  { key: 'cornerRadius', label: 'Border radius', min: 0, max: 18, step: 1, format: value => `${value} px` },
];

function StudyRange({ slider, value, onChange }: { slider: Slider; value: number; onChange: (value: number) => void }) {
  return <div className="control"><label htmlFor={slider.key}>{slider.label}<output htmlFor={slider.key}>{slider.format(value)}</output></label>
    <input id={slider.key} type="range" min={slider.min} max={slider.max} step={slider.step} value={value} onChange={event => onChange(Number(event.target.value))} />
  </div>;
}

function ParticlePreview({ study, paused, reduced, hostRef }: { study: ParticleStudy; paused: boolean; reduced: boolean; hostRef: RefObject<HTMLDivElement | null> }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const motionRef = useRef<ReturnType<typeof animateTransfer> | null>(null);
  useEffect(() => {
    const svg = renderFunnel(study.funnel.data, { ...study.funnel.options, variant: 'vertical', seed: study.funnel.seed, idPrefix: 'particle-study' }) as SVGSVGElement;
    svg.querySelectorAll('[data-key]').forEach(path => { path.removeAttribute('tabindex'); path.removeAttribute('role'); });
    svg.setAttribute('viewBox', study.funnel.options.labels ? '0 50 900 380' : '130 50 520 380');
    roundContainers(svg, study);
    hostRef.current?.replaceChildren(svg);
    svgRef.current = svg;
    return () => { svgRef.current = null; svg.remove(); };
  }, [study.funnel, hostRef]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const gaps = addParticles(svg, study);
    const motion = animateTransfer(svg, study, gaps);
    motionRef.current = motion;
    motion.setReducedMotion(reduced);
    motion.setPaused(paused);
    return () => { motion.dispose(); motionRef.current = null; };
  }, [study]);
  useEffect(() => {
    motionRef.current?.setReducedMotion(reduced);
    motionRef.current?.setPaused(paused);
  }, [paused, reduced]);
  return <div id="preview" ref={hostRef} data-paused={String(paused)} />;
}

function App() {
  const [study, setStudy] = useState<ParticleStudy>(() => createStudy() as ParticleStudy);
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean }>({ text: '', error: false });
  const edited = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const effectivePause = paused || offscreen || hidden || reduced;
  const amount = useMemo(() => (particleGaps(study) as { points: unknown[] }[]).reduce((sum, gap) => sum + gap.points.length, 0), [study]);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => setReduced(preference.matches);
    const onVisibility = () => setHidden(document.hidden);
    preference.addEventListener('change', onPreference);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    if (previewRef.current) observer?.observe(previewRef.current);
    return () => {
      preference.removeEventListener('change', onPreference);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/__dev/vertical-particles');
        if (!response.ok) {
          if (!cancelled) setStatus({ text: 'Saved settings could not be loaded.', error: true });
          return;
        }
        const saved = await response.json();
        if (!cancelled && saved.config && !edited.current) {
          setStudy(parseStudy(saved.config) as ParticleStudy);
          setStatus({ text: `Loaded ${saved.path}`, error: false });
        }
      } catch {
        if (!cancelled) setStatus({ text: 'Project saving needs the local development server.', error: true });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function updateParticle(key: ParticleKey, value: number) {
    edited.current = true;
    setStudy(current => ({ ...current, particles: { ...current.particles, [key]: value } }));
    setStatus({ text: 'Unsaved changes', error: false });
  }

  function updateContainer(key: ContainerKey, value: number) {
    edited.current = true;
    setStudy(current => ({ ...current, funnel: { ...current.funnel, options: { ...current.funnel.options, [key]: value } } }));
    setStatus({ text: 'Unsaved changes', error: false });
  }

  async function save() {
    setSaving(true);
    setStatus({ text: 'Saving…', error: false });
    try {
      const snapshot = parseStudy(study);
      const response = await fetch('/__dev/vertical-particles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');
      setStatus({ text: `Saved ${result.path}`, error: false });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : String(error), error: true });
    } finally {
      setSaving(false);
    }
  }

  async function importStudy(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 50000) throw new Error('Choose a JSON smaller than 50 KB.');
      const next = parseStudy(JSON.parse(await file.text())) as ParticleStudy;
      edited.current = true;
      setStudy(next);
      setStatus({ text: 'Imported. Save to keep this configuration in the project.', error: false });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : String(error), error: true });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return <><header><a href="/lab/">atlas-kit / lab</a><span>PARTICLE STUDY 01</span></header><main>
    <div className="heading"><div><h1>Vertical transfer</h1><p>Tune the small flow between containers.</p></div><div className="actions">
      <button id="pause" aria-pressed={paused} disabled={reduced} onClick={() => setPaused(current => !current)}>{paused ? 'Resume' : 'Pause'}</button>
      <button id="save" disabled={saving} onClick={() => void save()}>Save configuration</button>
    </div></div>
    <div className="workspace"><aside aria-label="Particle controls"><h2>Particles</h2><div id="particle-controls">
      {particleSliders.map(slider => <StudyRange key={slider.key} slider={slider} value={study.particles[slider.key as ParticleKey]} onChange={value => updateParticle(slider.key as ParticleKey, value)} />)}
    </div><h2>Surface response</h2><div id="surface-controls">
      {surfaceSliders.map(slider => <StudyRange key={slider.key} slider={slider} value={study.particles[slider.key as ParticleKey]} onChange={value => updateParticle(slider.key as ParticleKey, value)} />)}
    </div><h2>Containers</h2><div id="container-controls">
      {containerSliders.map(slider => <StudyRange key={slider.key} slider={slider} value={study.funnel.options[slider.key as ContainerKey]} onChange={value => updateContainer(slider.key as ContainerKey, value)} />)}
    </div><label className="toggle" htmlFor="labels">Stage annotations<input id="labels" type="checkbox" checked={study.funnel.options.labels} onChange={event => { edited.current = true; setStudy(current => ({ ...current, funnel: { ...current.funnel, options: { ...current.funnel.options, labels: event.target.checked } } })); setStatus({ text: 'Unsaved changes', error: false }); }} /></label>
      <button id="reset" onClick={() => { edited.current = true; setStudy(createStudy() as ParticleStudy); setStatus({ text: 'Study reset. Save to keep these settings.', error: false }); }}>Reset study</button>
      <div className="file-actions"><button id="export" onClick={() => download(JSON.stringify(parseStudy(study), null, 2) + '\n', 'atlas-vertical-particles.json', 'application/json')}>Download JSON</button><button id="import" onClick={() => fileRef.current?.click()}>Import JSON</button><input id="file" ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => void importStudy(event.target.files?.[0])} /></div>
      <p id="motion-note">{reduced ? 'Reduced motion is on. Particles are shown as still dots.' : 'Condense, release, absorb. Pause freezes the whole transfer cycle.'}</p>
      <p id="status" role="status" aria-live="polite" data-error={String(status.error)}>{status.text}</p>
    </aside><section className="study-preview" aria-label="Live preview"><figure><figcaption><span>01 / LIVE STUDY</span><span id="summary">{amount} dots · {study.particles.duration} ms</span></figcaption>
      <ParticlePreview study={study} paused={effectivePause} reduced={reduced} hostRef={previewRef} />
      <p className="caption">Dots illustrate transfer; quantities remain encoded by the containers.</p>
    </figure></section></div>
  </main></>;
}

createRoot(document.getElementById('particle-root')!).render(<App />);
