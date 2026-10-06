import { createRoot } from 'react-dom/client';
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createConfig } from '../../../dist/lab/config.js';
import { AtlasFunnel, type FunnelOptions, type Stage } from '../../react/AtlasFunnel';
import { ComparisonMotionContext } from '../../react/comparison-context';
import './comparison.css';

const config = createConfig('vertical');
const data = config.data as Stage[];
const options = config.options as FunnelOptions;

function Comparison() {
  const before = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const figures = [before, after];

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.buttons) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const source = figures[event.clientX < bounds.left + bounds.width / 2 ? 0 : 1].current?.querySelector('svg');
    if (!source) return;
    const sourceBounds = source.getBoundingClientRect();
    const x = (event.clientX - sourceBounds.left) / sourceBounds.width;
    const y = (event.clientY - sourceBounds.top) / sourceBounds.height;
    for (const figure of figures) {
      const svg = figure.current?.querySelector('svg');
      if (!svg) continue;
      const target = svg.getBoundingClientRect();
      svg.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerType: 'mouse', clientX: target.left + x * target.width,
        clientY: target.top + y * target.height,
      }));
    }
  };

  const leave = () => {
    for (const figure of figures) {
      figure.current?.querySelector('svg')?.dispatchEvent(new PointerEvent('pointerout', {
        bubbles: true, pointerType: 'mouse',
      }));
    }
  };

  return <main className="comparison">
    <div className="comparison-header"><span>Before</span><span>After</span></div>
    <div className="comparison-body">
      <section className="comparison-panel" aria-label="Before motion">
        <ComparisonMotionContext.Provider value="before">
          <AtlasFunnel ref={before} data={data} variant="vertical" options={options} seed={config.seed}
            viewBox="45 0 660 460" style={{ '--atlas-crossfade-duration': '750ms' } as CSSProperties} />
        </ComparisonMotionContext.Provider>
      </section>
      <section className="comparison-panel" aria-label="After motion">
        <AtlasFunnel ref={after} data={data} variant="vertical" options={options} seed={config.seed}
          viewBox="45 0 660 460" style={{ '--atlas-crossfade-duration': '750ms' } as CSSProperties} />
      </section>
      <div className="comparison-pointer" aria-hidden="true" onPointerMove={move} onPointerLeave={leave} />
    </div>
  </main>;
}

createRoot(document.getElementById('comparison-root')!).render(<Comparison />);
