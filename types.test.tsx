import { AtlasFunnel, type FunnelGraph, type Inspection } from 'funnel-spine';

const stages = [{ id: 'visits', label: 'Visits', value: 10 }, { id: 'sales', label: 'Sales', value: 4 }];
const graph: FunnelGraph = {
  nodes: [{ id: 'visits', label: 'Visits' }, { id: 'sales', label: 'Sales' }],
  links: [{ source: 'visits', target: 'sales', value: 4 }],
};
const inspect: (info: Inspection | null) => void = () => {};

<AtlasFunnel data={stages} onInspect={inspect} aria-label="Conversion chart" />;
<AtlasFunnel data={graph} variant="branching" selectedKey={null} onSelectionChange={(_, info) => inspect(info)} />;
<AtlasFunnel data={stages} variant="vertical" options={{ texture: 'dense', borderRadius: 12 }} />;
// @ts-expect-error Branching data requires the branching variant.
<AtlasFunnel data={graph} />;
// @ts-expect-error A stage array is not a branching graph.
<AtlasFunnel data={stages} variant="branching" />;
// @ts-expect-error Unknown screen names must not compile.
<AtlasFunnel data={stages} options={{ texture: 'rainbow' }} />;
