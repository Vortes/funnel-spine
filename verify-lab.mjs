import assert from 'node:assert/strict';
globalThis.HTMLElement=class {};
const {variants,createConfig,parseConfig,sampleData}=await import('./dist/lab/config.js');
const {layoutGraph,renderFunnel,edgeFadeStops}=await import('./dist/lab/lab-engine.js');
const {verticalStageLayout}=await import('./dist/lab/vertical-layout.js');
for(const variant of variants){for(const seed of [0,1,1234,4294967295]){const config=createConfig(variant,seed);assert.deepEqual(sampleData(variant,seed),config.data);assert.deepEqual(parseConfig(JSON.parse(JSON.stringify(config))),config);if(variant==='branching'){for(const nodeGap of [28,85])for(const nodeWidth of [1,6]){const g=layoutGraph(config.data,{nodeGap,nodeWidth});for(const n of g.nodes){assert(n.y+n.height<=g.bottom+1e-8);assert(Number.isFinite(n.x));for(const l of n.outgoing)assert(l.sy+l.width<=n.y+n.height+1e-8);}}}else{assert(config.data.every((n,i)=>!i||n.value<=config.data[i-1].value));}}}
function verifySeparateRibbons(data,options={}){
 const before=JSON.stringify(data),g=layoutGraph(data,options);assert.equal(JSON.stringify(data),before);assert.equal(g.nodes.length,data.nodes.length);assert.equal(g.nodes.filter(n=>!n.incoming.length).length,1);for(const n of g.nodes){assert(n.incoming.length<=1);if(n.outgoing.length)assert.equal(n.outgoing.reduce((sum,l)=>sum+l.value,0),n.value);}assert.equal(g.nodes.filter(n=>!n.outgoing.length).reduce((sum,n)=>sum+n.value,0),g.total);assert.equal(g.links.length,data.links.length);g.links.forEach((l,i)=>assert.equal(l.value,data.links[i].value));
 for(const l of g.links){assert.equal(l.sourceNode.id,l.source);assert.equal(l.targetNode.id,l.target);assert.equal(l.targetNode.level,l.sourceNode.level+1);assert(l.sourceNode.x+g.nodeWidth<l.targetNode.x);}
 for(let i=0;i<g.links.length;i++)for(let j=i+1;j<g.links.length;j++){
  const a=g.links[i],b=g.links[j];if(a.sourceNode.level!==b.sourceNode.level)continue;
  const [upper,lower]=a.sy<b.sy?[a,b]:[b,a];
  assert(upper.sy+upper.width<=lower.sy+1e-8,`source overlap ${a.id}/${b.id}`);
  assert(upper.ty+upper.width<=lower.ty+1e-8,`target crossing ${a.id}/${b.id}`);
 }
 for(const a of g.nodes)for(const b of g.nodes){if(a!==b&&a.level===b.level&&a.y<=b.y)assert(a.y+a.height<=b.y+1e-8);}
 return g;
}
for(let seed=0;seed<128;seed++)for(const nodeGap of [28,66,85])verifySeparateRibbons(sampleData('branching',seed),{nodeGap});
const denseTree={nodes:[{id:'root',label:'Root'},...['a','b','c'].flatMap(id=>[{id,label:id},...['x','y','z'].map(child=>({id:`${id}-${child}`,label:child}))])],links:[...['a','b','c'].map(target=>({source:'root',target,value:90})),...['a','b','c'].flatMap(source=>['x','y','z'].map(child=>({source,target:`${source}-${child}`,value:30})))]};verifySeparateRibbons(denseTree);
const merged={nodes:['root','a','b','c'].map(id=>({id,label:id})),links:[{source:'root',target:'a',value:40},{source:'root',target:'b',value:60},{source:'a',target:'c',value:40},{source:'b',target:'c',value:60}]};assert.throws(()=>layoutGraph(merged),/more than one parent/);
const partial={nodes:['a','b','c'].map(id=>({id,label:id})),links:[{source:'a',target:'b',value:100},{source:'b',target:'c',value:70}]};assert.throws(()=>layoutGraph(partial),/100%/);
const declared={nodes:[{id:'a',label:'A',value:100},{id:'b',label:'B'}],links:[{source:'a',target:'b',value:90}]};assert.throws(()=>layoutGraph(declared),/declared 100/);
const deep={nodes:Array.from({length:30},(_,i)=>({id:String(i),label:String(i)})),links:Array.from({length:29},(_,i)=>({source:String(i),target:String(i+1),value:100}))};assert(verifySeparateRibbons(deep,{nodeWidth:6}).width>900);
const tree=verifySeparateRibbons(sampleData('branching',1234));assert.equal(tree.total,10400);assert.equal(tree.nodes.filter(n=>n.id.endsWith('-signup')).reduce((sum,n)=>sum+n.value,0),4279);assert.equal(tree.nodes.filter(n=>n.id.endsWith('-active')).reduce((sum,n)=>sum+n.value,0),1773);
const oldSeed=createConfig('branching',1234);oldSeed.version=2;oldSeed.data=merged;const oldMigrated=parseConfig(oldSeed);assert.equal(oldMigrated.version,3);assert.deepEqual(oldMigrated.data,sampleData('branching',1234));assert.deepEqual(oldMigrated.options,oldSeed.options);oldSeed.dataOrigin='custom';assert.throws(()=>parseConfig(oldSeed),/more than one parent/);
const bad=createConfig('continuous');bad.options.strokeWidth=3;assert.throws(()=>parseConfig(bad),/strokeWidth/);const cycle=createConfig('branching');cycle.data={nodes:[{id:'a',label:'A'},{id:'b',label:'B'}],links:[{source:'a',target:'b',value:1},{source:'b',target:'a',value:1}]};assert.throws(()=>parseConfig(cycle),/acyclic/);
const legacy=createConfig('branching');legacy.version=1;legacy.options={...legacy.options,strokeWidth:1.2,nodeWidth:12,texture:'stipple',fillTint:.08,patternOpacity:.42};
const migrated=parseConfig(legacy);assert.equal(migrated.version,3);assert.equal(migrated.options.strokeWidth,.75);assert.equal(migrated.options.nodeWidth,6);assert.equal(migrated.options.texture,'sparse');assert(!('fillTint' in migrated.options));assert(!('patternOpacity' in migrated.options));
const previous=createConfig('continuous');delete previous.options.edgeFade;delete previous.options.borderRadius;assert.equal(parseConfig(previous).options.edgeFade,0);assert.equal(parseConfig(previous).options.borderRadius,0);
const invalidFade=createConfig('continuous');invalidFade.options.edgeFade=.5;assert.throws(()=>parseConfig(invalidFade),/edgeFade/);
const invalidRadius=createConfig('vertical');invalidRadius.options.borderRadius=21;assert.throws(()=>parseConfig(invalidRadius),/borderRadius/);
const {screenDefs,screenTypes,screenOrder,stippleField,INK,PAPER}=await import('./dist/lab/screens.js');
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(key,value){this.attrs[key]=value;}getAttribute(key){return this.attrs[key]??null;}append(...children){this.children.push(...children);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const first=screenDefs({seed:1234}),same=screenDefs({seed:1234}),different=screenDefs({seed:1235});assert.deepEqual(first,same);assert.notDeepEqual(first,different);
const visit=node=>{for(const [name,value]of Object.entries(node.attrs)){if(['fill','stroke'].includes(name))assert([INK,PAPER,'none'].includes(value));assert(!name.includes('opacity'));}assert(!node.tag.includes('Gradient'));node.children.forEach(visit);};visit(first);
const dense=stippleField({seed:1234}),fine=stippleField({seed:1234,dotGain:-.8});
assert(dense.count>80000);assert.equal(dense.count,fine.count);assert.equal(dense.width,900);assert.equal(dense.height,460);
assert.deepEqual(dense.groups.map(g=>g.d),fine.groups.map(g=>g.d));assert(fine.groups.every((g,i)=>g.radius<dense.groups[i].radius/4));
const densePattern=first.children.find(p=>p.attrs.id==='riso-dense');assert.equal(densePattern.attrs.width,'900');assert.equal(densePattern.attrs.height,'460');assert.equal(densePattern.children.length,7);
const fineConfig=createConfig('continuous');fineConfig.options.dotGain=-.8;assert.deepEqual(parseConfig(fineConfig),fineConfig);fineConfig.options.dotGain=-.81;assert.throws(()=>parseConfig(fineConfig),/dotGain/);
const faded=renderFunnel(createConfig('continuous').data,{...createConfig('continuous').options,variant:'continuous',edgeFade:.35});
const fadeDefs=faded.children.flatMap(child=>child.children);
for(const side of ['left','right']){const mask=fadeDefs.find(child=>child.attrs.id===`atlas-fade-${side}`),gradient=fadeDefs.find(child=>child.attrs.id===`atlas-fade-gradient-${side}`);assert(mask);assert.equal(gradient.children.length,edgeFadeStops(.35,side).length);assert.equal(gradient.children[side==='left'?0:gradient.children.length-1].attrs['stop-opacity'],'0');}
const fadedRibbons=faded.children.filter(child=>child.attrs['data-key']);
assert.equal(fadedRibbons[0].attrs.mask,'url(#atlas-fade-left)');assert.equal(fadedRibbons.at(-1).attrs.mask,'url(#atlas-fade-right)');
assert(fadedRibbons.slice(1,-1).every(path=>!path.attrs.mask));
const singleRibbon=renderFunnel(createConfig('continuous').data.slice(0,2),{variant:'continuous',edgeFade:.35});
assert.equal(singleRibbon.children.find(child=>child.attrs['data-key']).attrs.mask,'url(#atlas-fade-both)');
const verticalData=createConfig('vertical').data;
for(const seed of [0,1,1234,4294967295])for(const gap of [0,3,20])for(const height of [250,330]){
 const stages=verticalStageLayout(sampleData('vertical',seed),height,gap);
 assert.equal(stages[0].y,70);
 assert(Math.abs(stages.at(-1).y+stages.at(-1).height-(70+height))<1e-8);
 assert(stages.every((stage,i)=>stage.height>gap&&(!i||(stage.height<=stages[i-1].height+1e-8&&Math.abs(stage.y-stages[i-1].y-stages[i-1].height)<1e-8))));
}
const emptyStages=verticalStageLayout(verticalData.map(stage=>({...stage,value:0})),330,20);
assert(emptyStages.every((stage,i)=>!i||Math.abs(stage.height-emptyStages[0].height)<1e-8));
const square=renderFunnel(verticalData,{variant:'vertical',borderRadius:0});
const rounded=renderFunnel(verticalData,{variant:'vertical',borderRadius:20});
const ribbons=svg=>svg.children.filter(child=>child.attrs['data-key']);
assert(ribbons(rounded).every((path,i)=>path.attrs.d!==ribbons(square)[i].attrs.d&&!path.attrs.d.includes('NaN')));
for(const type of screenTypes){const order=screenOrder(type);assert.equal(order[0],type);assert.equal(new Set(order).size,6);}
console.log('Verified seeded samples and screens, full-figure stipple, independent dot count and gain, two-color fills, legacy migration, edge fades, decreasing vertical stage lengths, rounded vertical stages, config validation, and non-overlapping branching geometry across 384 samples, dense fan-outs, 100% flow conservation, and continuous node-to-node connections.');
