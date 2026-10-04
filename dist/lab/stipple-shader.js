const DEFAULT_SCALE=2;
const imageCache=new Map();
let renderer;

const vertexSource=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 size;
uniform float scale;
uniform float baseRadius;
uniform float gain;
uniform uint seed;
out float pointRadius;
out float pointSize;

uint randomBits(uint state) {
  uint t=state;
  t=(t^(t>>15u))*(t|1u);
  t^=t+(t^(t>>7u))*(t|61u);
  return t^(t>>14u);
}

float randomAt(uint index) {
  return float(randomBits(seed+(index+1u)*0x6D2B79F5u))/4294967296.0;
}

void main() {
  uint index=uint(gl_VertexID)*3u;
  vec2 position=floor(vec2(randomAt(index),randomAt(index+1u))*size*100.0+0.5)/100.0;
  float group=floor(randomAt(index+2u)*6.0);
  pointRadius=baseRadius*(0.8+group*0.08)*(1.0+gain)*scale;
  pointSize=ceil(pointRadius*2.0+2.0);
  gl_Position=vec4(position.x/size.x*2.0-1.0,1.0-position.y/size.y*2.0,0.0,1.0);
  gl_PointSize=pointSize;
}`;

const fragmentSource=`#version 300 es
precision mediump float;
uniform vec3 ink;
in float pointRadius;
in float pointSize;
out vec4 color;
void main() {
  vec2 offset=(gl_PointCoord-0.5)*pointSize;
  float area=3.14159265*pointRadius*pointRadius;
  float small=area*max(0.0,1.0-abs(offset.x))*max(0.0,1.0-abs(offset.y));
  float hard=step(length(offset),pointRadius);
  float coverage=mix(small,hard,smoothstep(0.35,0.75,pointRadius));
  if(coverage<=0.0) discard;
  color=vec4(ink,coverage);
}`;

function shader(gl,type,source){
 const result=gl.createShader(type);
 gl.shaderSource(result,source);
 gl.compileShader(result);
 if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(result));
 return result;
}

function createRenderer(){
 const canvas=document.createElement('canvas');
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
 if(!gl)return null;
 canvas.addEventListener('webglcontextrestored',()=>{renderer=undefined;imageCache.clear();});
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertexSource));
 gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragmentSource));
 gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);
 const uniforms=Object.fromEntries(['size','scale','baseRadius','gain','seed'].map(name=>[name,gl.getUniformLocation(program,name)]));
 gl.uniform3f(gl.getUniformLocation(program,'ink'),47/255,79/255,224/255);
 gl.clearColor(228/255,229/255,232/255,1);
 gl.enable(gl.BLEND);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 return {canvas,gl,uniforms};
}

export function stippleImage({type,width,height,density=6,dotGain=.03,seed=1234,scale=DEFAULT_SCALE}={}){
 if(typeof document==='undefined')return null;
 if(renderer===undefined){try{renderer=createRenderer();}catch{renderer=null;}}
 if(!renderer)return null;
 const {canvas,gl,uniforms}=renderer;
 if(gl.isContextLost())return null;
 const pitch=Math.max(3,Math.min(14,density)),gain=Math.max(-.8,Math.min(.2,dotGain));
 const baseRadius=(type==='sparse'?.42:.62)*(pitch/6),coverage=type==='sparse'?.025:.28;
 const count=Math.round(width*height*coverage/(Math.PI*baseRadius*baseRadius));
 const key=[type,width,height,pitch,gain,seed,scale].join('/');
 if(imageCache.has(key))return imageCache.get(key);
 const pixelsWide=Math.round(width*scale),pixelsHigh=Math.round(height*scale);
 if(pixelsWide>gl.getParameter(gl.MAX_TEXTURE_SIZE)||pixelsHigh>gl.getParameter(gl.MAX_TEXTURE_SIZE))return null;
 canvas.width=pixelsWide;canvas.height=pixelsHigh;
 gl.viewport(0,0,pixelsWide,pixelsHigh);
 gl.clear(gl.COLOR_BUFFER_BIT);
 gl.uniform2f(uniforms.size,width,height);
 gl.uniform1f(uniforms.scale,scale);
 gl.uniform1f(uniforms.baseRadius,baseRadius);
 gl.uniform1f(uniforms.gain,gain);
 gl.uniform1ui(uniforms.seed,(seed+(type==='dense'?104729:0))>>>0);
 gl.drawArrays(gl.POINTS,0,count);
 const image={url:canvas.toDataURL('image/png'),count};
 if(imageCache.size>=8)imageCache.delete(imageCache.keys().next().value);
 imageCache.set(key,image);
 return image;
}

export function clearStippleShaderCache(){imageCache.clear();}
