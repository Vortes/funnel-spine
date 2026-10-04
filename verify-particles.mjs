import assert from 'node:assert/strict';
import {createStudy,parseStudy} from './dist/lab/vertical-particles/study-config.js';
import {particleGaps} from './dist/lab/vertical-particles/particles.js';

const study=createStudy(),original=structuredClone(study);
assert.deepEqual(parseStudy(study),study);
assert.deepEqual(particleGaps(study),particleGaps(study));
assert.deepEqual(study,original);
assert.equal(particleGaps(study).length,study.funnel.data.length-1);
for(const stageGap of [6,20])for(const capCurve of [0,20])for(const size of [.5,2.5])for(const count of [6,48])for(const drift of [0,8]){
  const config=createStudy();Object.assign(config.funnel.options,{stageGap,capCurve});Object.assign(config.particles,{size,count,drift});parseStudy(config);
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
const changed=createStudy();changed.funnel.seed++;assert.notDeepEqual(particleGaps(changed),particleGaps(study));
const bad=createStudy();bad.particles.count=10000;assert.throws(()=>parseStudy(bad),/count/);
bad.particles.count=24;bad.funnel.data[1].value=20000;assert.throws(()=>parseStudy(bad),/quantities/);
const zero=createStudy();zero.funnel.data.forEach(stage=>stage.value=0);assert(particleGaps(zero).every(gap=>gap.points.length===0));
console.log('Verified seeded particle streams, 32 control extremes, curved-rim entry and exit, quantity-dependent counts, and configuration validation.');
