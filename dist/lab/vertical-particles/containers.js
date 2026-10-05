const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const quad=(a,b,c,t)=>lerp(lerp(a,b,t),lerp(b,c,t),t);
const point=p=>`${p.x} ${p.y}`;
function trimmed(a,b,c,start,end){const p=quad(a,b,c,start),q=quad(a,b,c,end),t=end-start;return {p,q,control:{x:p.x+t*((1-start)*(b.x-a.x)+start*(c.x-b.x)),y:p.y+t*((1-start)*(b.y-a.y)+start*(c.y-b.y))}};}
function intersection(a,u,b,v,fallback){const cross=u.x*v.y-u.y*v.x;if(Math.abs(cross)<1e-8)return fallback;const t=((b.x-a.x)*v.y-(b.y-a.y)*v.x)/cross;return {x:a.x+t*u.x,y:a.y+t*u.y};}
const tangent=(a,b,c,t)=>({x:(1-t)*(b.x-a.x)+t*(c.x-b.x),y:(1-t)*(b.y-a.y)+t*(c.y-b.y)});
export function containerGeometry(study,index){
  const {data,options}=study.funnel,center=390,height=options.stageHeight/data.length,y=70+index*height,max=data[0].value||1;
  const width=460*data[index].value/max,lowerWidth=460*(data[index+1]?.value??data[index].value*options.tailRatio)/max,bottom=y+height-options.stageGap;
  const a={x:center-width/2,y},b={x:center+width/2,y},c={x:center+lowerWidth/2,y:bottom},d={x:center-lowerWidth/2,y:bottom};
  const topControl={x:center,y:y+options.capCurve},bottomControl={x:center,y:bottom+options.capCurve/4};
  const radius=Math.min(options.cornerRadius??0,(bottom-y)*.25,Math.min(width,lowerWidth)*.2);
  const side=Math.hypot(c.x-b.x,c.y-b.y),u=width?radius/width:0,v=lowerWidth?radius/lowerWidth:0,s=side?radius/side:0;
  const top=trimmed(a,topControl,b,u,1-u),base=trimmed(c,bottomControl,d,v,1-v);
  const rightStart=lerp(b,c,s),rightEnd=lerp(b,c,1-s),leftStart=lerp(d,a,s),leftEnd=lerp(d,a,1-s);
  const rightVector={x:c.x-b.x,y:c.y-b.y},leftVector={x:a.x-d.x,y:a.y-d.y};
  const tr=intersection(top.q,tangent(a,topControl,b,1-u),rightStart,rightVector,b);
  const br=intersection(rightEnd,rightVector,base.p,tangent(c,bottomControl,d,v),c);
  const bl=intersection(base.q,tangent(c,bottomControl,d,1-v),leftStart,leftVector,d);
  const tl=intersection(leftEnd,leftVector,top.p,tangent(a,topControl,b,u),a);
  const path=`M ${point(top.p)} Q ${point(top.control)} ${point(top.q)} Q ${point(tr)} ${point(rightStart)} L ${point(rightEnd)} Q ${point(br)} ${point(base.p)} Q ${point(base.control)} ${point(base.q)} Q ${point(bl)} ${point(leftStart)} L ${point(leftEnd)} Q ${point(tl)} ${point(top.p)} Z`;
  return {path,y,bottom,height:bottom-y,width,lowerWidth,radius,topLeft:top.p.x,topRight:top.q.x,bottomLeft:base.q.x,bottomRight:base.p.x};
}
export function roundContainers(svg,study){
  svg.querySelectorAll('[data-key]').forEach((path,index)=>{const shape=containerGeometry(study,index);path.setAttribute('d',shape.path);path.classList.add('transfer-container');path.style.transformOrigin=`390px ${shape.y}px`;path.style.transformBox='view-box';});
}
