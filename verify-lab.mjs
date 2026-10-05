import assert from 'node:assert/strict';
globalThis.HTMLElement=class {};
const {variants,createConfig,parseConfig,sampleData,setVerticalControl,setVerticalView}=await import('./dist/lab/config.js');
const {layoutGraph,renderFunnel,edgeFadeStops,verticalRimGeometry,isometricStageGeometry}=await import('./dist/lab/lab-engine.js');
for(const variant of variants){for(const seed of [0,1,1234,4294967295]){const config=createConfig(variant,seed);assert.deepEqual(sampleData(variant,seed),config.data);assert.deepEqual(parseConfig(JSON.parse(JSON.stringify(config))),config);if(variant==='branching'){for(const nodeGap of [28,85])for(const nodeWidth of [1,6]){const g=layoutGraph(config.data,{nodeGap,nodeWidth});for(const n of g.nodes){assert(n.y+n.height<=g.bottom+1e-8);assert(Number.isFinite(n.x));for(const l of n.outgoing)assert(l.sy+l.width<=n.y+n.height+1e-8);}}}else{assert(config.data.every((n,i)=>!i||n.value<=config.data[i-1].value));}}}
assert.deepEqual(variants,['vertical','continuous','branching']);
for(const variant of variants)assert.equal(createConfig(variant).options.texture,'mixed');
const vertical=createConfig('vertical'),isometric=vertical;assert.equal(vertical.seed,1515972923);assert.deepEqual(vertical.data,sampleData('vertical',vertical.seed));assert.deepEqual(vertical.data.map(stage=>stage.value),[14500,10407,6960,3676,1676]);assert.equal(vertical.options.verticalView,'isometric');assert.equal(vertical.options.stageGap,20);assert.equal(vertical.options.tailRatio,.15);assert.equal(vertical.options.borderRadius,3);assert.equal(vertical.options.paperGrain,true);assert.equal(vertical.options.edgeFade,0);
assert.equal(isometric.options.isoDepth,36);assert.equal(isometric.options.isoRotation,30);
const separateViews=createConfig('vertical');
setVerticalControl(separateViews.options,'stageHeight',280);setVerticalControl(separateViews.options,'texture','hatch');setVerticalControl(separateViews.options,'paperGrain',true);
setVerticalView(separateViews.options,'flat');assert.equal(separateViews.options.stageHeight,330);assert.equal(separateViews.options.texture,'mixed');assert.equal(separateViews.options.paperGrain,true);
setVerticalControl(separateViews.options,'stageGap',4);setVerticalControl(separateViews.options,'borderRadius',12);setVerticalControl(separateViews.options,'tailRatio',1);
setVerticalView(separateViews.options,'isometric');assert.equal(separateViews.options.stageHeight,280);assert.equal(separateViews.options.texture,'hatch');assert.equal(separateViews.options.stageGap,20);assert.equal(separateViews.options.borderRadius,3);assert.equal(separateViews.options.tailRatio,.15);assert.equal(separateViews.options.paperGrain,true);
setVerticalView(separateViews.options,'flat');assert.equal(separateViews.options.stageGap,4);assert.equal(separateViews.options.borderRadius,12);assert.equal(separateViews.options.tailRatio,1);
assert.deepEqual(parseConfig(JSON.parse(JSON.stringify(separateViews))),separateViews);
const invalidFlatView=structuredClone(separateViews);invalidFlatView.options.verticalViews.isometric.stageGap=21;assert.throws(()=>parseConfig(invalidFlatView),/isometric stageGap/);
const invalidParkedView=structuredClone(separateViews);invalidParkedView.options.verticalViews.isometric.tailRatio=1;assert.throws(()=>parseConfig(invalidParkedView),/terminal taper/);
const importedView=structuredClone(vertical);importedView.options.verticalViews.isometric.stageGap=4;assert.equal(parseConfig(importedView).options.stageGap,4);
const legacyViewSettings=structuredClone(separateViews);delete legacyViewSettings.options.verticalViews;const migratedViews=parseConfig(legacyViewSettings);assert.equal(migratedViews.options.verticalViews.flat.tailRatio,1);assert.equal(migratedViews.options.verticalViews.isometric.tailRatio,.15);assert.equal(migratedViews.options.verticalViews.isometric.stageGap,4);
const presetRims=verticalRimGeometry(vertical.data,vertical.options);assert.equal(presetRims.radii[0],3);assert(presetRims.widths.every((width,i)=>!i||width<=presetRims.widths[i-1]));
const oldVertical=structuredClone(vertical);delete oldVertical.options.verticalView;delete oldVertical.options.verticalViews;oldVertical.options.stageGap=4;oldVertical.options.borderRadius=4;assert.equal(parseConfig(oldVertical).options.verticalView,'flat');
const oldIsometric=structuredClone(vertical);oldIsometric.variant='isometric';delete oldIsometric.options.verticalView;const migratedIsometric=parseConfig(oldIsometric);assert.equal(migratedIsometric.variant,'vertical');assert.equal(migratedIsometric.options.verticalView,'isometric');
const invalidView=structuredClone(vertical);invalidView.options.verticalView='sideways';assert.throws(()=>parseConfig(invalidView),/vertical view/);
const previousVertical=structuredClone(vertical);delete previousVertical.options.borderRadius;delete previousVertical.options.verticalViews;assert.equal(parseConfig(previousVertical).options.borderRadius,0);
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
const migrated=parseConfig(legacy);assert.equal(migrated.version,3);assert.equal(migrated.options.strokeWidth,.75);assert.equal(migrated.options.nodeWidth,6);assert.equal(migrated.options.texture,'dense');assert(!('fillTint' in migrated.options));assert(!('patternOpacity' in migrated.options));
const previous=createConfig('continuous');delete previous.options.edgeFade;delete previous.options.borderRadius;assert.equal(parseConfig(previous).options.edgeFade,0);assert.equal(parseConfig(previous).options.borderRadius,0);
const invalidFade=createConfig('continuous');invalidFade.options.edgeFade=.5;assert.throws(()=>parseConfig(invalidFade),/edgeFade/);
const continuous=createConfig('continuous');assert.equal(continuous.options.mirror,false);
const mirroredConfig=structuredClone(continuous);mirroredConfig.options.mirror=true;assert.equal(parseConfig(mirroredConfig).options.mirror,true);
const oldContinuous=structuredClone(continuous);delete oldContinuous.options.mirror;assert.equal(parseConfig(oldContinuous).options.mirror,false);
const invalidMirror=structuredClone(continuous);invalidMirror.options.mirror='true';assert.throws(()=>parseConfig(invalidMirror),/mirror/);
const invalidRadius=createConfig('vertical');invalidRadius.options.borderRadius=21;assert.throws(()=>parseConfig(invalidRadius),/borderRadius/);
const {screenDefs,screenTypes,screenSwatch,stippleField,INK,PAPER}=await import('./dist/lab/screens.js');
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.style={};}setAttribute(key,value){this.attrs[key]=value;}getAttribute(key){return this.attrs[key]??null;}append(...children){this.children.push(...children);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const first=screenDefs({seed:1234}),same=screenDefs({seed:1234}),different=screenDefs({seed:1235});assert.deepEqual(first,same);assert.notDeepEqual(first,different);
const visit=node=>{for(const [name,value]of Object.entries(node.attrs)){if(['fill','stroke'].includes(name))assert([INK,PAPER,'none'].includes(value));assert(!name.includes('opacity'));}assert(!node.tag.includes('Gradient'));node.children.forEach(visit);};visit(first);
const dense=stippleField({seed:1234}),fine=stippleField({seed:1234,dotGain:-.8});
assert(dense.count>80000);assert.equal(dense.count,fine.count);assert.equal(dense.width,900);assert.equal(dense.height,460);
assert.deepEqual(dense.groups.map(g=>g.d),fine.groups.map(g=>g.d));assert(fine.groups.every((g,i)=>g.radius<dense.groups[i].radius/4));
const densePattern=first.children.find(p=>p.attrs.id==='riso-dense');assert.equal(densePattern.attrs.width,'900');assert.equal(densePattern.attrs.height,'460');assert.equal(densePattern.children.length,7);
const fineConfig=createConfig('continuous');fineConfig.options.dotGain=-.8;assert.deepEqual(parseConfig(fineConfig),fineConfig);fineConfig.options.dotGain=-.81;assert.throws(()=>parseConfig(fineConfig),/dotGain/);
const mirroredSvg=renderFunnel(continuous.data,{...mirroredConfig.options,variant:'continuous'});
mirroredSvg.children.filter(child=>child.attrs['data-key']).forEach((path,i)=>{
 const d=path.attrs.d,numbers=d.match(/-?\d+(?:\.\d+)?/g).map(Number),top=numbers[1],bottom=numbers.at(-1);
 assert.equal((d.match(/ C /g)||[]).length,2);
 assert(Math.abs((top+bottom)/2-(365-continuous.options.chartHeight/2))<1e-8);
 assert(Math.abs(bottom-top-continuous.data[i].value/continuous.data[0].value*continuous.options.chartHeight)<1e-8);
});
const faded=renderFunnel(createConfig('continuous').data,{...createConfig('continuous').options,variant:'continuous',edgeFade:.35});
const fadeDefs=faded.children.flatMap(child=>child.children);
for(const side of ['left','right']){const mask=fadeDefs.find(child=>child.attrs.id===`atlas-fade-${side}`),gradient=fadeDefs.find(child=>child.attrs.id===`atlas-fade-gradient-${side}`);assert(mask);assert.equal(gradient.children.length,edgeFadeStops(.35,side).length);assert.equal(gradient.children[side==='left'?0:gradient.children.length-1].attrs['stop-opacity'],'0');}
const fadedRibbons=faded.children.filter(child=>child.attrs['data-key']);
assert.equal(fadedRibbons[0].attrs.mask,'url(#atlas-fade-left)');assert.equal(fadedRibbons.at(-1).attrs.mask,'url(#atlas-fade-right)');
assert(fadedRibbons.slice(1,-1).every(path=>!path.attrs.mask));
const singleRibbon=renderFunnel(createConfig('continuous').data.slice(0,2),{variant:'continuous',edgeFade:.35});
assert.equal(singleRibbon.children.find(child=>child.attrs['data-key']).attrs.mask,'url(#atlas-fade-both)');
const verticalData=createConfig('vertical').data;
const projected=isometricStageGeometry(isometric.data,isometric.options);
assert.equal(projected.length,isometric.data.length);
const commonTaper=(projected[0].topWidth-projected.at(-1).bottomWidth)/isometric.options.stageHeight;
for(let i=0;i<projected.length;i++){
 const stage=projected[i],front=stage.front.match(/-?\d+(?:\.\d+)?/g).map(Number),top=stage.top.match(/-?\d+(?:\.\d+)?/g).map(Number);
 assert(Math.abs(stage.topWidth-460*isometric.data[i].value/isometric.data[0].value)<1e-8);
 assert(Math.abs((stage.topWidth-stage.bottomWidth)/(stage.bottom-stage.y)-commonTaper)<1e-8);
 assert(Math.abs(front[2]-front[0]-stage.topWidth)<1e-8);
 assert(Math.abs(top[2]-front[0]-isometric.options.isoDepth)<1e-8);
 assert(Math.abs(top[3]-front[1]+isometric.options.isoDepth/Math.sqrt(3))<1e-8);
 if(i){assert(projected[i-1].bottom<stage.y);assert(stage.y-projected[i-1].bottom<=isometric.options.stageGap+1e-8);}
}
const flat=structuredClone(isometric);flat.data[1].value=flat.data[0].value;assert.throws(()=>parseConfig(flat),/decreasing quantities/);
const untapered=structuredClone(isometric);setVerticalControl(untapered.options,'tailRatio',1);assert.throws(()=>parseConfig(untapered),/terminal taper/);
const isoSvg=renderFunnel(isometric.data,{...isometric.options,variant:'vertical'});
assert.equal(isoSvg.children.filter(child=>child.attrs['data-key']).length,isometric.data.length);
assert.equal(isoSvg.children.filter(child=>child.attrs['data-stage-face']).length,isometric.data.length*2);
const flatSvg=renderFunnel(vertical.data,{...vertical.options,variant:'vertical',verticalView:'flat'});assert.equal(flatSvg.children.filter(child=>child.attrs['data-stage-face']).length,0);
const isoPatternIds=new Set(isoSvg.children.filter(child=>child.tag==='defs').flatMap(defs=>defs.children.map(child=>child.attrs.id)));
assert(isoSvg.children.filter(child=>child.attrs['data-stage-face']).every(face=>isoPatternIds.has(face.attrs.fill.match(/^url\(#(.+)\)$/)?.[1])));
assert(isoSvg.children.filter(child=>child.attrs['data-face']==='top').every(face=>face.attrs.fill==='url(#atlas-sparse)'));
for(const rotation of [-30,30]){
 const options={...isometric.options,isoRotation:rotation,borderRadius:16},geometry=isometricStageGeometry(isometric.data,options),roundedIso=renderFunnel(isometric.data,{...options,variant:'vertical'});
 assert(geometry.every(stage=>stage.outline.includes('Q')&&!stage.outline.includes('NaN')));
 assert(roundedIso.children.filter(child=>child.attrs['data-key']).every(path=>path.attrs['clip-path']?.startsWith('url(#atlas-stage-clip-')));
 assert.equal(roundedIso.children.filter(child=>child.attrs['data-stage-face']&&child.attrs['clip-path']).length,isometric.data.length*2);
 const outlines=roundedIso.children.filter(child=>child.attrs['data-stage-outline']);assert.equal(outlines.length,geometry.length);outlines.forEach((outline,i)=>{assert.equal(outline.attrs.d,geometry[i].outline);assert.equal(outline.attrs.fill,'none');assert.equal(outline.attrs['pointer-events'],'none');assert(!outline.attrs['clip-path']);});
}
assert.equal(isoSvg.children.filter(child=>child.attrs['data-stage-outline']).length,isometric.data.length);
const squareIso=renderFunnel(isometric.data,{...isometric.options,variant:'vertical',borderRadius:0});assert.equal(squareIso.children.filter(child=>child.attrs['data-stage-outline']).length,0);
for(const rotation of [-45,0,30,45]){
 const stages=isometricStageGeometry(isometric.data,{...isometric.options,isoRotation:rotation});
 const expectedShift=isometric.options.isoDepth*Math.sin(rotation*Math.PI/180)/.5;
 const taper=(stages[0].topWidth-stages.at(-1).bottomWidth)/isometric.options.stageHeight;
 for(const stage of stages){
  const front=stage.front.match(/-?\d+(?:\.\d+)?/g).map(Number),top=stage.top.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert(Math.abs(top[2]-front[0]-expectedShift)<1e-8);
  assert(Math.abs((stage.topWidth-stage.bottomWidth)/(stage.bottom-stage.y)-taper)<1e-8);
 }
}
const leftView=isometricStageGeometry(isometric.data,{...isometric.options,isoRotation:-30});
assert(leftView[0].top.match(/-?\d+(?:\.\d+)?/g).map(Number)[2]<leftView[0].front.match(/-?\d+(?:\.\d+)?/g).map(Number)[0]);
const deepConfig=createConfig('vertical');setVerticalControl(deepConfig.options,'isoDepth',200);assert.equal(parseConfig(deepConfig).options.isoDepth,200);
for(const rotation of [-45,0,45]){
 const options={...deepConfig.options,isoRotation:rotation},deepStages=isometricStageGeometry(deepConfig.data,options),deepSvg=renderFunnel(deepConfig.data,{...options,variant:'vertical'});
 const [,,width,height]=deepSvg.attrs.viewBox.split(' ').map(Number);
 for(const stage of deepStages)for(const path of [stage.front,stage.top,stage.side]){const coords=path.match(/-?\d+(?:\.\d+)?/g).map(Number);for(let i=0;i<coords.length;i+=2){assert(coords[i]>=0&&coords[i]<=width);assert(coords[i+1]>=0&&coords[i+1]<=height);}}
 assert(deepStages.at(-1).bottom+50<=height);
 if(rotation===0){const top=deepStages[0].top.match(/-?\d+(?:\.\d+)?/g).map(Number);assert(deepStages[0].y-top[3]>100);}
}
const invalidRotation=structuredClone(isometric);invalidRotation.options.isoRotation=50;assert.throws(()=>parseConfig(invalidRotation),/isoRotation/);
const invalidDepth=structuredClone(deepConfig);setVerticalControl(invalidDepth.options,'isoDepth',202);assert.throws(()=>parseConfig(invalidDepth),/isoDepth/);
const square=renderFunnel(verticalData,{variant:'vertical',verticalView:'flat',borderRadius:0});
const rounded=renderFunnel(verticalData,{variant:'vertical',verticalView:'flat',borderRadius:20});
const ribbons=svg=>svg.children.filter(child=>child.attrs['data-key']);
assert(ribbons(rounded).every((path,i)=>path.attrs.d!==ribbons(square)[i].attrs.d&&!path.attrs.d.includes('NaN')));
const rimSpan=path=>{const commands=path.attrs.d.match(/[MLQ][^MLQZ]*/g),numbers=command=>command.match(/-?\d+(?:\.\d+)?/g).map(Number);return {y:numbers(commands[0])[1],top:numbers(commands[1])[2]-numbers(commands[0])[0],bottom:commands.length>4?numbers(commands[4])[2]-numbers(commands[5])[2]:numbers(commands[2])[0]-numbers(commands[3])[2]};};
for(const seed of [0,1,1234,4294967295])for(const gap of [0,20])for(const radius of [0,20]){
 const data=sampleData('vertical',seed),{widths,radii}=verticalRimGeometry(data,{stageHeight:330,stageGap:gap,tailRatio:.45,borderRadius:radius});
 assert(widths.every((width,i)=>!i||width<=widths[i-1]));
 const spans=ribbons(renderFunnel(data,{variant:'vertical',verticalView:'flat',stageHeight:330,stageGap:gap,capCurve:0,tailRatio:.45,borderRadius:radius})).map(rimSpan);
 spans.forEach((span,i)=>{assert(Math.abs(span.top-(widths[i]-2*radii[i]))<1e-8);assert(Math.abs(span.bottom-(widths[i+1]-2*radii[i+1]))<1e-8);if(i){assert(Math.abs(span.y-spans[i-1].y-330/data.length)<1e-8);assert(Math.abs(span.top-spans[i-1].bottom)<1e-8);}});
}
for(const variant of variants)for(const type of screenTypes){const config=createConfig(variant);const chart=renderFunnel(config.data,{...config.options,variant,texture:type});assert(ribbons(chart).every(path=>path.attrs.fill===`url(#atlas-${type})`));}
for(const variant of variants){const config=createConfig(variant);config.options.texture='mixed';assert.deepEqual(parseConfig(config),config);const fills=ribbons(renderFunnel(config.data,{...config.options,variant})).map(path=>path.attrs.fill);assert(new Set(fills).size>1);assert(fills.every(fill=>screenTypes.some(type=>fill===`url(#atlas-${type})`)));}
const mixSwatch=screenSwatch('mixed');assert.equal(mixSwatch.children.filter(child=>child.tag==='rect').length,screenTypes.length+1);
for(const texture of ['sparse','stipple','solid']){const old=createConfig('continuous');old.options.texture=texture;assert.equal(parseConfig(old).options.texture,'dense');}
assert.deepEqual(screenTypes,['dense','am','hatch','cross','coarse']);
console.log('Verified seeded samples and screens, full-figure stipple, independent dot count and gain, two-color fills, legacy migration, edge fades, mirrored continuous geometry, vertical rim widths and heights, rounded vertical and rotated isometric stages, config validation, and non-overlapping branching geometry across 384 samples, dense fan-outs, 100% flow conservation, and continuous node-to-node connections.');
