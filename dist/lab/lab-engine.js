import { validateData } from '../atlas-kit.js';
import { INK, PAPER, screenDefs, screenOrder } from './screens.js';
const NS = 'http://www.w3.org/2000/svg';
const make = (tag, attrs = {}, text) => { const el = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, String(v)); if(text !== undefined) el.textContent=text; return el; };
const fmt = n => new Intl.NumberFormat('en-US').format(n);
const pct = (n,d) => d ? `${(100*n/d).toFixed(1)}%` : '—';
export function layoutGraph(data,{nodeGap=66,nodeWidth=2.5}={}) {
 validateData(data,'branching');
 const nodes=data.nodes.map(n=>({...n,incoming:[],outgoing:[],level:0})),map=new Map(nodes.map(n=>[n.id,n]));
 const links=data.links.map((l,i)=>({...l,id:`link-${i}`,sourceNode:map.get(l.source),targetNode:map.get(l.target)}));
 links.forEach(l=>{l.sourceNode.outgoing.push(l);l.targetNode.incoming.push(l);});
 const roots=nodes.filter(n=>!n.incoming.length);
 if(roots.length!==1)throw new Error('Use one entry bucket for a branching funnel.');
 for(const n of nodes){
  if(n.incoming.length>1)throw new Error(`${n.label} has more than one parent. Give each branch its own child bucket.`);
  const incoming=n.incoming.reduce((sum,l)=>sum+l.value,0),outgoing=n.outgoing.reduce((sum,l)=>sum+l.value,0),quantity=incoming||outgoing;
  if(n.value!==undefined&&(!Number.isFinite(n.value)||n.value<=0||Math.abs(n.value-quantity)>1e-8*Math.max(1,n.value)))throw new Error(`${n.label}: links account for ${fmt(quantity)} of the declared ${fmt(n.value)}. Every split must account for 100%.`);n.value=quantity;
  if(n.incoming.length&&n.outgoing.length&&Math.abs(incoming-outgoing)>1e-8*Math.max(1,incoming))throw new Error(`${n.label} distributes ${fmt(outgoing)} of ${fmt(incoming)}. Its children must account for 100%; add a remaining or drop-off bucket.`);
 }
 const root=roots[0],total=root.value,scale=240/total;
 const measure=(n,level)=>{n.level=level;n.height=n.value*scale;n.span=Math.max(n.height,n.outgoing.reduce((sum,l)=>sum+measure(l.targetNode,level+1),0)+Math.max(0,n.outgoing.length-1)*nodeGap);return n.span;};measure(root,0);
 const place=(n,top)=>{n.y=top+(n.span-n.height)/2;const childrenHeight=n.outgoing.reduce((sum,l)=>sum+l.targetNode.span,0)+Math.max(0,n.outgoing.length-1)*nodeGap;let y=top+(n.span-childrenHeight)/2;n.outgoing.forEach(l=>{place(l.targetNode,y);y+=l.targetNode.span+nodeGap;});};place(root,110);
 const bottom=110+root.span,depth=Math.max(...nodes.map(n=>n.level)),width=Math.max(900,100+depth*160),columnStep=(width-100)/depth;
 nodes.forEach(n=>{n.x=50+n.level*columnStep;let sy=n.y;n.outgoing.forEach(l=>{l.width=l.value*scale;l.sy=sy;l.ty=l.targetNode.y;sy+=l.width;});});
 return {nodes,links,total,depth,bottom,height:Math.max(405,Math.ceil(bottom+55)),width,columnStep,nodeWidth};
}
export function edgeFadeStops(fade,side='both'){
 if(!fade)return [[0,1],[1,1]];
 const ramp=Array.from({length:11},(_,i)=>{const t=i/10;return [fade*t,+(t*t*(3-2*t)).toFixed(4)];});
 const left=[...ramp,[1,1]],right=[[0,1],...ramp.slice().reverse().map(([offset,alpha])=>[1-offset,alpha])];
 return side==='left'?left:side==='right'?right:[...ramp,[1-fade,1],...right.slice(2)];
}
export function verticalRimGeometry(data,{stageHeight=310,stageGap=9,tailRatio=.65,borderRadius=0}={}){
 const max=data[0].value||1,visibleHeight=Math.max(0,stageHeight/data.length-stageGap);
 const widths=[...data.map(stage=>460*stage.value/max),460*data.at(-1).value*tailRatio/max];
 const radii=widths.map(width=>Math.min(borderRadius,width/4,visibleHeight/3));
 return {widths,radii};
}
function verticalStagePath(center,y,height,w,w2,gap,capCurve,topRadius,bottomRadius){
 const left=center-w/2,right=center+w/2,bottom=y+height-gap,leftBottom=center-w2/2,rightBottom=center+w2/2;
 if(!topRadius&&!bottomRadius)return `M ${left} ${y} Q ${center} ${y+capCurve} ${right} ${y} L ${rightBottom} ${bottom} Q ${center} ${bottom+capCurve/4} ${leftBottom} ${bottom} Z`;
 const topT=w?topRadius/w:0,bottomT=w2?bottomRadius/w2:0,topSideT=topRadius/(bottom-y),bottomSideT=bottomRadius/(bottom-y);
 const topInset=2*capCurve*topT*(1-topT),bottomInset=capCurve/2*bottomT*(1-bottomT);
 const rightSideTop=right+(rightBottom-right)*topSideT,leftSideTop=left+(leftBottom-left)*topSideT;
 const rightSideBottom=rightBottom+(right-rightBottom)*bottomSideT,leftSideBottom=leftBottom+(left-leftBottom)*bottomSideT;
 return `M ${left+topRadius} ${y+topInset} Q ${center} ${y+capCurve-topInset} ${right-topRadius} ${y+topInset} Q ${right} ${y} ${rightSideTop} ${y+topRadius} L ${rightSideBottom} ${bottom-bottomRadius} Q ${rightBottom} ${bottom} ${rightBottom-bottomRadius} ${bottom+bottomInset} Q ${center} ${bottom+capCurve/4-bottomInset} ${leftBottom+bottomRadius} ${bottom+bottomInset} Q ${leftBottom} ${bottom} ${leftSideBottom} ${bottom-bottomRadius} L ${leftSideTop} ${y+topRadius} Q ${left} ${y} ${left+topRadius} ${y+topInset} Z`;
}
export function renderFunnel(data,{variant='continuous',texture='mixed',density=7,strokeWidth=.5,color=INK,labels=true,curve=.5,idPrefix='atlas',chartHeight=235,edgeFade=0,stageHeight=310,stageGap=9,capCurve=12,borderRadius=0,tailRatio=.65,nodeGap=66,nodeWidth=2.5,patternAngle=-45,dotGain=.03,roughness=.15,paperGrain=false,seed=1234,fontSize=14,guides=true,stippleScale=2}={}) {
 if(!['continuous','vertical','branching'].includes(variant))throw new Error('Unknown funnel variant.');validateData(data,variant);
 const graph=variant==='branching'?layoutGraph(data,{nodeGap,nodeWidth}):null;
 const height=graph?.height??460,width=graph?.width??900;
 const svg=make('svg',{xmlns:NS,viewBox:`0 0 ${width} ${height}`,width:'100%',role:'group','aria-label':`${variant} conversion funnel`});
 if(width>900)svg.style.minWidth=`${width}px`;
 color=INK;strokeWidth*=4/3;
 svg.append(screenDefs({idPrefix,density,patternAngle,dotGain,roughness,seed,screenWidth:width,screenHeight:height,stippleScale}));
 if(variant==='continuous'&&edgeFade>0){const defs=make('defs');for(const side of ['left','right','both']){const gradient=make('linearGradient',{id:`${idPrefix}-fade-gradient-${side}`,x1:'0%',y1:'0%',x2:'100%',y2:'0%'});for(const[offset,alpha]of edgeFadeStops(edgeFade,side))gradient.append(make('stop',{offset:`${offset*100}%`,'stop-color':'white','stop-opacity':alpha}));const mask=make('mask',{id:`${idPrefix}-fade-${side}`,maskUnits:'objectBoundingBox',maskContentUnits:'objectBoundingBox',x:0,y:0,width:1,height:1,'mask-type':'alpha'});mask.append(make('rect',{x:0,y:0,width:1,height:1,fill:`url(#${idPrefix}-fade-gradient-${side})`}));defs.append(gradient,mask);}svg.append(defs);}
 svg.append(make('rect',{width,height,fill:paperGrain?`url(#${idPrefix}-grain)`:PAPER}));
 const order=screenOrder(texture);
 const fillTypes=[];
 const chooseScreen=(i,neighbors=[])=>{const used=new Set(neighbors.map(key=>fillTypes[key]));let type=order[i%order.length];for(let j=0;j<order.length;j++){const candidate=order[(i+j)%order.length];if(!used.has(candidate)){type=candidate;break;}}fillTypes[i]=type;return `url(#${idPrefix}-${type})`;};
 const text=(x,y,t,size=13,extra={})=>make('text',{x,y,fill:color,'font-family':'Arial, Helvetica, sans-serif','font-size':size,...extra},t);
 const interactive=(path,key,info)=>{path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',`${info.label}, ${fmt(info.value)}, ${pct(info.value,info.denominator)} conversion`);path.setAttribute('data-key',key);path.setAttribute('data-base-fill',path.getAttribute('fill'));if(roughness>0)path.setAttribute('filter',`url(#${idPrefix}-edge)`);path.atlasInfo={...info,key};path.append(make('title',{},path.getAttribute('aria-label')));svg.append(path);};
 if(variant==='branching'){
  const g=graph; const depth=g.depth;for(let i=0;i<=depth;i++){svg.append(text(50+i*g.columnStep,30,`0${i+1} / ${i===0?'ENTRY':i===depth?'OUTCOME':'BRANCH'}`,11,{'text-anchor':i===depth?'end':'start'}));svg.append(make('line',{x1:50+i*g.columnStep,y1:48,x2:50+i*g.columnStep,y2:height-3,stroke:color,'stroke-dasharray':'2 5'}));}
  g.links.forEach((l,i)=>{const x=l.sourceNode.x+nodeWidth,xx=l.targetNode.x;const c=(xx-x)*curve;const d=`M ${x} ${l.sy} C ${x+c} ${l.sy} ${xx-c} ${l.ty} ${xx} ${l.ty} L ${xx} ${l.ty+l.width} C ${xx-c} ${l.ty+l.width} ${x+c} ${l.sy+l.width} ${x} ${l.sy+l.width} Z`;interactive(make('path',{d,fill:chooseScreen(i,g.links.slice(0,i).map((prev,j)=>prev.source===l.source||prev.target===l.target||prev.target===l.source||prev.source===l.target?j:-1).filter(j=>j>=0)),stroke:color,'stroke-width':strokeWidth}),l.id,{label:`${l.sourceNode.label} → ${l.targetNode.label}`,value:l.value,denominator:l.sourceNode.value,total:g.total,source:l.source,target:l.target,kind:'link'});});
  g.nodes.forEach(n=>{svg.append(make('rect',{x:n.x,y:n.y,width:nodeWidth,height:n.height,fill:`url(#${idPrefix}-solid)`,stroke:color,'stroke-width':.35}));if(labels){svg.append(text(n.x,n.y-25,n.label,fontSize,{'text-anchor':n.level===depth?'end':'start'}));svg.append(text(n.x,n.y-7,fmt(n.value),fontSize-2,{'text-anchor':n.level===depth?'end':'start'}));}});svg.atlasLayout=g;
 }else{
  const max=data[0].value||1;
  if(variant==='continuous'){
   const step=790/(data.length-1);const base=365;if(guides){for(const ratio of [0,.25,.5,.75,1]){const y=base-chartHeight*ratio;svg.append(make('line',{x1:38,y1:y,x2:46,y2:y,stroke:color,'stroke-width':.4}),text(31,y+3,`${Math.round(ratio*100)}`,10,{'text-anchor':'end'}));}svg.append(text(31,base-chartHeight-13,'%',10,{'text-anchor':'end'}));}data.forEach((s,i)=>{const x=50+i*step,h=s.value/max*chartHeight;svg.append(make('line',{x1:x,y1:96,x2:x,y2:386,stroke:color,'stroke-dasharray':'2 5'}));if(labels){svg.append(text(x,59,s.label,fontSize,{'text-anchor':i===data.length-1?'end':'start'}));svg.append(text(x,81,fmt(s.value),fontSize-2,{'text-anchor':i===data.length-1?'end':'start'}));}if(i<data.length-1){const next=data[i+1],h2=next.value/max*chartHeight;const xx=x+step,c=step*curve;const d=`M ${x} ${base-h} C ${x+c} ${base-h} ${xx-c} ${base-h2} ${xx} ${base-h2} L ${xx} ${base} L ${x} ${base} Z`;const fadeSide=i===0&&i===data.length-2?'both':i===0?'left':i===data.length-2?'right':null;interactive(make('path',{d,fill:chooseScreen(i),stroke:color,'stroke-width':strokeWidth,...(edgeFade>0&&fadeSide?{mask:`url(#${idPrefix}-fade-${fadeSide})`}:{})}),s.id,{label:`${s.label} → ${next.label}`,value:next.value,denominator:s.value,total:max,kind:'stage'});}svg.append(text(x,417,`${String(i+1).padStart(2,'0')} / ${pct(s.value,max)}`,12,{'text-anchor':i===data.length-1?'end':'start'}));});if(!edgeFade)svg.append(make('line',{x1:50,y1:365,x2:840,y2:365,stroke:color,'stroke-width':strokeWidth}));
  }else{
   const height=stageHeight/data.length,center=390,{widths,radii}=verticalRimGeometry(data,{stageHeight,stageGap,tailRatio,borderRadius});data.forEach((s,i)=>{const y=70+i*height,w=widths[i],w2=widths[i+1],gap=stageGap;const d=verticalStagePath(center,y,height,w,w2,gap,capCurve,radii[i],radii[i+1]);interactive(make('path',{d,fill:chooseScreen(i),stroke:color,'stroke-width':strokeWidth}),s.id,{label:s.label,value:s.value,denominator:data[i-1]?.value??max,total:max,kind:'stage'});if(labels){svg.append(text(52,y+height/2,`${String(i+1).padStart(2,'0')}`,12));svg.append(make('line',{x1:center+w/2+12,y1:y+height/2,x2:655,y2:y+height/2,stroke:color,'stroke-width':.5,'stroke-dasharray':'2 3'}));svg.append(text(670,y+height/2-4,s.label,fontSize));svg.append(text(670,y+height/2+15,`${fmt(s.value)} · ${pct(s.value,max)}`,fontSize-2));}});
  }
 }
 if(!guides)svg.querySelectorAll('line[stroke-dasharray="2 5"]').forEach(line=>line.remove());
 return svg;
}
