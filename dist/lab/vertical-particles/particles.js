import {element,INK} from '../screens.js';
import {verticalStageLayout} from '../vertical-layout.js';

export function particleGaps(study){
  const {data,options,seed}=study.funnel,{size,count,duration,drift,edgeAngle=0}=study.particles;
  const stages=verticalStageLayout(data,options.stageHeight,options.stageGap),center=390,max=data[0].value||1;
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  return data.slice(1).map((next,i)=>{
    const width=460*next.value/max,bottom=stages[i+1].y,top=bottom-options.stageGap;
    const amount=width>size*2?Math.max(1,Math.round(count*width/460)):0;
    const edge=(x,curve)=>curve*(1-((x-center)/(width/2))**2);
    const points=Array.from({length:amount},(_,j)=>{
      const available=width/2-size,x=center-available+2*available*(j+.2+.6*random())/amount;
      const noise=(random()*2-1)*drift;
      const y=top+edge(x,options.capCurve/8)-size;
      const weight=Math.max(0,(Math.abs((x-center)/available)-.5)/.5)**2;
      const slope=-Math.sign(x-center)*Math.tan(edgeAngle*Math.PI/180)*weight;
      let dx=Math.max(center-available-x,Math.min(center+available-x,noise));
      if(weight&&edgeAngle){
        const low=Math.max(center-available-x,Math.min(0,center-x)),high=Math.min(center+available-x,Math.max(0,center-x));
        let a=low,b=high;
        for(let step=0;step<32;step++){
          const middle=(a+b)/2,travel=bottom+edge(x+middle,options.capCurve/2)+size-y;
          if(middle-slope*travel-noise>0)b=middle;else a=middle;
        }
        dx=(a+b)/2;
      }
      return {x,y,dx,dy:bottom+edge(x+dx,options.capCurve/2)+size-y,duration:duration*(.9+.2*random()),phase:random()};
    });
    const d=`M ${center-width/2} ${top} Q ${center} ${top+options.capCurve/4} ${center+width/2} ${top} L ${center+width/2} ${bottom} Q ${center} ${bottom+options.capCurve} ${center-width/2} ${bottom} Z`;
    return {index:i,width,top,bottom,d,points};
  });
}
export function addParticles(svg,study){
  svg.querySelector('[data-particle-layer]')?.remove();
  const layer=element('g',{'data-particle-layer':'', 'aria-hidden':'true','pointer-events':'none'});
  const defs=element('defs');layer.append(defs);
  for(const gap of particleGaps(study)){
    const id=`particle-gap-${gap.index}`,clip=element('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
    clip.append(element('path',{d:gap.d}));defs.append(clip);
    const group=element('g',{'clip-path':`url(#${id})`,'data-gap':gap.index});
    for(const p of gap.points){
      const dot=element('circle',{cx:p.x,cy:p.y,r:study.particles.size,fill:INK,class:'falling-particle'});
      dot.style.cssText=`--dx:${p.dx}px;--dy:${p.dy}px;--still-x:${p.dx*.5}px;--still-y:${p.dy*.5}px;animation-duration:${p.duration}ms;animation-delay:${-p.phase*p.duration}ms`;
      group.append(dot);
    }
    layer.append(group);
  }
  svg.append(layer);
}
