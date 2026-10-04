import assert from 'node:assert/strict';
globalThis.HTMLElement=class {};
const {validateData,layoutGraph,stages,graph}=await import('./dist/atlas-kit.js');
assert.equal(validateData(stages),stages);
assert.throws(()=>validateData([{id:'a',label:'A',value:10},{id:'b',label:'B',value:12}]),/increase/);
assert.throws(()=>validateData([{id:'a',label:'A',value:10},{id:'a',label:'B',value:2}]),/unique/);
assert.throws(()=>validateData({nodes:[{id:'a',label:'A'},{id:'b',label:'B'}],links:[{source:'a',target:'b',value:1},{source:'b',target:'a',value:1}]},'branching'),/acyclic/);
const invalid=structuredClone(graph);invalid.links.push({source:'active',target:'inactive',value:2200});assert.throws(()=>layoutGraph(invalid),/exceeds/);
const g=layoutGraph(graph);assert.equal(g.total,12000);assert.equal(g.nodes.find(n=>n.id==='signup').value,3600);assert.equal(g.nodes.find(n=>n.id==='active').value,2160);
for(const n of g.nodes){assert(Number.isFinite(n.x));assert(n.height>=0);assert(n.y+n.height<=351);for(const l of n.outgoing){assert(l.sy>=n.y-1e-8);assert(l.sy+l.width<=n.y+n.height+1e-8);assert(l.targetNode.level>n.level);}for(const l of n.incoming){assert(l.ty>=n.y-1e-8);assert(l.ty+l.width<=n.y+n.height+1e-8);}}
console.log('Verified validation, acyclicity, flow conservation, proportional geometry, and node bounds.');
