import { validateData } from '../atlas-kit.js';
import { INK, PAPER, screenDefs, screenOrder } from './screens.js';
const NS = 'http://www.w3.org/2000/svg';
const make = (tag, attrs = {}, text) => { const el = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, String(v)); if(text !== undefined) el.textContent=text; return el; };
const fmt = n => new Intl.NumberFormat('en-US').format(n);
const pct = (n,d) => d ? `${(100*n/d).toFixed(1)}%` : '—';
export function layoutGraph(data,{nodeGap=66,nodeWidth=2.5}={}) {
 validateData(data,'branching'); const nodes=data.nodes.map(n=>({...n,incoming:[],outgoing:[],level:0}));const map=new Map(nodes.map(n=>[n.id,n]));const links=data.links.map((l,i)=>({...l,id:`link-${i}`,sourceNode:map.get(l.source),targetNode:map.get(l.target)}));links.forEach(l=>{l.sourceNode.outgoing.push(l);l.targetNode.incoming.push(l);});
 let pending=[...nodes];const done=new Set();while(pending.length){const ready=pending.filter(n=>n.incoming.every(l=>done.has(l.source)));ready.forEach(n=>{n.level=n.incoming.length?Math.max(...n.incoming.map(l=>l.sourceNode.level))+1:0;n.value=Math.max(n.incoming.reduce((s,l)=>s+l.value,0),n.outgoing.reduce((s,l)=>s+l.value,0));done.add(n.id);});pending=pending.filter(n=>!done.has(n.id));}
 const depth=Math.max(...nodes.map(n=>n.level));const cols=Array.from({length:depth+1},(_,i)=>nodes.filter(n=>n.level===i)); const scale=Math.min(...cols.map(c=>(240-(c.length-1)*nodeGap)/c.reduce((s,n)=>s+n.value,0))); if(scale<=0)throw new Error('Too many nodes in one stage for this chart.');
 cols.forEach((col,i)=>{let y=110;col.forEach(n=>{n.x=50+i*790/depth;n.y=y;n.height=n.value*scale;y+=n.height+nodeGap;});});
 nodes.forEach(n=>{let a=n.y,b=n.y;n.outgoing.forEach(l=>{l.sy=a;l.width=l.value*scale;a+=l.width;});n.incoming.forEach(l=>{l.ty=b;b+=l.width;});});return {nodes,links,total:nodes.filter(n=>!n.incoming.length).reduce((s,n)=>s+n.value,0)};
}
export function renderFunnel(data,{variant='continuous',texture='mixed',density=7,strokeWidth=.5,color=INK,labels=true,curve=.5,idPrefix='atlas',chartHeight=235,stageHeight=310,stageGap=9,capCurve=12,tailRatio=.65,nodeGap=66,nodeWidth=2.5,patternAngle=-45,dotGain=.03,roughness=.15,paperGrain=false,seed=1234,fontSize=14,guides=true}={}) {
 if(!['continuous','vertical','branching'].includes(variant))throw new Error('Unknown funnel variant.');validateData(data,variant);
 const height=variant==='branching'?405:460;
 const svg=make('svg',{xmlns:NS,viewBox:`0 0 900 ${height}`,width:'100%',role:'group','aria-label':`${variant} conversion funnel`});
 color=INK;strokeWidth*=4/3;
 svg.append(screenDefs({idPrefix,density,patternAngle,dotGain,roughness,seed,screenWidth:900,screenHeight:height}));
 svg.append(make('rect',{width:900,height,fill:paperGrain?`url(#${idPrefix}-grain)`:PAPER}));
 const order=screenOrder(texture);
 const fillTypes=[];
 const chooseScreen=(i,neighbors=[])=>{const used=new Set(neighbors.map(key=>fillTypes[key]));let type=order[i%order.length];for(let j=0;j<order.length;j++){const candidate=order[(i+j)%order.length];if(!used.has(candidate)){type=candidate;break;}}fillTypes[i]=type;return `url(#${idPrefix}-${type})`;};
 const text=(x,y,t,size=13,extra={})=>make('text',{x,y,fill:color,'font-family':'Arial, Helvetica, sans-serif','font-size':size,...extra},t);
 const interactive=(path,key,info)=>{path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',`${info.label}, ${fmt(info.value)}, ${pct(info.value,info.denominator)} conversion`);path.setAttribute('data-key',key);path.setAttribute('data-base-fill',path.getAttribute('fill'));if(roughness>0)path.setAttribute('filter',`url(#${idPrefix}-edge)`);path.atlasInfo=info;path.append(make('title',{},path.getAttribute('aria-label')));svg.append(path);};
 if(variant==='branching'){
  const g=layoutGraph(data,{nodeGap,nodeWidth}); const depth=Math.max(...g.nodes.map(n=>n.level));for(let i=0;i<=depth;i++){svg.append(text(50+i*790/depth,30,`0${i+1} / ${i===0?'ENTRY':i===depth?'OUTCOME':'CHANNEL'}`,11,{'text-anchor':i===depth?'end':'start'}));svg.append(make('line',{x1:50+i*790/depth,y1:48,x2:50+i*790/depth,y2:402,stroke:color,'stroke-dasharray':'2 5'}));}
  g.links.forEach((l,i)=>{const x=l.sourceNode.x+nodeWidth,xx=l.targetNode.x;const c=(xx-x)*curve;const d=`M ${x} ${l.sy} C ${x+c} ${l.sy} ${xx-c} ${l.ty} ${xx} ${l.ty} L ${xx} ${l.ty+l.width} C ${xx-c} ${l.ty+l.width} ${x+c} ${l.sy+l.width} ${x} ${l.sy+l.width} Z`;interactive(make('path',{d,fill:chooseScreen(i,g.links.slice(0,i).map((prev,j)=>prev.source===l.source||prev.target===l.target||prev.target===l.source||prev.source===l.target?j:-1).filter(j=>j>=0)),stroke:color,'stroke-width':strokeWidth}),l.id,{label:`${l.sourceNode.label} → ${l.targetNode.label}`,value:l.value,denominator:l.sourceNode.value,total:g.total,source:l.source,target:l.target,kind:'link'});});
  g.nodes.forEach(n=>{svg.append(make('rect',{x:n.x,y:n.y,width:nodeWidth,height:n.height,fill:`url(#${idPrefix}-solid)`,stroke:color,'stroke-width':.35}));if(labels){svg.append(text(n.x,n.y-25,n.label,fontSize,{'text-anchor':n.level===depth?'end':'start'}));svg.append(text(n.x,n.y-7,fmt(n.value),fontSize-2,{'text-anchor':n.level===depth?'end':'start'}));}});svg.atlasLayout=g;
 }else{
  const max=data[0].value||1;
  if(variant==='continuous'){
   const step=790/(data.length-1);const base=365;if(guides){for(const ratio of [0,.25,.5,.75,1]){const y=base-chartHeight*ratio;svg.append(make('line',{x1:38,y1:y,x2:46,y2:y,stroke:color,'stroke-width':.4}),text(31,y+3,`${Math.round(ratio*100)}`,10,{'text-anchor':'end'}));}svg.append(text(31,base-chartHeight-13,'%',10,{'text-anchor':'end'}));}data.forEach((s,i)=>{const x=50+i*step,h=s.value/max*chartHeight;svg.append(make('line',{x1:x,y1:96,x2:x,y2:386,stroke:color,'stroke-dasharray':'2 5'}));if(labels){svg.append(text(x,59,s.label,fontSize,{'text-anchor':i===data.length-1?'end':'start'}));svg.append(text(x,81,fmt(s.value),fontSize-2,{'text-anchor':i===data.length-1?'end':'start'}));}if(i<data.length-1){const next=data[i+1],h2=next.value/max*chartHeight;const xx=x+step,c=step*curve;const d=`M ${x} ${base-h} C ${x+c} ${base-h} ${xx-c} ${base-h2} ${xx} ${base-h2} L ${xx} ${base} L ${x} ${base} Z`;interactive(make('path',{d,fill:chooseScreen(i),stroke:color,'stroke-width':strokeWidth}),s.id,{label:`${s.label} → ${next.label}`,value:next.value,denominator:s.value,total:max,kind:'stage'});}svg.append(text(x,417,`${String(i+1).padStart(2,'0')} / ${pct(s.value,max)}`,12,{'text-anchor':i===data.length-1?'end':'start'}));});svg.append(make('line',{x1:50,y1:365,x2:840,y2:365,stroke:color,'stroke-width':strokeWidth}));
  }else{
   const height=stageHeight/data.length,center=390;data.forEach((s,i)=>{const y=70+i*height,w=460*s.value/max,w2=460*(data[i+1]?.value??s.value*tailRatio)/max;const gap=stageGap;const d=`M ${center-w/2} ${y} Q ${center} ${y+capCurve} ${center+w/2} ${y} L ${center+w2/2} ${y+height-gap} Q ${center} ${y+height+capCurve/4-gap} ${center-w2/2} ${y+height-gap} Z`;interactive(make('path',{d,fill:chooseScreen(i),stroke:color,'stroke-width':strokeWidth}),s.id,{label:s.label,value:s.value,denominator:data[i-1]?.value??max,total:max,kind:'stage'});if(labels){svg.append(text(52,y+height/2,`${String(i+1).padStart(2,'0')}`,12));svg.append(make('line',{x1:center+w/2+12,y1:y+height/2,x2:655,y2:y+height/2,stroke:color,'stroke-width':.5,'stroke-dasharray':'2 3'}));svg.append(text(670,y+height/2-4,s.label,fontSize));svg.append(text(670,y+height/2+15,`${fmt(s.value)} · ${pct(s.value,max)}`,fontSize-2));}});
  }
 }
 if(!guides)svg.querySelectorAll('line[stroke-dasharray="2 5"]').forEach(line=>line.remove());
 return svg;
}
