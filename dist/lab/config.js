import {validateData} from '../core/data.js';
import {layoutGraph,isometricStageGeometry} from './lab-engine.js';
import {ranges,defaultOptions,normalizeOptions,verticalSettings} from './options.js';
import {defaultConfigs} from './default-configs.js';
export const variants=['vertical','continuous','branching'];
export {ranges,defaultOptions};
export function setVerticalControl(options,key,value){options[key]=value;options.verticalViews[options.verticalView][key]=value;}
export function setVerticalView(options,view){options.verticalViews[options.verticalView]=verticalSettings(options);Object.assign(options,options.verticalViews[view]);options.verticalView=view;}
export function sampleData(variant,seed){
 let a=seed>>>0;const random=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 const total=10000+Math.round(random()*5000/100)*100;
 if(variant!=='branching'){let value=total;return ['Visitors','Engaged','Signups','Activated','Converted'].map((label,i)=>{if(i)value=Math.max(1,Math.round(value*(.35+random()*.4)),variant==='vertical'?Math.round(total*[1,.3,.2,.14,.1][i]):0);return{id:label.toLowerCase(),label,value};});}
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
 if(source.texture===undefined)throw new Error('Choose a supported screen pattern.');
 const base={...defaultOptions,...defaultConfigs[variant].options};
 if(variant==='continuous')source.mirror??=false;
 if(variant==='vertical'){
  source.verticalView??=input.variant==='isometric'?'isometric':'flat';
  if(source.borderRadius===undefined)base.borderRadius=0;
 }
 const options=normalizeOptions(source,base,{strict:false});
 if(variant==='vertical'){
  if(source.verticalViews===undefined){
   const current=verticalSettings(options);
   options.verticalViews={isometric:{...current,tailRatio:options.verticalView==='flat'&&current.tailRatio===1?defaultConfigs.vertical.options.tailRatio:current.tailRatio},flat:{...current}};
  }
 }
 const data=input.version<3&&input.variant==='branching'&&input.dataOrigin==='seed'?sampleData('branching',input.seed):input.data;
 validateData(data,variant);if(variant==='branching')layoutGraph(data,options);if(variant==='vertical')isometricStageGeometry(data,{...options,...options.verticalViews.isometric});
 return{version:3,variant,seed:input.seed,dataOrigin:input.dataOrigin==='custom'?'custom':'seed',options,data:structuredClone(data)};
}
