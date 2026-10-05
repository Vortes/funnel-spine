import {renderFunnel} from '../lab-engine.js';
import {createStudy,parseStudy} from './study-config.js';
import {addParticles,particleGaps} from './particles.js';
import {roundContainers} from './containers.js';
import {animateTransfer} from './motion.js';

const $=selector=>document.querySelector(selector),preview=$('#preview');
let study=createStudy(),svg,motion,paused=false,offscreen=false,edited=false;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
function status(text,error=false){$('#status').textContent=text;$('#status').dataset.error=String(error);}
function playback(){motion?.setReducedMotion(reduce.matches);motion?.setPaused(paused||offscreen||document.hidden||reduce.matches);preview.dataset.paused=String(paused||offscreen||document.hidden||reduce.matches);$('#pause').disabled=reduce.matches;$('#pause').textContent=paused?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(paused));$('#motion-note').textContent=reduce.matches?'Reduced motion is on. Particles are shown as still dots.':'Condense, release, absorb. Pause freezes the whole transfer cycle.';}
function render(rebuild=true){
  motion?.dispose();
  if(rebuild){svg=renderFunnel(study.funnel.data,{...study.funnel.options,variant:'vertical',seed:study.funnel.seed,idPrefix:'particle-study'});svg.querySelectorAll('[data-key]').forEach(path=>{path.removeAttribute('tabindex');path.removeAttribute('role');});svg.setAttribute('viewBox',study.funnel.options.labels?'0 50 900 380':'130 50 520 380');roundContainers(svg,study);preview.replaceChildren(svg);}
  const gaps=addParticles(svg,study);motion=animateTransfer(svg,study,gaps);playback();
  const amount=particleGaps(study).reduce((sum,gap)=>sum+gap.points.length,0);$('#summary').textContent=`${amount} dots · ${study.particles.duration} ms`;
}
function controls(){
  const groups=[['particle-controls',[
    ['size','Dot radius',.5,2.5,.1,v=>`${v.toFixed(1)} px`],
    ['count','Particle count',6,124,1,v=>`${v} max`],
    ['duration','Fall time',160,1200,20,v=>`${v} ms`],
    ['drift','Sideways drift',0,8,.5,v=>`${v.toFixed(1)} px`],
    ['edgeAngle','Edge angle',0,70,1,v=>`${v}° inward`]
  ],study.particles],['surface-controls',[
    ['absorption','Absorption',0,1,.05,v=>`${Math.round(v*100)}%`],
    ['tension','Release tension',0,4,.1,v=>`${v.toFixed(1)} px`],
    ['recoil','Container recoil',0,3,.1,v=>`${v.toFixed(1)} px`]
  ],study.particles],['container-controls',[
    ['stageGap','Container gap',6,20,1,v=>`${v} px`],
    ['capCurve','Rim curvature',0,20,1,v=>`${v} px`],
    ['cornerRadius','Border radius',0,18,1,v=>`${v} px`]
  ],study.funnel.options]];
  for(const [id,rows,values]of groups){
    const holder=$('#'+id);holder.replaceChildren();
    for(const [key,label,min,max,step,format]of rows){
      const div=document.createElement('div');div.className='control';
      const name=document.createElement('label');name.htmlFor=key;name.textContent=label;
      const output=document.createElement('output');output.htmlFor=key;output.textContent=format(values[key]);name.append(output);
      const input=document.createElement('input');Object.assign(input,{id:key,type:'range',min,max,step,value:values[key]});
      input.addEventListener('input',()=>{edited=true;values[key]=Number(input.value);output.textContent=format(values[key]);render(id==='container-controls');status('Unsaved changes');});
      div.append(name,input);holder.append(div);
    }
  }
  $('#labels').checked=study.funnel.options.labels;
}
$('#labels').addEventListener('change',()=>{edited=true;study.funnel.options.labels=$('#labels').checked;render();status('Unsaved changes');});
$('#pause').addEventListener('click',()=>{paused=!paused;playback();});
$('#reset').addEventListener('click',()=>{edited=true;study=createStudy();controls();render();status('Study reset. Save to keep these settings.');});
$('#save').addEventListener('click',async()=>{
  const button=$('#save'),snapshot=parseStudy(study);button.disabled=true;status('Saving…');
  try{const response=await fetch('/__dev/vertical-particles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Save failed');status(`Saved ${result.path}`);}
  catch(error){status(error.message,true);}finally{button.disabled=false;}
});
$('#export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(parseStudy(study),null,2)+'\n'],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='atlas-vertical-particles.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import').addEventListener('click',()=>$('#file').click());
$('#file').addEventListener('change',async()=>{const file=$('#file').files[0];if(!file)return;try{if(file.size>50000)throw new Error('Choose a JSON smaller than 50 KB.');study=parseStudy(JSON.parse(await file.text()));edited=true;controls();render();status('Imported. Save to keep this configuration in the project.');}catch(error){status(error.message,true);}finally{$('#file').value='';}});
reduce.addEventListener('change',playback);document.addEventListener('visibilitychange',playback);
new IntersectionObserver(([entry])=>{offscreen=!entry.isIntersecting;playback();}).observe(preview);
controls();render();
try{const response=await fetch('/__dev/vertical-particles');if(response.ok){const saved=await response.json();if(saved.config&&!edited){study=parseStudy(saved.config);controls();render();status(`Loaded ${saved.path}`);}}else{status('Saved settings could not be loaded.',true);}}
catch{status('Project saving needs the local development server.',true);}
