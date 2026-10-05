import {validateData} from '../atlas-kit.js';
import {layoutGraph,isometricStageGeometry} from './lab-engine.js';
import {screenTypes} from './screens.js';
import {defaultConfigs} from './default-configs.js';
export const variants=['vertical','continuous','branching'];
export const ranges={density:[3,14],strokeWidth:[.25,.75],patternAngle:[-90,90],dotGain:[-.8,.2],roughness:[0,.6],fontSize:[12,18],curve:[.1,.8],chartHeight:[120,265],edgeFade:[0,.45],stageHeight:[250,330],stageGap:[0,20],capCurve:[0,20],borderRadius:[0,20],tailRatio:[.15,1],isoDepth:[18,200],isoRotation:[-45,45],nodeGap:[28,85],nodeWidth:[1,6]};
export const defaultOptions={texture:'mixed',density:6,strokeWidth:.5,patternAngle:-45,dotGain:.03,roughness:.15,paperGrain:false,fontSize:14,labels:true,guides:true,curve:.5,chartHeight:235,edgeFade:0,stageHeight:310,stageGap:9,capCurve:12,borderRadius:0,tailRatio:.65,nodeGap:66,nodeWidth:2.5};
const verticalControlKeys=['texture','density','strokeWidth','patternAngle','dotGain','roughness','fontSize','labels','paperGrain','stageHeight','stageGap','capCurve','borderRadius','tailRatio','isoDepth','isoRotation'];
const verticalSettings=options=>Object.fromEntries(verticalControlKeys.map(key=>[key,options[key]]));
export function setVerticalControl(options,key,value){options[key]=value;options.verticalViews[options.verticalView][key]=value;}
export function setVerticalView(options,view){options.verticalViews[options.verticalView]=verticalSettings(options);Object.assign(options,options.verticalViews[view]);options.verticalView=view;}
export function sampleData(variant,seed){
 let a=seed>>>0;const random=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 const total=10000+Math.round(random()*5000/100)*100;
 if(variant!=='branching'){let value=total;return ['Visitors','Engaged','Signups','Activated','Converted'].map((label,i)=>{if(i)value=Math.max(1,Math.round(value*(.35+random()*.4)));return{id:label.toLowerCase(),label,value};});}
 const organic=Math.round(total*(.45+random()*.3)),paid=total-organic,orgSignup=Math.round(organic*(.18+random()*.25)),paidSignup=Math.round(paid*(.18+random()*.25));
 const active=Math.round((orgSignup+paidSignup)*(.4+random()*.35)),orgActive=Math.round(active*orgSignup/(orgSignup+paidSignup)),paidActive=active-orgActive;
 return {
  nodes:[{id:'visitors',label:'Visitors',value:total},{id:'organic',label:'Organic'},{id:'paid',label:'Paid'},
   ...['organic','paid'].flatMap(channel=>['signup','exit','active','inactive'].map(stage=>({id:`${channel}-${stage}`,label:`${{signup:'Signups',exit:'Drop-off',active:'Activated',inactive:'Inactive'}[stage]} · ${channel==='organic'?'Organic':'Paid'}`})))],
  links:[{source:'visitors',target:'organic',value:organic},{source:'visitors',target:'paid',value:paid},
   {source:'organic',target:'organic-signup',value:orgSignup},{source:'organic',target:'organic-exit',value:organic-orgSignup},
   {source:'paid',target:'paid-signup',value:paidSignup},{source:'paid',target:'paid-exit',value:paid-paidSignup},
   {source:'organic-signup',target:'organic-active',value:orgActive},{source:'organic-signup',target:'organic-inactive',value:orgSignup-orgActive},
   {source:'paid-signup',target:'paid-active',value:paidActive},{source:'paid-signup',target:'paid-inactive',value:paidSignup-paidActive}]
 };
}
export function createConfig(variant,seed=defaultConfigs[variant].seed){const config=structuredClone(defaultConfigs[variant]);if(variant==='vertical')config.options.verticalViews={isometric:verticalSettings(config.options),flat:verticalSettings(config.options)};if(seed!==config.seed){config.seed=seed;config.data=sampleData(variant,seed);}return config;}
export function parseConfig(input){
 if(!input||![1,2,3].includes(input.version)||![...variants,'isometric'].includes(input.variant))throw new Error('Choose an atlas lab configuration with version 1, 2, or 3 and a supported variant.');
 if(!Number.isInteger(input.seed)||input.seed<0||input.seed>4294967295)throw new Error('Seed must be an integer between 0 and 4294967295.');
 if(!input.options||typeof input.options!=='object')throw new Error('The configuration needs an options object.');
 const variant=input.variant==='isometric'?'vertical':input.variant,source={...input.options};
 if(input.version===1){source.strokeWidth=Math.min(.75,Math.max(.25,(source.strokeWidth??1)*.75));source.nodeWidth=Math.min(6,Math.max(1,source.nodeWidth??2.5));}
 if(['stipple','solid','sparse'].includes(source.texture))source.texture='dense';
 const options={...defaultOptions,...defaultConfigs[variant].options};
 if(variant==='continuous'){
  options.mirror=source.mirror??false;
  if(typeof options.mirror!=='boolean')throw new Error('mirror must be true or false.');
 }
 if(variant==='vertical'){
  options.verticalView=source.verticalView??(input.variant==='isometric'?'isometric':'flat');
  if(!['flat','isometric'].includes(options.verticalView))throw new Error('Choose a flat or isometric vertical view.');
  if(source.borderRadius===undefined)options.borderRadius=0;
 }
 for(const[key,[min,max]]of Object.entries(ranges)){if(source[key]!==undefined){const value=source[key];if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${key} must be between ${min} and ${max}.`);options[key]=value;}}
 if(source.texture!=='mixed'&&!screenTypes.includes(source.texture))throw new Error('Choose a supported screen pattern.');options.texture=source.texture;
 for(const key of ['labels','guides','paperGrain']){if(source[key]!==undefined){if(typeof source[key]!=='boolean')throw new Error(`${key} must be true or false.`);options[key]=source[key];}}
 if(variant==='vertical'){
  const views=source.verticalViews;
  if(views!==undefined){
   if(!views||typeof views!=='object'||Array.isArray(views)||!views.flat||!views.isometric)throw new Error('Vertical controls need flat and isometric settings.');
   options.verticalViews={};
   for(const view of ['isometric','flat']){
    const settings=views[view];
    if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error(`${view} controls must be an object.`);
    const resolved={...verticalSettings(options)};
    for(const key of verticalControlKeys){
     if(settings[key]===undefined)continue;
     const value=settings[key];
     if(key==='texture'){if(value!=='mixed'&&!screenTypes.includes(value))throw new Error(`${view} texture must be a supported screen pattern.`);}
     else if(key==='labels'||key==='paperGrain'){if(typeof value!=='boolean')throw new Error(`${view} ${key} must be true or false.`);}
     else{const[min,max]=ranges[key];if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${view} ${key} must be between ${min} and ${max}.`);}
     resolved[key]=value;
    }
    options.verticalViews[view]=resolved;
   }
   Object.assign(options,options.verticalViews[options.verticalView]);
  }else{
   const current=verticalSettings(options);
   options.verticalViews={isometric:{...current,tailRatio:options.verticalView==='flat'&&current.tailRatio===1?defaultConfigs.vertical.options.tailRatio:current.tailRatio},flat:{...current}};
  }
 }
 const data=input.version<3&&input.variant==='branching'&&input.dataOrigin==='seed'?sampleData('branching',input.seed):input.data;
 validateData(data,variant);if(variant==='branching')layoutGraph(data,options);if(variant==='vertical')isometricStageGeometry(data,{...options,...options.verticalViews.isometric});
 return{version:3,variant,seed:input.seed,dataOrigin:input.dataOrigin==='custom'?'custom':'seed',options,data:structuredClone(data)};
}
