import {clearVectorStippleCache,element,screenDefs} from './screens.js';
import {clearStippleShaderCache} from './stipple-shader.js';

const width=900,height=460;
const $=selector=>document.querySelector(selector);
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
const ms=value=>`${value.toFixed(1)} ms`;

async function trial(renderer,settings,container,id){
 const svg=element('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:`0 0 ${width} ${height}`});
 const start=performance.now();
 svg.append(screenDefs({...settings,screenWidth:width,screenHeight:height,idPrefix:id,onlyType:settings.type,stippleRenderer:renderer}));
 svg.append(element('rect',{width,height,fill:`url(#${id}-${settings.type})`}));
 const build=performance.now()-start;
 const insertStart=performance.now();
 container.replaceChildren(svg);
 await frame();
 const firstFrame=build+performance.now()-insertStart;
 const pattern=svg.querySelector('pattern');
 return {build,firstFrame,bytes:new Blob([new XMLSerializer().serializeToString(svg)]).size,dots:Number(pattern.dataset.dotCount),actual:pattern.dataset.stippleRenderer};
}

async function run(event){
 event.preventDefault();
 const button=$('#run');button.disabled=true;$('#status').textContent='Measuring three cold seeds and one warm reuse per renderer…';
 try{
  const settings={type:$('#type').value,density:Number($('#density').value),stippleScale:Number($('#scale').value),dotGain:Number($('#gain').value),seed:Number($('#seed').value)};
  if(!Number.isInteger(settings.density)||settings.density<3||settings.density>14||!Number.isFinite(settings.dotGain)||settings.dotGain<-.8||settings.dotGain>.2||!Number.isInteger(settings.seed)||settings.seed<0||settings.seed>4294967295)throw new Error('Choose a valid pitch, gain, and seed.');
  clearStippleShaderCache();
  clearVectorStippleCache();
  const results={vector:[],shader:[]};
  for(let i=0;i<3;i++)for(const renderer of i%2?['shader','vector']:['vector','shader']){
   const seed=(settings.seed+i)>>>0;
   results[renderer].push(await trial(renderer,{...settings,seed},$('#'+renderer),`${renderer}-${i}`));
   $('#status').textContent=`Measured ${i+1} of 3 cold seeds…`;
  }
  const warm={};
  for(const renderer of ['vector','shader'])warm[renderer]=await trial(renderer,settings,$('#'+renderer),`${renderer}-warm`);
  const rows=$('#rows');rows.replaceChildren();
  for(const renderer of ['vector','shader']){
   const cold=results[renderer],last=warm[renderer],row=document.createElement('tr');
   for(const value of [renderer==='vector'?'Original vector':`WebGL shader${last.actual==='shader'?'':' (fallback)'}`,ms(median(cold.map(x=>x.build))),ms(median(cold.map(x=>x.firstFrame))),ms(last.build),ms(last.firstFrame),`${(last.bytes/1024/1024).toFixed(2)} MiB`,last.dots.toLocaleString('en-US')]){
    const cell=document.createElement(row.children.length?'td':'th');cell.textContent=value;row.append(cell);
   }
   rows.append(row);
  }
  const vectorMs=median(results.vector.map(x=>x.firstFrame)),shaderMs=median(results.shader.map(x=>x.firstFrame));
  $('#status').textContent=`Cold first frame: ${ (vectorMs/shaderMs).toFixed(1)}× ${shaderMs<=vectorMs?'faster':'slower'} with the shader. Timings vary by device and browser.`;
 }catch(error){$('#status').textContent=error.message;}finally{button.disabled=false;}
}

$('#settings').addEventListener('submit',run);
