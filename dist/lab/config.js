import {validateData} from '../core/data.js';
import {layoutGraph} from './lab-engine.js';
import {ranges,defaultOptions,normalizeOptions} from './options.js';
import {defaultConfigs} from './default-configs.js';
export const variants=['continuous','vertical','branching'];
export {ranges,defaultOptions};
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
export function createConfig(variant,seed=defaultConfigs[variant].seed){const config=structuredClone(defaultConfigs[variant]);if(seed!==config.seed){config.seed=seed;config.data=sampleData(variant,seed);}return config;}
export function parseConfig(input){
 if(!input||![1,2,3].includes(input.version)||!variants.includes(input.variant))throw new Error('Choose an atlas lab configuration with version 1, 2, or 3 and a supported variant.');
 if(!Number.isInteger(input.seed)||input.seed<0||input.seed>4294967295)throw new Error('Seed must be an integer between 0 and 4294967295.');
 if(!input.options||typeof input.options!=='object')throw new Error('The configuration needs an options object.');
 const source={...input.options};
 if(input.version===1){source.strokeWidth=Math.min(.75,Math.max(.25,(source.strokeWidth??1)*.75));source.nodeWidth=Math.min(6,Math.max(1,source.nodeWidth??2.5));source.texture=source.texture==='stipple'?'sparse':source.texture==='solid'?'mixed':source.texture;}
 if(source.texture===undefined)throw new Error('Choose a supported screen sequence.');
 const defaults={...defaultOptions,...defaultConfigs[input.variant].options};
 if(input.variant==='vertical'&&source.borderRadius===undefined)defaults.borderRadius=0;
 const options=normalizeOptions(source,defaults,{strict:false});
 const data=input.version<3&&input.variant==='branching'&&input.dataOrigin==='seed'?sampleData('branching',input.seed):input.data;
 validateData(data,input.variant);if(input.variant==='branching')layoutGraph(data,options);
 return{version:3,variant:input.variant,seed:input.seed,dataOrigin:input.dataOrigin==='custom'?'custom':'seed',options,data:structuredClone(data)};
}
