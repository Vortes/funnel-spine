export function validateData(data, variant = 'continuous') {
  if (!['continuous', 'vertical', 'branching'].includes(variant)) {
    throw new Error('Unknown funnel variant.');
  }

  if (variant !== 'branching') {
    if (!Array.isArray(data) || data.length < 2) throw new Error('Provide at least two stages.');
    const ids = new Set();
    data.forEach((stage, index) => {
      if (!stage || typeof stage.id !== 'string' || !stage.id || typeof stage.label !== 'string' || !stage.label || ids.has(stage.id)) {
        throw new Error('Every stage needs a unique string id and a label.');
      }
      ids.add(stage.id);
      if (!Number.isFinite(stage.value) || stage.value < 0) throw new Error('Stage values must be finite and nonnegative.');
      if (index && stage.value > data[index - 1].value) throw new Error('Conversion stages cannot increase in value.');
    });
    return data;
  }

  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links) || data.nodes.length < 2 || !data.links.length) {
    throw new Error('Provide nodes and links for a branching funnel.');
  }
  const ids = new Set();
  data.nodes.forEach(node => {
    if (!node || typeof node.id !== 'string' || !node.id || typeof node.label !== 'string' || !node.label || ids.has(node.id)) {
      throw new Error('Every node needs a unique string id and a label.');
    }
    if (node.value !== undefined && (!Number.isFinite(node.value) || node.value <= 0)) {
      throw new Error('Declared node quantities must be positive finite numbers.');
    }
    ids.add(node.id);
  });
  const incoming = new Map(data.nodes.map(node => [node.id, 0]));
  const outgoing = new Map(incoming);
  const edges = new Set();
  data.links.forEach(link => {
    if (!link || !ids.has(link.source) || !ids.has(link.target) || link.source === link.target) {
      throw new Error('Links must connect two distinct existing nodes.');
    }
    if (!Number.isFinite(link.value) || link.value <= 0) throw new Error('Link quantities must be positive finite numbers.');
    const key = JSON.stringify([link.source, link.target]);
    if (edges.has(key)) throw new Error('Combine duplicate source/target links.');
    edges.add(key);
    incoming.set(link.target, incoming.get(link.target) + link.value);
    outgoing.set(link.source, outgoing.get(link.source) + link.value);
  });
  for (const node of data.nodes) {
    if (!incoming.get(node.id) && !outgoing.get(node.id)) throw new Error('Every node must be connected.');
    if (incoming.get(node.id) && outgoing.get(node.id) > incoming.get(node.id) + 1e-8) {
      throw new Error(`Outgoing flow exceeds incoming flow at ${node.label}.`);
    }
  }
  const pending = new Set(ids);
  const done = new Set();
  while (pending.size) {
    const ready = [...pending].filter(id => data.links.filter(link => link.target === id).every(link => done.has(link.source)));
    if (!ready.length) throw new Error('Branching funnels must be acyclic.');
    ready.forEach(id => { done.add(id); pending.delete(id); });
  }
  return data;
}
