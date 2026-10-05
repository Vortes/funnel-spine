import {containerGeometry} from './containers.js';
import {element,INK} from '../screens.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mod=(value,period)=>(value%period+period)%period;
const blend=(a,b,t)=>a+(b-a)*smooth(t);
export function particleFrame(study,p,age){
  const {size,tension,absorption}=study.particles,t=clamp(age/p.duration),progress=t*t;
  const neck=1-smooth(t/.06),stretch=Math.min(tension,p.sourceHeight*.08,3*size);
  const hit=Math.sqrt(Math.max(0,(p.dy-2*size)/p.dy));
  const contact=t>=hit?smooth((t-hit)/Math.max(.001,1-hit)):0;
  return {x:p.dx*progress,y:p.dy*progress,sx:1-.12*(tension?neck:0)+absorption*.6*Math.sin(Math.PI*contact),sy:1+stretch/(2*size)*neck-absorption*.7*contact,opacity:1-contact};
}
function sourceResponse(study,shape,p,age){
  const tension=Math.min(study.particles.tension,shape.height*.08),recoil=Math.min(study.particles.recoil,shape.height*.06);
  const hold=Math.min(100,p.duration*.25),settle=Math.min(200,p.duration*.4);
  if(age>p.duration-hold)return tension*smooth((age-p.duration+hold)/hold);
  const t=age/settle;
  if(t<.35)return blend(tension,-recoil,t/.35);
  if(t<.7)return blend(-recoil,recoil*.18,(t-.35)/.35);
  if(t<1)return blend(recoil*.18,0,(t-.7)/.3);
  return 0;
}
const hitTime=(p,size)=>p.duration*Math.sqrt(Math.max(0,(p.dy-2*size)/p.dy));
const representative=gap=>gap?.points[Math.floor(gap.points.length/2)];
function reception(study,p,age){const duration=Math.min(180,p.duration*.45);return age<duration?study.particles.absorption*Math.sin(Math.PI*age/duration)**2:0;}
export function containerFrame(study,gaps,index,time){
  const shape=containerGeometry(study,index),outgoing=representative(gaps[index]),incoming=representative(gaps[index-1]);
  const displacement=outgoing?sourceResponse(study,shape,outgoing,mod(time+outgoing.phase*outgoing.duration,outgoing.duration)):0;
  const compression=incoming?reception(study,incoming,mod(time+incoming.phase*incoming.duration-hitTime(incoming,study.particles.size),incoming.duration)):0;
  return {shift:compression,scale:(1+displacement/Math.max(1,shape.height))*(1-compression/Math.max(1,shape.height))};
}
function framesAt(times,period,sample){
  const sorted=[...new Set([0,period,...times.map(t=>mod(t,period))])].sort((a,b)=>a-b);
  return sorted.map(time=>({offset:time/period,...sample(time===period?0:time)}));
}
const sampling=period=>Array.from({length:Math.ceil(period/12)},(_,i)=>i*12);
export function animateTransfer(svg,study,gaps){
  const animations=[],dots=[...svg.querySelectorAll('.falling-particle')],start=document.timeline.currentTime;
  let reduced=false,paused=false;
  const animate=(node,frames,p)=>{const animation=node.animate(frames,{duration:p.duration,iterations:Infinity,easing:'linear'});animation.startTime=start-p.phase*p.duration;animations.push(animation);};
  for(const dot of dots){
    const p=dot.transferPoint,hit=hitTime(p,study.particles.size);
    const times=[...sampling(p.duration),p.duration*.06,hit,hit+(p.duration-hit)*.5];
    animate(dot,framesAt(times,p.duration,time=>{const f=particleFrame(study,p,time);return {transform:`translate(${f.x}px,${f.y}px) scale(${f.sx},${f.sy})`,opacity:f.opacity};}),p);
    if(study.particles.absorption){
      const mark=element('ellipse',{cx:p.x+p.dx,cy:p.y+p.dy-study.particles.size*2,rx:study.particles.size,ry:study.particles.size*.35,fill:INK,class:'absorption-mark',opacity:0});
      mark.style.transformOrigin=`${p.x+p.dx}px ${p.y+p.dy-study.particles.size*2}px`;mark.style.transformBox='view-box';dot.parentNode.append(mark);
      const duration=Math.min(180,p.duration*.45);
      animate(mark,framesAt([...sampling(p.duration),hit,hit+duration*.15,hit+duration],p.duration,time=>{
        const age=mod(time-hit,p.duration),t=clamp(age/duration),strength=study.particles.absorption;
        const opacity=age<duration?strength*(t<.15?smooth(t/.15):1-smooth((t-.15)/.85)):0;
        return {transform:`translateY(${strength*smooth(t)}px) scale(${.95+strength*.8*smooth(t)},${1-strength*.65*smooth(t)})`,opacity};
      }),p);
    }
  }
  svg.querySelectorAll('.transfer-container').forEach((path,index)=>{
    const shape=containerGeometry(study,index),outgoing=representative(gaps[index]),incoming=representative(gaps[index-1]);
    if(outgoing)animate(path,framesAt(sampling(outgoing.duration),outgoing.duration,time=>({transform:`scaleY(${1+sourceResponse(study,shape,outgoing,time)/Math.max(1,shape.height)})`})),outgoing);
    let wrapper=path.parentNode;
    if(!wrapper.classList.contains('receiving-container')){wrapper=element('g',{class:'receiving-container'});path.parentNode.insertBefore(wrapper,path);wrapper.append(path);wrapper.style.transformOrigin=`390px ${shape.y}px`;wrapper.style.transformBox='view-box';}
    if(incoming){const hit=hitTime(incoming,study.particles.size);animate(wrapper,framesAt([...sampling(incoming.duration),hit],incoming.duration,time=>{
      const compression=reception(study,incoming,mod(time-hit,incoming.duration));return {transform:`translateY(${compression}px) scaleY(${1-compression/Math.max(1,shape.height)})`};
    }),incoming);}
  });
  function update(){
    if(reduced){animations.forEach(animation=>animation.cancel());for(const dot of dots){const p=dot.transferPoint;dot.style.transform=`translate(${p.dx*.5}px,${p.dy*.5}px)`;dot.style.opacity=1;}}
    else{for(const dot of dots){dot.style.transform='';dot.style.opacity='';}for(const animation of animations){if(paused)animation.pause();else animation.play();}}
  }
  return {setPaused(value){if(value!==paused){paused=value;update();}},setReducedMotion(value){if(value!==reduced){reduced=value;update();}},dispose(){animations.forEach(animation=>animation.cancel());}};
}
