import assert from 'node:assert/strict';
globalThis.HTMLElement=class {};
const {variants,createConfig,parseConfig,sampleData}=await import('./dist/lab/config.js');
const {layoutGraph}=await import('./dist/lab/lab-engine.js');
for(const variant of variants){for(const seed of [0,1,1234,4294967295]){const config=createConfig(variant,seed);assert.deepEqual(sampleData(variant,seed),config.data);assert.deepEqual(parseConfig(JSON.parse(JSON.stringify(config))),config);if(variant==='branching'){for(const nodeGap of [28,85])for(const nodeWidth of [1,6]){const g=layoutGraph(config.data,{nodeGap,nodeWidth});for(const n of g.nodes){assert(n.y+n.height<=350.000001);assert(Number.isFinite(n.x));for(const l of n.outgoing)assert(l.sy+l.width<=n.y+n.height+1e-8);}}}else{assert(config.data.every((n,i)=>!i||n.value<=config.data[i-1].value));}}}
const bad=createConfig('continuous');bad.options.strokeWidth=3;assert.throws(()=>parseConfig(bad),/strokeWidth/);const cycle=createConfig('branching');cycle.data={nodes:[{id:'a',label:'A'},{id:'b',label:'B'}],links:[{source:'a',target:'b',value:1},{source:'b',target:'a',value:1}]};assert.throws(()=>parseConfig(cycle),/acyclic/);
const legacy=createConfig('branching');legacy.version=1;legacy.options={...legacy.options,strokeWidth:1.2,nodeWidth:12,texture:'stipple',fillTint:.08,patternOpacity:.42};
const migrated=parseConfig(legacy);assert.equal(migrated.version,2);assert.equal(migrated.options.strokeWidth,.75);assert.equal(migrated.options.nodeWidth,6);assert.equal(migrated.options.texture,'sparse');assert(!('fillTint' in migrated.options));assert(!('patternOpacity' in migrated.options));
const {screenDefs,screenTypes,screenOrder,stippleField,INK,PAPER}=await import('./dist/lab/screens.js');
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(key,value){this.attrs[key]=value;}append(...children){this.children.push(...children);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const first=screenDefs({seed:1234}),same=screenDefs({seed:1234}),different=screenDefs({seed:1235});assert.deepEqual(first,same);assert.notDeepEqual(first,different);
const visit=node=>{for(const [name,value]of Object.entries(node.attrs)){if(['fill','stroke'].includes(name))assert([INK,PAPER,'none'].includes(value));assert(!name.includes('opacity'));}assert(!node.tag.includes('Gradient'));node.children.forEach(visit);};visit(first);
const dense=stippleField({seed:1234}),fine=stippleField({seed:1234,dotGain:-.8});
assert(dense.count>80000);assert.equal(dense.count,fine.count);assert.equal(dense.width,900);assert.equal(dense.height,460);
assert.deepEqual(dense.groups.map(g=>g.d),fine.groups.map(g=>g.d));assert(fine.groups.every((g,i)=>g.radius<dense.groups[i].radius/4));
const densePattern=first.children.find(p=>p.attrs.id==='riso-dense');assert.equal(densePattern.attrs.width,'900');assert.equal(densePattern.attrs.height,'460');assert.equal(densePattern.children.length,7);
const fineConfig=createConfig('continuous');fineConfig.options.dotGain=-.8;assert.deepEqual(parseConfig(fineConfig),fineConfig);fineConfig.options.dotGain=-.81;assert.throws(()=>parseConfig(fineConfig),/dotGain/);
for(const type of screenTypes){const order=screenOrder(type);assert.equal(order[0],type);assert.equal(new Set(order).size,6);}
console.log('Verified seeded samples and screens, full-figure stipple, independent dot count and gain, two-color fills, legacy migration, config validation, and branching geometry at control limits.');
