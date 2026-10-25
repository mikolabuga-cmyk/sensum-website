import {frame,controls} from './frame';
export default {title:'Foundations',args:{width:'100%',height:1000},argTypes:controls};
const chapter=id=>({render:args=>{const el=frame('guide',args);el.querySelector('iframe').src+='#'+id;return el;}});
export const Colors=chapter('colors');
export const Typography=chapter('typography');
export const SpacingAndShape=chapter('spacing');
export const Motion=chapter('motion');
export const VisualEffects=chapter('effects');
export const ReviewProcess=chapter('review');
