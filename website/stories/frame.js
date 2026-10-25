export function frame(name, { width = '100%', height = 900 } = {}) {
 const container=document.createElement('div');
 container.style.cssText='background:#e9e8e3;padding:16px;min-height:100vh;box-sizing:border-box';
 const iframe=document.createElement('iframe');
 // Relative to the deployed Storybook directory; works on project GitHub Pages.
 iframe.src=new URL(`../design-system/${name}.html`,window.location.href).href;
 iframe.title=`Sensum ${name.replaceAll('-',' ')} preview`;
 iframe.style.cssText=`display:block;border:0;margin:auto;background:#f7f6f3;width:${width};max-width:100%;height:${height}px`;
 container.append(iframe);return container;
}
export const controls={width:{control:'select',options:['100%','1440px','1069px','768px','390px','320px']},height:{control:{type:'range',min:400,max:1400,step:100}}};
