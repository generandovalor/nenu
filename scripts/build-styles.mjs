import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../dist');
// Preserve descendant whitespace before pseudo-classes such as :is() as well as SVG strings and calc() spacing.
function compact(css){let output='',quote='',comment=false;for(let i=0;i<css.length;i++){let c=css[i],n=css[i+1];if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}if(quote){output+=c;if(c==='\\'&&n){output+=n;i++;}else if(c===quote)quote='';continue;}if(c==='/'&&n==='*'){comment=true;i++;continue;}if(c==='"'||c==="'"){quote=c;output+=c;continue;}if(/\s/.test(c)){if(output&&!output.endsWith(' '))output+=' ';continue;}if('{};,'.includes(c)){output=output.trimEnd();output+=c;while(/\s/.test(css[i+1]||'')&&i+1<css.length)i++;}else output+=c;}return output.trim();}
const inputs=['icons/css/nenu-icons.css','app.css','base.css','design.css','theme.css','performance.css'];
const output='/*! Nenu styles. Font Awesome Free 6.5.2; Copyright 2024 Fonticons, Inc. Icons CC BY 4.0, Fonts SIL OFL 1.1, Code MIT. https://fontawesome.com/license/free */\n'+inputs.map(file=>compact(fs.readFileSync(path.join(root,file),'utf8'))).join('\n');
fs.writeFileSync(path.join(root,'styles.css'),output);console.log('Combined styles:',Buffer.byteLength(output),'bytes');
