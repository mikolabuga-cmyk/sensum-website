import {frame,controls} from './frame';
export default {title:'Sections',args:{width:'100%',height:900},argTypes:controls};
export const Hero={render:args=>frame('previews/hero',args)};
export const PointOfView={render:args=>frame('previews/point-of-view',args)};
export const ProductClarity={render:args=>frame('previews/product-clarity',args)};
export const SelectedWork={render:args=>frame('previews/selected-work',args)};
export const Services={render:args=>frame('previews/services',args)};
export const TeamIntroduction={render:args=>frame('previews/team-introduction',args)};
export const Team={render:args=>frame('previews/team',args)};
