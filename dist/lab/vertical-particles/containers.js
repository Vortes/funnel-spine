import {verticalContainerGeometry} from '../vertical-geometry.js';

export const containerGeometry=(study,index)=>verticalContainerGeometry(study.funnel.data,study.funnel.options,index);

export function roundContainers(svg,study){
  svg.querySelectorAll('[data-key]').forEach((path,index)=>{const shape=containerGeometry(study,index);path.setAttribute('d',shape.path);path.classList.add('transfer-container');path.style.transformOrigin=`390px ${shape.y}px`;path.style.transformBox='view-box';});
}
