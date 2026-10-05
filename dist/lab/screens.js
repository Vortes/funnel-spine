import {stippleImage} from './stipple-shader.js';

export const INK = '#2F4FE0';
export const PAPER = '#E4E5E8';
const NS='http://www.w3.org/2000/svg';
export const element=(tag,attrs={},text)=>{const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;};
export const screenTypes=['dense','am','hatch','cross','coarse'];
export const screenLabels={mixed:'Atlas mix',sparse:'Sparse stipple',dense:'Dense stipple',am:'Fine AM dots',hatch:'Diagonal hatch',cross:'Diamond lattice',coarse:'Coarse dots',solid:'Solid ink'};
export function seededRandom(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const stippleCache=new Map();
export function clearVectorStippleCache(){stippleCache.clear();}
export function stippleField({type='dense',width=900,height=460,density=6,dotGain=.03,seed=1234}={}){
 const pitch=Math.max(3,Math.min(14,density)),gain=Math.max(-.8,Math.min(.2,dotGain));
 const key=[type,width,height,pitch,seed].join('/');let field=stippleCache.get(key);
 if(!field){
  const baseRadius=(type==='sparse'?.42:.62)*(pitch/6),coverage=type==='sparse'?.025:.28;
  const count=Math.round(width*height*coverage/(Math.PI*baseRadius*baseRadius));
  const rng=seededRandom(seed+(type==='dense'?104729:0)),groups=Array.from({length:6},(_,i)=>({radius:baseRadius*(.8+i*.08),commands:[]}));
  for(let i=0;i<count;i++){const x=(rng()*width).toFixed(2),y=(rng()*height).toFixed(2);groups[Math.floor(rng()*groups.length)].commands.push(`M${x} ${y}h.01`);}
  field={count,width,height,groups:groups.map(g=>({radius:g.radius,d:g.commands.join('')}))};
  if(stippleCache.size>=24)stippleCache.delete(stippleCache.keys().next().value);stippleCache.set(key,field);
 }
 return {...field,groups:field.groups.map(g=>({...g,radius:g.radius*(1+gain)}))};
}
export function screenDefs({idPrefix='riso',density=6,patternAngle=-45,dotGain=.03,seed=1234,roughness=.15,screenWidth=900,screenHeight=460,onlyType,includeSparse=false,stippleRenderer='shader',stippleScale=2}={}){
 const defs=element('defs'),s=Math.max(3,Math.min(14,density));
 for(const[type,index]of (onlyType?[onlyType]:[...screenTypes,'solid','grain',...(includeSparse?['sparse']:[])]).map((t,i)=>[t,i])){const stochastic=type==='sparse'||type==='dense',size=type==='coarse'?s*1.8:type==='grain'?128:s,width=stochastic?screenWidth:size,height=stochastic?screenHeight:size;const attrs={id:`${idPrefix}-${type}`,width,height,patternUnits:'userSpaceOnUse'};if(type==='hatch'||type==='cross')attrs.patternTransform=`rotate(${patternAngle})`;const p=element('pattern',attrs);p.append(element('rect',{width,height,fill:PAPER}));const rng=seededRandom(seed+index*104729);
 if(stochastic){const image=stippleRenderer==='shader'?stippleImage({type,width,height,density:s,dotGain,seed,scale:stippleScale}):null;if(image){p.setAttribute('data-dot-count',image.count);p.setAttribute('data-stipple-renderer','shader');p.append(element('image',{width,height,href:image.url,preserveAspectRatio:'none'}));}else{const field=stippleField({type,width,height,density:s,dotGain,seed});p.setAttribute('data-dot-count',field.count);p.setAttribute('data-stipple-renderer','vector');for(const group of field.groups)p.append(element('path',{d:group.d,fill:'none',stroke:INK,'stroke-width':group.radius*2,'stroke-linecap':'round'}));}}
 if(type==='am'||type==='coarse')p.append(element('circle',{cx:size/2,cy:size/2,r:size*Math.sqrt((type==='am'?.3:.7)/Math.PI)*(1+dotGain),fill:INK}));
 if(type==='hatch')p.append(element('path',{d:`M 0 ${size/2} H ${size}`,stroke:INK,'stroke-width':size*.5*(1+dotGain)}));
 if(type==='cross'){const width=size*(1-Math.sqrt(.5))*(1+dotGain);p.append(element('path',{d:`M 0 ${size/2} H ${size} M ${size/2} 0 V ${size}`,stroke:INK,'stroke-width':width}));}
 if(type==='solid'){p.append(element('rect',{width:size,height:size,fill:INK}));if(roughness>0)for(let i=0;i<3;i++)p.append(element('circle',{cx:rng()*size,cy:rng()*size,r:roughness*.6,fill:PAPER}));}
 if(type==='grain')for(let i=0;i<190;i++)p.append(element('circle',{cx:rng()*size,cy:rng()*size,r:.08+rng()*.09,fill:INK}));defs.append(p);}
 if(roughness>0){const filter=element('filter',{id:`${idPrefix}-edge`,x:'-5%',y:'-5%',width:'110%',height:'110%','color-interpolation-filters':'sRGB'});filter.append(element('feTurbulence',{type:'fractalNoise',baseFrequency:'.28',numOctaves:2,seed:seed%9997,result:'noise'}),element('feDisplacementMap',{in:'SourceGraphic',in2:'noise',scale:roughness,xChannelSelector:'R',yChannelSelector:'G'}));defs.append(filter);}
 return defs;
}
export function screenSwatch(type,options={},idPrefix='swatch') {const svg=element('svg',{xmlns:NS,viewBox:'0 0 32 24',width:32,height:24,'aria-hidden':'true'});svg.append(screenDefs({...options,idPrefix,screenWidth:32,screenHeight:24,...(type==='mixed'?{}:{onlyType:type})}));if(type==='mixed'){screenTypes.forEach((screen,i)=>svg.append(element('rect',{x:i*32/screenTypes.length,y:0,width:32/screenTypes.length,height:24,fill:`url(#${idPrefix}-${screen})`})));svg.append(element('rect',{x:.5,y:.5,width:31,height:23,fill:'none',stroke:INK,'stroke-width':.65}));}else svg.append(element('rect',{x:.5,y:.5,width:31,height:23,fill:`url(#${idPrefix}-${type})`,stroke:INK,'stroke-width':.65}));return svg;}
