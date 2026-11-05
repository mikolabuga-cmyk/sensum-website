import {frame,controls} from './frame';
export default {title:'Sections',args:{width:'100%',height:900},argTypes:controls};
export const Hero={render:args=>frame('previews/hero',args)};
export const HeroV2={name:'Hero v2',render:args=>frame('previews/hero-v2',args)};
export const PointOfView={render:args=>frame('previews/point-of-view',args)};
export const ProductClarity={render:args=>frame('previews/product-clarity',args)};
export const SelectedWork={render:args=>frame('previews/selected-work',args)};
export const Services={render:args=>frame('previews/services',args)};
export const TeamIntroduction={render:args=>frame('previews/team-introduction',args)};
export const Team={render:args=>frame('previews/team',args)};

export const HowWeWork={render:args=>frame('previews/how-we-work',args)};

export const HeroV3={name:'Hero v3',render:args=>frame('previews/hero-v3',args)};

export const HeroV4={name:'Hero v4',render:args=>frame('previews/hero-v4',args)};

export const SiteLoader={name:'Site loader',render:args=>frame('previews/site-loader',args)};

export const SelectedWorkV2={name:'Selected work v2',render:args=>frame('previews/selected-work-v2',args)};

export const WhyWorkWithUs={render:args=>frame('previews/why-work',args)};

export const WhyUs={render:args=>frame('previews/why-us',args)};
