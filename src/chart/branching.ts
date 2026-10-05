import { validateData } from '../../dist/core/data.js';
import type { ChartModel, ChartOptions, FunnelGraph, GraphLayout, Inspection, LayoutLink, LayoutNode } from './model.js';
import { createMarkHelpers, createModel, fmt } from './shared.js';

export function layoutGraph(data: FunnelGraph, { nodeGap = 66, nodeWidth = 2.5 }: Pick<ChartOptions, 'nodeGap' | 'nodeWidth'> = {}): GraphLayout {
  validateData(data, 'branching');
  const nodes = data.nodes.map((n): LayoutNode => ({ ...n, value: n.value ?? 0, incoming: [], outgoing: [], level: 0, height: 0, span: 0, x: 0, y: 0 }));
  const map = new Map(nodes.map(n => [n.id, n]));
  const links = data.links.map((l): LayoutLink => ({
    ...l, id: `link:${encodeURIComponent(l.source)}:${encodeURIComponent(l.target)}`,
    sourceNode: map.get(l.source)!, targetNode: map.get(l.target)!, width: 0, sy: 0, ty: 0,
  }));
  links.forEach(l => { l.sourceNode.outgoing.push(l); l.targetNode.incoming.push(l); });
  const roots = nodes.filter(n => !n.incoming.length);
  if (roots.length !== 1) throw new Error('Use one entry bucket for a branching funnel.');
  for (const n of nodes) {
    if (n.incoming.length > 1) throw new Error(`${n.label} has more than one parent. Give each branch its own child bucket.`);
    const incoming = n.incoming.reduce((sum, l) => sum + l.value, 0);
    const outgoing = n.outgoing.reduce((sum, l) => sum + l.value, 0);
    const quantity = incoming || outgoing;
    if (n.value && Math.abs(n.value - quantity) > 1e-8 * Math.max(1, n.value))
      throw new Error(`${n.label}: links account for ${fmt(quantity)} of the declared ${fmt(n.value)}. Every split must account for 100%.`);
    n.value = quantity;
    if (n.incoming.length && n.outgoing.length && Math.abs(incoming - outgoing) > 1e-8 * Math.max(1, incoming))
      throw new Error(`${n.label} distributes ${fmt(outgoing)} of ${fmt(incoming)}. Its children must account for 100%; add a remaining or drop-off bucket.`);
  }
  const root = roots[0];
  if (nodes.some(n => n !== root && !n.incoming.length)) throw new Error('Branching funnels need one connected bucket tree.');
  const total = root.value, scale = 240 / total;
  const visited = new Set<string>();
  const measure = (n: LayoutNode, level: number): number => {
    visited.add(n.id); n.level = level; n.height = n.value * scale;
    n.span = Math.max(n.height, n.outgoing.reduce((sum, l) => sum + measure(l.targetNode, level + 1), 0) + Math.max(0, n.outgoing.length - 1) * nodeGap);
    return n.span;
  };
  measure(root, 0);
  if (visited.size !== nodes.length) throw new Error('Branching funnels need one connected bucket tree.');
  const place = (n: LayoutNode, top: number): void => {
    n.y = top + (n.span - n.height) / 2;
    const childrenHeight = n.outgoing.reduce((sum, l) => sum + l.targetNode.span, 0) + Math.max(0, n.outgoing.length - 1) * nodeGap;
    let y = top + (n.span - childrenHeight) / 2;
    n.outgoing.forEach(l => { place(l.targetNode, y); y += l.targetNode.span + nodeGap; });
  };
  place(root, 110);
  const bottom = 110 + root.span, depth = Math.max(...nodes.map(n => n.level));
  const width = Math.max(900, 100 + depth * 160), columnStep = (width - 100) / depth;
  nodes.forEach(n => {
    n.x = 50 + n.level * columnStep;
    let sy = n.y;
    n.outgoing.forEach(l => { l.width = l.value * scale; l.sy = sy; l.ty = l.targetNode.y; sy += l.width; });
  });
  return { nodes, links, total, depth, bottom, height: Math.max(405, Math.ceil(bottom + 55)), width, columnStep, nodeWidth };
}

export function branchingModel(data: FunnelGraph, options: ChartOptions = {}): ChartModel {
  const { texture = 'mixed', strokeWidth = .5, labels = true, curve = .5,
    nodeGap = 66, nodeWidth = 2.5, fontSize = 14, guides = true } = options;
  const graph = layoutGraph(data, { nodeGap, nodeWidth });
  const model = createModel('branching', graph.width, graph.height);
  model.graph = graph;
  const { marks, addText, addLine, chooseScreen } = createMarkHelpers(model, texture);
  const sw = strokeWidth * 4 / 3, height = model.height;
    for (let i = 0; i <= graph.depth; i++) {
      const x = 50 + i * graph.columnStep;
      addText(`column:${i}:heading`, x, 30, `0${i + 1} / ${i === 0 ? 'ENTRY' : i === graph.depth ? 'OUTCOME' : 'BRANCH'}`, 11, i === graph.depth ? 'end' : 'start');
      if (guides) addLine(`column:${i}:guide`, x, 48, x, height - 3, undefined, '2 5');
    }
    graph.links.forEach((link, i) => {
      const x = link.sourceNode.x + nodeWidth, xx = link.targetNode.x, c = (xx - x) * curve;
      const d = `M ${x} ${link.sy} C ${x + c} ${link.sy} ${xx - c} ${link.ty} ${xx} ${link.ty} L ${xx} ${link.ty + link.width} C ${xx - c} ${link.ty + link.width} ${x + c} ${link.sy + link.width} ${x} ${link.sy + link.width} Z`;
      const neighbors = graph.links.slice(0, i).flatMap((prev, j) => prev.source === link.source || prev.target === link.target || prev.target === link.source || prev.source === link.target ? [j] : []);
      const inspection: Inspection = { key: link.id, label: `${link.sourceNode.label} → ${link.targetNode.label}`, value: link.value, denominator: link.sourceNode.value, total: graph.total, source: link.source, target: link.target, kind: 'link' };
      marks.push({ type: 'path', key: link.id, d, pattern: chooseScreen(i, neighbors), stroke: true, strokeWidth: sw, inspection });
    });
    graph.nodes.forEach(node => {
      marks.push({ type: 'rect', key: `node:${node.id}`, x: node.x, y: node.y, width: nodeWidth, height: node.height, pattern: 'solid', stroke: true, strokeWidth: .35 });
      if (labels) {
        const anchor = node.level === graph.depth ? 'end' : 'start';
        addText(`node:${node.id}:label`, node.x, node.y - 25, node.label, fontSize, anchor);
        addText(`node:${node.id}:value`, node.x, node.y - 7, fmt(node.value), fontSize - 2, anchor);
      }
    });
  return model;
}
