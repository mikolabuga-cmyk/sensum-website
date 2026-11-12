import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
addons.setConfig({theme:create({base:'light',brandTitle:'Sensum / Design system',brandUrl:'../design-system/guide.html',colorPrimary:'#1a2530',colorSecondary:'#405d78',appBg:'#faf9f6',appContentBg:'#faf9f6',fontBase:'Arial, sans-serif'})});
