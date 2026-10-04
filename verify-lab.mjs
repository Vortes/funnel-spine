import assert from 'node:assert/strict';
globalThis.HTMLElement=class {};
const {variants,createConfig,parseConfig,sampleData}=await import('./dist/lab/config.js');
const {layoutGraph}=await import('./dist/lab/lab-engine.js');
for(const variant of variants){for(const seed of [0,1,1234,4294967295]){const config=createConfig(variant,seed);assert.deepEqual(sampleData(variant,seed),config.data);assert.deepEqual(parseConfig(JSON.parse(JSON.stringify(config))),config);if(variant==='branching'){for(const nodeGap of [28,85])for(const nodeWidth of [3,16]){const g=layoutGraph(config.data,{nodeGap,nodeWidth});for(const n of g.nodes){assert(n.y+n.height<=350.000001);assert(Number.isFinite(n.x));for(const l of n.outgoing)assert(l.sy+l.width<=n.y+n.height+1e-8);}}}else{assert(config.data.every((n,i)=>!i||n.value<=config.data[i-1].value));}}}
const bad=createConfig('continuous');bad.options.strokeWidth=3;assert.throws(()=>parseConfig(bad),/strokeWidth/);const cycle=createConfig('branching');cycle.data={nodes:[{id:'a',label:'A'},{id:'b',label:'B'}],links:[{source:'a',target:'b',value:1},{source:'b',target:'a',value:1}]};assert.throws(()=>parseConfig(cycle),/acyclic/);
console.log('Verified seeded samples, config round trips, invalid configs, and branching geometry at control limits.');
