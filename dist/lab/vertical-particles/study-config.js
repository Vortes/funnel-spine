import {defaultStudy} from './default-study.js';

export const particleRanges={size:[.5,2.5],count:[6,124],duration:[160,1200],drift:[0,8],edgeAngle:[0,70]};
export function createStudy(){return structuredClone(defaultStudy);}
export function parseStudy(input){
  if(input?.version!==1||input.kind!=='vertical-particles')throw new Error('Choose a vertical particle study configuration.');
  const funnel=input.funnel;
  if(funnel?.version!==3||funnel.variant!=='vertical'||!Number.isInteger(funnel.seed)||funnel.seed<0||funnel.seed>4294967295)throw new Error('The study needs a version 3 vertical funnel.');
  if(!Array.isArray(funnel.data)||funnel.data.length<2||funnel.data.length>8)throw new Error('Use 2–8 funnel stages.');
  const ids=new Set();
  funnel.data.forEach((stage,i)=>{
    if(typeof stage.id!=='string'||ids.has(stage.id)||typeof stage.label!=='string'||!Number.isFinite(stage.value)||stage.value<0||(i&&stage.value>funnel.data[i-1].value))throw new Error('Stage IDs must be unique and quantities must be finite, nonnegative, and decreasing.');
    ids.add(stage.id);
  });
  const ranges={density:[3,14],strokeWidth:[.25,.75],patternAngle:[-90,90],dotGain:[-.8,.2],roughness:[0,.6],fontSize:[12,18],curve:[.1,.8],chartHeight:[120,265],stageHeight:[250,330],stageGap:[6,20],capCurve:[0,20],tailRatio:[.15,1],nodeGap:[28,85],nodeWidth:[1,6]};
  for(const [key,[min,max]]of Object.entries(ranges))if(!Number.isFinite(funnel.options?.[key])||funnel.options[key]<min||funnel.options[key]>max)throw new Error(`${key} must be between ${min} and ${max}.`);
  for(const key of ['labels','guides','paperGrain'])if(typeof funnel.options[key]!=='boolean')throw new Error(`${key} must be true or false.`);
  if(!['mixed','sparse','dense','am','hatch','cross','coarse'].includes(funnel.options.texture))throw new Error('Choose a supported screen sequence.');
  const particles={};
  for(const [key,[min,max]]of Object.entries(particleRanges)){
    const value=key==='edgeAngle'?(input.particles?.[key]??0):input.particles?.[key];
    if(!Number.isFinite(value)||value<min||value>max||(key==='count'&&!Number.isInteger(value)))throw new Error(`${key} must be between ${min} and ${max}.`);
    particles[key]=value;
  }
  return {version:1,kind:'vertical-particles',funnel:structuredClone(funnel),particles};
}
