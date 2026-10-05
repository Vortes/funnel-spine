export function verticalStageLayout(data,stageHeight,stageGap){
 const minimum=Math.min(stageGap+12,stageHeight/data.length);
 const flexible=stageHeight-minimum*data.length;
 const total=data.reduce((sum,stage)=>sum+stage.value,0);
 let y=70;
 return data.map((stage,i)=>{
  const height=i===data.length-1?70+stageHeight-y:minimum+flexible*(total?stage.value/total:1/data.length);
  const layout={y,height};
  y+=height;
  return layout;
 });
}
