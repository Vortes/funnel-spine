import assert from 'node:assert/strict';
import {createStudy,parseStudy} from './dist/lab/vertical-particles/study-config.js';
import {particleGaps} from './dist/lab/vertical-particles/particles.js';
import {containerGeometry} from './dist/lab/vertical-particles/containers.js';
import {particleFrame,containerFrame} from './dist/lab/vertical-particles/motion.js';

const study=createStudy(),original=structuredClone(study);
assert.deepEqual(parseStudy(study),study);
assert.deepEqual(particleGaps(study),particleGaps(study));
assert.deepEqual(study,original);
assert.equal(particleGaps(study).length,study.funnel.data.length-1);
for(const stageGap of [6,20])for(const capCurve of [0,20])for(const size of [.5,2.5])for(const count of [6,124])for(const drift of [0,8])for(const edgeAngle of [0,70]){
  const config=createStudy();Object.assign(config.funnel.options,{stageGap,capCurve});Object.assign(config.particles,{size,count,drift,edgeAngle});parseStudy(config);
  const height=config.funnel.options.stageHeight/config.funnel.data.length;
  for(const gap of particleGaps(config))for(const dot of gap.points){
    const left=390-gap.width/2,right=390+gap.width/2;
    assert(Number.isFinite(dot.x)&&Number.isFinite(dot.dy)&&dot.dy>0);
    assert(dot.x-size>=left-1e-8&&dot.x+size<=right+1e-8);
    assert(dot.x+dot.dx-size>=left-1e-8&&dot.x+dot.dx+size<=right+1e-8);
    const rim=70+(gap.index+1)*height;
    const bottomEdge=rim-stageGap+capCurve/8*(1-((dot.x-390)/(gap.width/2))**2);
    const topEdge=rim+capCurve/2*(1-((dot.x+dot.dx-390)/(gap.width/2))**2);
    assert(Math.abs(dot.y+size-bottomEdge)<1e-8);
    assert(Math.abs(dot.y+dot.dy-size-topEdge)<1e-8);
    assert(dot.phase>=0&&dot.phase<1);
  }
}
const legacy=createStudy();delete legacy.particles.edgeAngle;assert.equal(parseStudy(legacy).particles.edgeAngle,0);
const maximum=createStudy();maximum.particles.count=124;assert.equal(parseStudy(maximum).particles.count,124);maximum.particles.count=125;assert.throws(()=>parseStudy(maximum),/count/);
const tilted=createStudy();Object.assign(tilted.particles,{count:124,drift:0,edgeAngle:45});
let slanted=0,straight=0;for(const gap of particleGaps(tilted))for(const dot of gap.points){
  const available=gap.width/2-tilted.particles.size;
  if(Math.abs(dot.x-390)>available*.75){assert(dot.dx*(dot.x-390)<0);assert(Math.abs(dot.x+dot.dx-390)<=Math.abs(dot.x-390));slanted++;}
  if(Math.abs(dot.x-390)<available*.5){assert.equal(Math.abs(dot.dx),0);straight++;}
}
assert(slanted>0&&straight>0);
const invalidAngle=createStudy();invalidAngle.particles.edgeAngle=71;assert.throws(()=>parseStudy(invalidAngle),/edgeAngle/);
const changed=createStudy();changed.funnel.seed++;assert.notDeepEqual(particleGaps(changed),particleGaps(study));
const bad=createStudy();bad.particles.count=10000;assert.throws(()=>parseStudy(bad),/count/);
bad.particles.count=24;bad.funnel.data[1].value=20000;assert.throws(()=>parseStudy(bad),/quantities/);
const zero=createStudy();zero.funnel.data.forEach(stage=>stage.value=0);assert(particleGaps(zero).every(gap=>gap.points.length===0));
console.log('Verified seeded particle streams, 64 control extremes, curved-rim entry and exit, quantity-dependent counts, and configuration validation.');

const rounded=createStudy();rounded.funnel.options.cornerRadius=18;
const unrounded=createStudy();
for(let i=0;i<rounded.funnel.data.length;i++){
  const shape=containerGeometry(rounded,i);assert(!/NaN|Infinity/.test(shape.path));
  assert(shape.radius>=0&&shape.radius<=18);assert(shape.topLeft>=390-shape.width/2&&shape.topRight<=390+shape.width/2);
  assert.notEqual(shape.path,containerGeometry(unrounded,i).path);
}
for(const radius of [0,18])for(const tension of [0,4])for(const recoil of [0,3])for(const absorption of [0,1]){
 const config=createStudy();config.funnel.options.cornerRadius=radius;Object.assign(config.particles,{tension,recoil,absorption});parseStudy(config);
 const gaps=particleGaps(config);
 for(const gap of gaps)for(const p of gap.points){
  const source=containerGeometry(config,gap.index),target=containerGeometry(config,gap.index+1);
  assert(p.x-config.particles.size>=source.bottomLeft-1e-8&&p.x+config.particles.size<=source.bottomRight+1e-8);
  assert(p.x+p.dx-config.particles.size>=target.topLeft-1e-8&&p.x+p.dx+config.particles.size<=target.topRight+1e-8);
  const hitAge=p.duration*Math.sqrt(Math.max(0,(p.dy-2*config.particles.size)/p.dy));
  const falling=particleFrame(config,p,p.duration*.5),hit=particleFrame(config,p,hitAge),absorbed=particleFrame(config,p,(hitAge+p.duration)/2);
  assert.equal(falling.opacity,1);assert(Math.abs(hit.y-(p.dy-2*config.particles.size))<1e-8);
  if(absorption){assert(absorbed.sy<1&&absorbed.sx>1&&absorbed.opacity<1&&absorbed.y>hit.y);}else{assert.equal(absorbed.sx,1);assert.equal(absorbed.sy,1);}
 }
 for(let index=0;index<config.funnel.data.length;index++)for(let time=0;time<config.particles.duration*1.1;time+=30){const frame=containerFrame(config,gaps,index,time);assert(frame.scale>=.92&&frame.scale<=1.08+1e-8);assert(Number.isFinite(frame.shift));if(!tension&&!recoil&&!absorption)assert.deepEqual(frame,{shift:0,scale:1});}
}
const migration=createStudy();delete migration.particles.tension;delete migration.particles.recoil;delete migration.particles.absorption;delete migration.funnel.options.cornerRadius;
const normalized=parseStudy(migration);assert.equal(normalized.particles.tension,1.2);assert.equal(normalized.particles.recoil,.8);assert.equal(normalized.particles.absorption,.6);assert.equal(normalized.funnel.options.cornerRadius,0);
const badRadius=createStudy();badRadius.funnel.options.cornerRadius=19;assert.throws(()=>parseStudy(badRadius),/cornerRadius/);
console.log('Verified rounded-rim contacts, synchronized condensation and absorption, bounded recoil, disabled effects, and legacy surface-setting migration.');
