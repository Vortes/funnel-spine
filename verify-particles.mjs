import assert from 'node:assert/strict';
import {createStudy,parseStudy} from './dist/lab/vertical-particles/study-config.js';
import {particleGaps} from './dist/lab/vertical-particles/particles.js';
import {verticalStageLayout} from './dist/lab/vertical-layout.js';

const study=createStudy(),original=structuredClone(study);
assert.deepEqual(parseStudy(study),study);
assert.deepEqual(particleGaps(study),particleGaps(study));
assert.deepEqual(study,original);
assert.equal(particleGaps(study).length,study.funnel.data.length-1);
for(const stageGap of [6,20])for(const capCurve of [0,20])for(const size of [.5,2.5])for(const count of [6,124])for(const drift of [0,8])for(const edgeAngle of [0,70]){
  const config=createStudy();Object.assign(config.funnel.options,{stageGap,capCurve});Object.assign(config.particles,{size,count,drift,edgeAngle});parseStudy(config);
  const stages=verticalStageLayout(config.funnel.data,config.funnel.options.stageHeight,stageGap);
  for(const gap of particleGaps(config))for(const dot of gap.points){
    const left=390-gap.width/2,right=390+gap.width/2;
    assert(Number.isFinite(dot.x)&&Number.isFinite(dot.dy)&&dot.dy>0);
    assert(dot.x-size>=left-1e-8&&dot.x+size<=right+1e-8);
    assert(dot.x+dot.dx-size>=left-1e-8&&dot.x+dot.dx+size<=right+1e-8);
    const rim=stages[gap.index+1].y;
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
