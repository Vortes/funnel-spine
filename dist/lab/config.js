import {validateData} from '../atlas-kit.js';
import {layoutGraph} from './lab-engine.js';
import {screenTypes} from './screens.js';
import {defaultConfigs} from './default-configs.js';
export const variants=['continuous','vertical','branching'];
export const ranges={density:[3,14],strokeWidth:[.25,.75],patternAngle:[-90,90],dotGain:[-.8,.2],roughness:[0,.6],fontSize:[12,18],curve:[.1,.8],chartHeight:[120,265],edgeFade:[0,.45],stageHeight:[250,330],stageGap:[0,20],capCurve:[0,20],borderRadius:[0,20],tailRatio:[.15,1],nodeGap:[28,85],nodeWidth:[1,6]};
export const defaultOptions={texture:'dense',density:6,strokeWidth:.5,patternAngle:-45,dotGain:.03,roughness:.15,paperGrain:false,fontSize:14,labels:true,guides:true,curve:.5,chartHeight:235,edgeFade:0,stageHeight:310,stageGap:9,capCurve:12,borderRadius:0,tailRatio:.65,nodeGap:66,nodeWidth:2.5};
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
 if(input.version===1){source.strokeWidth=Math.min(.75,Math.max(.25,(source.strokeWidth??1)*.75));source.nodeWidth=Math.min(6,Math.max(1,source.nodeWidth??2.5));}
 if(['stipple','solid','sparse'].includes(source.texture))source.texture='dense';
 const options={...defaultOptions,...defaultConfigs[input.variant].options};
 if(input.variant==='vertical'&&source.borderRadius===undefined)options.borderRadius=0;
 for(const[key,[min,max]]of Object.entries(ranges)){if(source[key]!==undefined){const value=source[key];if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${key} must be between ${min} and ${max}.`);options[key]=value;}}
 if(source.texture!=='mixed'&&!screenTypes.includes(source.texture))throw new Error('Choose a supported screen pattern.');options.texture=source.texture;
 for(const key of ['labels','guides','paperGrain']){if(source[key]!==undefined){if(typeof source[key]!=='boolean')throw new Error(`${key} must be true or false.`);options[key]=source[key];}}
 const data=input.version<3&&input.variant==='branching'&&input.dataOrigin==='seed'?sampleData('branching',input.seed):input.data;
 validateData(data,input.variant);if(input.variant==='branching')layoutGraph(data,options);
 return{version:3,variant:input.variant,seed:input.seed,dataOrigin:input.dataOrigin==='custom'?'custom':'seed',options,data:structuredClone(data)};
}
