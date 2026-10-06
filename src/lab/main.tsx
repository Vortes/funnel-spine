import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DialRoot, useDialKit } from 'dialkit';
import { validateData } from '../../dist/core/data.js';
import { createConfig, parseConfig, sampleData, setVerticalControl, setVerticalView } from '../../dist/lab/config.js';
import { PrintSettings } from './Controls';
import { Details, type DetailView } from './Details';
import { FigurePanel } from './Figure';
import type { VerticalTransition } from '../react/AtlasFunnel';
import { download } from './utils';
import type { LabConfig, LabOptions, LabSvg, PathInfo, SavedConfig, Variant } from './types';

const variants: Variant[] = ['vertical', 'continuous', 'branching'];
const titles: Record<Variant, string> = { continuous: 'Continuous funnel', vertical: 'Vertical funnel', branching: 'Branching funnel' };
const storageKey = 'atlas-funnel-lab-configs-v1';

function loadSaved(): { items: SavedConfig[]; available: boolean } {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const items = Array.isArray(raw) ? raw.flatMap(item => {
      try { return typeof item?.name === 'string' ? [{ name: item.name, config: parseConfig(item.config) as LabConfig }] : []; }
      catch { return []; }
    }) : [];
    return { items, available: true };
  } catch {
    return { items: [], available: false };
  }
}

function App() {
  const { animations, transition, playbackSpeed } = useDialKit('Prism transitions', {
    animations: true,
    transition: { type: 'select', options: [
      { value: 'crossfade', label: 'Crossfade' },
      { value: 'overlap', label: 'Overlap' },
      { value: 'relay', label: 'Relay' },
    ], default: 'crossfade' },
    playbackSpeed: [1, 0.1, 4, 0.05],
  }, { id: 'prism-crossfade', persist: true });
  const [configs, setConfigs] = useState<Record<Variant, LabConfig>>(() => Object.fromEntries(variants.map(variant => [variant, createConfig(variant)])) as Record<Variant, LabConfig>);
  const [variant, setVariant] = useState<Variant>('vertical');
  const [introToken, setIntroToken] = useState(0);
  const [view, setView] = useState<DetailView>('config');
  const [inspected, setInspected] = useState<PathInfo | null>(null);
  const [infos, setInfos] = useState<PathInfo[]>([]);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [dataDraft, setDataDraft] = useState(() => JSON.stringify(createConfig('vertical').data, null, 2));
  const [dataError, setDataError] = useState('');
  const [seedDraft, setSeedDraft] = useState(() => String(createConfig('vertical').seed));
  const [saved, setSaved] = useState(loadSaved);
  const [configName, setConfigName] = useState('');
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<LabSvg>(null);
  const config = configs[variant];

  const showNotice = useCallback((text: string) => setNotice({ text, id: Date.now() + Math.random() }), []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const inspect = useCallback((info: PathInfo | null) => setInspected(info), []);
  const pathsChanged = useCallback((next: PathInfo[]) => setInfos(next), []);
  const renderFailed = useCallback((error: string | null) => setRenderError(error), []);

  function switchVariant(next: Variant, playIntro = false) {
    if (next !== variant && playIntro) setIntroToken(current => current + 1);
    setVariant(next);
    setInspected(null);
    setInfos([]);
    setDataError('');
    setDataDraft(JSON.stringify(configs[next].data, null, 2));
    setSeedDraft(String(configs[next].seed));
  }

  function replaceConfig(next: LabConfig) {
    setConfigs(current => ({ ...current, [next.variant]: next }));
    setVariant(next.variant);
    setInspected(null);
    setInfos([]);
    setDataError('');
    setDataDraft(JSON.stringify(next.data, null, 2));
    setSeedDraft(String(next.seed));
  }

  function updateOption(key: keyof LabOptions, value: number | boolean | string) {
    setConfigs(current => {
      const options = structuredClone(current[variant].options);
      if (variant === 'vertical') setVerticalControl(options, key, value);
      else Object.assign(options, { [key]: value });
      return { ...current, [variant]: { ...current[variant], options } };
    });
  }

  function changeVerticalView(view: 'flat' | 'isometric') {
    setConfigs(current => {
      const options = structuredClone(current.vertical.options);
      setVerticalView(options, view);
      return { ...current, vertical: { ...current.vertical, options } };
    });
  }

  function sample(seed: number) {
    const next: LabConfig = { ...config, seed, data: sampleData(variant, seed), dataOrigin: 'seed' };
    replaceConfig(next);
  }

  function commitSeed() {
    const seed = Number(seedDraft);
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295 || seedDraft.trim() === '') {
      showNotice('Use a seed between 0 and 4294967295');
      setSeedDraft(String(config.seed));
      return;
    }
    if (seed !== config.seed) sample(seed);
  }

  function applyData() {
    try {
      const data: unknown = JSON.parse(dataDraft);
      validateData(data, variant);
      const next = parseConfig({ ...config, data, dataOrigin: 'custom' }) as LabConfig;
      setConfigs(current => ({ ...current, [variant]: next }));
      setInspected(null);
      setDataError('');
      showNotice('Data applied');
    } catch (error) {
      setDataError(error instanceof Error ? error.message : String(error));
    }
  }

  function save() {
    try {
      const snapshot = parseConfig(config) as LabConfig;
      const name = configName.trim() || `${titles[variant]} ${saved.items.length + 1}`;
      const items = [{ name, config: snapshot }, ...saved.items];
      setSaved(current => ({ ...current, items }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
        showNotice(`Saved ${name}`);
      } catch {
        setSaved({ items, available: false });
        showNotice('Saved for this session. Export JSON to keep it.');
      }
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }

  function exportSvg() {
    const rendered = svgRef.current;
    if (!rendered) return;
    const clone = rendered.cloneNode(true) as SVGSVGElement;
    clone.classList.remove('chart-intro', 'chart-intro--vertical', 'chart-intro--continuous', 'chart-intro--branching');
    clone.querySelectorAll('[data-key]').forEach(path => {
      path.removeAttribute('tabindex');
      path.removeAttribute('role');
    });
    clone.querySelectorAll('[data-hit-stage]').forEach(path => path.remove());
    clone.querySelectorAll('[data-stage-focus]').forEach(path => path.remove());
    clone.querySelectorAll('[data-focus-outline]').forEach(path => path.remove());
    clone.querySelectorAll<SVGElement>('.atlas-vertical-stage,.atlas-vertical-annotation').forEach(group => {
      group.style.removeProperty('transform');
      group.style.removeProperty('transform-origin');
      group.style.removeProperty('opacity');
      group.removeAttribute('data-active');
    });
    clone.querySelectorAll('[data-keyboard-motion]').forEach(group => group.removeAttribute('data-keyboard-motion'));
    clone.removeAttribute('data-pointer-tracking');
    clone.removeAttribute('data-proximity-active');
    clone.querySelectorAll('.print-mark').forEach(mark => { mark.classList.remove('print-mark'); (mark as SVGElement).style.removeProperty('--print-step'); });
    clone.removeAttribute('xmlns');
    clone.setAttribute('width', clone.getAttribute('viewBox')!.split(' ')[2]);
    clone.setAttribute('height', clone.getAttribute('viewBox')!.split(' ')[3]);
    download(new XMLSerializer().serializeToString(clone), `atlas-lab-${variant}.svg`, 'image/svg+xml');
  }

  async function importConfig(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('Choose a configuration smaller than 1 MB.');
      const next = parseConfig(JSON.parse(await file.text())) as LabConfig;
      replaceConfig(next);
      showNotice('Configuration imported');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(view === 'data' ? dataDraft : JSON.stringify(config, null, 2));
      showNotice('JSON copied');
    } catch {
      showNotice('Copy unavailable. Use Export config to download JSON.');
    }
  }

  return <>
    <a href="#canvas" className="skip">Skip to figure</a>
    <header><a className="brand" href="/">atlas-kit <span>/ lab</span></a><p>RISOGRAPH STUDIES <span>01—03</span></p><a className="back" href="/">Back to the kit</a></header>
    <main><div className="lab-title"><div><h1>Funnel studies</h1><p>One blue ink. Three ways to read conversion.</p></div><div className="actions">
      <button id="import" onClick={() => fileRef.current?.click()}>Import config</button>
      <input id="import-file" ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => void importConfig(event.target.files?.[0])} />
      <button id="download" onClick={() => download(JSON.stringify(config, null, 2), `atlas-lab-${variant}-${config.seed}.json`, 'application/json')}>Export config</button>
      <button id="save" className="primary" disabled={Boolean(renderError)} onClick={save}>Save configuration</button>
    </div></div>
      <div className="variant-bar" role="group" aria-label="Funnel variant">{variants.map((item, index) => <button key={item} data-variant={item} aria-pressed={variant === item} onClick={event => switchVariant(item, event.detail !== 0)}><span>0{index + 1}</span> {item[0].toUpperCase() + item.slice(1)}</button>)}<span className="variant-note">Each variant keeps its own settings.</span></div>
      <div className="workspace">
        <PrintSettings variant={variant} options={config.options} seed={config.seed} seedDraft={seedDraft} onOptionChange={updateOption} onVerticalViewChange={changeVerticalView} onSeedDraft={setSeedDraft} onSeedCommit={commitSeed} onSample={() => sample(crypto.getRandomValues(new Uint32Array(1))[0])} onReset={() => { replaceConfig(createConfig(variant) as LabConfig); showNotice('Variant reset'); }} />
        <div className="working-area">
          <FigurePanel config={config} crossfadeDuration={150 / playbackSpeed} verticalTransition={animations ? transition as VerticalTransition : 'none'} introToken={introToken} inspected={inspected} infos={infos} error={renderError} svgRef={svgRef} onInspect={inspect} onPathsChange={pathsChanged} onRenderError={renderFailed} onExport={exportSvg} />
          <Details config={config} view={view} dataDraft={dataDraft} dataError={dataError} infos={infos} onView={next => { setView(next); if (next === 'data') setDataDraft(JSON.stringify(config.data, null, 2)); }} onDataDraft={setDataDraft} onApplyData={applyData} onRestoreData={() => sample(config.seed)} onCopy={() => void copy()} />
        </div>
      </div>
      <section className="saved"><div className="saved-heading"><div><span className="overline">YOUR DIRECTIONS</span><h2>Saved configurations</h2></div><label htmlFor="config-name">Name this configuration <input id="config-name" value={configName} onChange={event => setConfigName(event.target.value)} placeholder="e.g. Fine hatch, wide spacing" maxLength={80} /></label></div>
        <div id="saved-list" className="saved-list">{saved.items.length ? saved.items.map((item, index) => <button className="saved-card" key={`${item.name}-${index}`} onClick={() => { replaceConfig(parseConfig(item.config) as LabConfig); setConfigName(item.name); showNotice(`Restored ${item.name}`); }}><strong>{item.name}</strong><span>{titles[item.config.variant]}</span><span>{item.config.options.texture} / seed {item.config.seed}</span></button>) : <p className="empty">Save a configuration to compare and return to it.</p>}</div>
        <p className="storage-note">{saved.available ? 'Saved in this browser. Export JSON to keep a portable copy.' : 'Browser storage unavailable. Export JSON to keep a portable copy.'}</p>
      </section>
    </main>
    {notice && <div id="status" role="status" className="status">{notice.text}</div>}
    <DialRoot position="bottom-right" theme="light" defaultOpen productionEnabled />
  </>;
}

createRoot(document.getElementById('lab-root')!).render(<App />);
