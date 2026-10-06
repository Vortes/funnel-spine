import { createRoot } from 'react-dom/client';
import { useRef } from 'react';
import { DialRoot } from 'dialkit';
import { createConfig } from '../../../dist/lab/config.js';
import { AtlasFunnel, type FunnelOptions, type Stage } from '../../react/AtlasFunnel';
import { useIdleMotion, useIdleMotionPanel, type IdleScene } from './motion';
import './idle.css';

const config = createConfig('vertical');
const data = config.data as Stage[];
const options = config.options as FunnelOptions;
const scene: IdleScene = { data, patternAngle: options.patternAngle, seed: config.seed };

function IdleMotion() {
  const motion = useIdleMotionPanel();
  const figure = useRef<HTMLDivElement>(null);
  useIdleMotion(figure, motion, scene);
  return <main className="idle">
    <header className="idle-header">
      <div><span className="idle-overline">Prototype</span><h1>Idle motion</h1></div>
      <p>Floating island and data flow play while the prism is at rest, then step aside when you inspect a stage.</p>
    </header>
    <section className="idle-figure" aria-label="Vertical funnel with idle motion">
      <AtlasFunnel ref={figure} data={data} variant="vertical" options={options} seed={config.seed} />
    </section>
    <DialRoot position="bottom-right" theme="light" defaultOpen productionEnabled />
  </main>;
}

createRoot(document.getElementById('idle-root')!).render(<IdleMotion />);
