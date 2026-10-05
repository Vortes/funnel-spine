import type { LabConfig, PathInfo } from './types';
import { format, percent } from './utils';

export type DetailView = 'config' | 'data' | 'compare';

export function Details({ config, view, dataDraft, dataError, infos, onView, onDataDraft, onApplyData, onRestoreData, onCopy }: {
  config: LabConfig;
  view: DetailView;
  dataDraft: string;
  dataError: string;
  infos: PathInfo[];
  onView: (view: DetailView) => void;
  onDataDraft: (value: string) => void;
  onApplyData: () => void;
  onRestoreData: () => void;
  onCopy: () => void;
}) {
  return <section className="details">
    <div className="detail-tabs" role="group" aria-label="Configuration view">
      {(['config', 'data', 'compare'] as const).map(tab => <button key={tab} data-view={tab} aria-pressed={view === tab} onClick={() => onView(tab)}>{tab === 'config' ? 'Configuration' : tab === 'data' ? 'Data' : 'Conversion table'}</button>)}
      {view !== 'compare' && <button id="copy" className="copy" onClick={onCopy}>{view === 'data' ? 'Copy data' : 'Copy JSON'}</button>}
    </div>
    <div id="config-view" hidden={view !== 'config'}><pre id="config-code">{JSON.stringify(config, null, 2)}</pre><p>These print settings apply in the lab. Export a config to reproduce the figure here.</p></div>
    <div id="data-view" hidden={view !== 'data'}><label htmlFor="data">Figure data (JSON)</label>
      <textarea id="data" spellCheck={false} value={dataDraft} onChange={event => onDataDraft(event.target.value)} />
      <div className="data-actions"><button id="apply-data" className="primary" onClick={onApplyData}>Apply data</button><button id="restore-data" onClick={onRestoreData}>Use seeded sample</button></div>
      <p id="data-error" role="alert">{dataError}</p>
    </div>
    <div id="compare-view" className="table-scroll" hidden={view !== 'compare'}><table><thead><tr><th>Path / stage</th><th>Quantity</th><th>Conversion</th><th>Of total</th></tr></thead>
      <tbody id="rows">{infos.map(info => <tr key={info.key}><td>{info.label}</td><td>{format(info.value)}</td><td>{percent(info.value, info.denominator)}</td><td>{percent(info.value, info.total)}</td></tr>)}</tbody>
    </table><p>{config.variant === 'branching' ? 'Conversion uses the parent bucket quantity. Every split accounts for 100%, including drop-off.' : 'Conversion uses the preceding stage quantity. Of total uses the entry quantity.'}</p></div>
  </section>;
}
