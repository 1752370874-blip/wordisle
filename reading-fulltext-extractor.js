'use strict';
const crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require('./reading-runtime/node_modules/jsdom');
const Catalog=require('./reading-source-catalog');
const MAX_PARAGRAPHS=400,MAX_CHARACTERS=200000;
const compact=s=>String(s||'').replace(/[\u200b\ufeff]/g,'').replace(/\s+/g,' ').trim();
function denied(message,code='unavailable'){const e=Error(message);e.code=code;throw e;}
function extract({html,url,item}){
  const source=Catalog.get(item?.sourceId);if(!source?.fullText)denied('此来源请在原站阅读全文。','external');
  if(typeof html!=='string'||Buffer.byteLength(html)>5*1024*1024)denied('原网页过大，请在原站阅读。','oversize');
  const virtualConsole=new VirtualConsole(),dom=new JSDOM(html,{url,virtualConsole});
  try{const d=dom.window.document;
    const lang=(d.documentElement.lang||'en').toLowerCase();if(lang&&!lang.startsWith('en'))denied('当前原文不是英文页面，请在原站核对。');
    for(const script of d.querySelectorAll('script[type="application/ld+json"]')){try{const json=JSON.parse(script.textContent),queue=Array.isArray(json)?json:[json];while(queue.length){const x=queue.shift();if(!x||typeof x!=='object')continue;if(x.isAccessibleForFree===false||String(x.isAccessibleForFree).toLowerCase()==='false')denied('原文需要订阅，请在原站登录后阅读。','paywall');if(Array.isArray(x['@graph']))queue.push(...x['@graph']);}}catch(e){if(e.code==='paywall')throw e;}}
    if(d.querySelector('[data-paywall="true"],.subscription-required,.paywall--active')||/subscribe to (?:continue|keep) reading|you have reached your (?:free|article) limit|sign in to continue reading/i.test(d.body?.textContent||''))denied('原文需要在原站继续阅读。','paywall');
    const selectors=source.bodySelectors||[],selector=selectors.find(s=>d.querySelector(s));if(!selector)denied('没有确认到完整正文区域，请打开原文核对。','structure');
    const original=d.querySelector(selector),body=original.cloneNode(true);body.querySelectorAll('script,style,noscript,form,button,nav,iframe,svg,.wp-block-nasa-blocks-related-articles,.wp-block-nasa-blocks-topic-cards,.news-article--content--side-column,.social-share,.share-buttons,.related-posts,.newsletter-signup').forEach(e=>e.remove());
    const blocks=[];let buffer='';const flush=(type='paragraph')=>{const text=compact(buffer);buffer='';if(text)blocks.push({type,text});};
    function walk(node){if(node.nodeType===3){buffer+=node.nodeValue;return;}if(node.nodeType!==1)return;const tag=node.tagName.toLowerCase();
      if(tag==='br'){buffer+='\n';return;}if(tag==='table'){flush();const text=[...node.children].flatMap(part=>part.tagName.toLowerCase()==='caption'?[compact(part.textContent)]:part.tagName.toLowerCase()==='tr'?[[...part.children].map(c=>compact(c.textContent)).join('\t')]:[...part.querySelectorAll('tr')].map(row=>[...row.children].map(c=>compact(c.textContent)).join('\t'))).join('\n');if(text)blocks.push({type:'table',text});return;}
      if(['p','h1','h2','h3','h4','h5','h6','li','blockquote','pre','figcaption'].includes(tag)){flush();const type=/^h[1-6]$/.test(tag)?'heading':tag==='li'?'list':tag==='pre'?'code':tag==='blockquote'?'quote':'paragraph';const text=tag==='pre'?node.textContent.trim():compact(node.textContent);if(text)blocks.push({type,text});return;}
      const boundary=['div','section','article','ul','ol','dl','dt','dd','figure','hr'].includes(tag);if(boundary)flush();for(const child of node.childNodes)walk(child);if(boundary)flush();
    }
    walk(body);flush();const bodyText=compact(body.textContent).replace(/\s/g,''),extracted=blocks.map(b=>b.text).join('').replace(/[\s\u200b\ufeff]/g,'');if(bodyText!==extracted)denied('正文完整性检查未通过，请在原站阅读。','incomplete');
    const split=[];for(const block of blocks){let text=block.text;while(text.length>5000){let cut=Math.max(text.lastIndexOf('. ',5000),text.lastIndexOf('? ',5000),text.lastIndexOf('! ',5000));if(cut<1000)cut=text.lastIndexOf(' ',5000);if(cut<1000)cut=5000;else if(text[cut]!== ' ')cut++;split.push({...block,text:text.slice(0,cut)});text=text.slice(cut).trimStart();}if(text)split.push({...block,text});}
    const paragraphs=split.map(b=>b.text),joined=paragraphs.join('\n\n');if(joined.length<150)denied('正文内容不足，可能不是完整文章，请在原站核对。','incomplete');if(paragraphs.length>MAX_PARAGRAPHS||joined.length>MAX_CHARACTERS)denied('原文超过当前完整阅读容量，请在原站阅读全文。','oversize');
    if(paragraphs.join('').replace(/\s/g,'')!==extracted)denied('正文分段检查未通过。','incomplete');
    const title=compact(d.querySelector('meta[property="og:title"]')?.content||d.querySelector('h1')?.textContent||item.title).replace(/\s*\|\s*MIT News.*$/,'').slice(0,500),subtitle=compact(d.querySelector('.news-article--dek,.news-article--subhead,.news-article--description,[itemprop="description"]')?.textContent||'').slice(0,1500),author=compact(d.querySelector('[itemprop="author"],.news-article--author,.news-article--byline,.author-name')?.textContent||item.author||'').slice(0,180);
    return {...item,title,subtitle,author,paragraphs,blocks:split,contentKind:'full-article',fullState:'ready',fetchedAt:new Date().toISOString(),fulltext:{version:1,complete:true,url,selector,paragraphs:paragraphs.length,characters:joined.length,sha256:crypto.createHash('sha256').update(joined).digest('hex'),fetchedAt:new Date().toISOString(),policy:source.policy},translation:[],vocab:[],questions:[]};
  }finally{dom.window.close();}
}
module.exports={extract,MAX_PARAGRAPHS,MAX_CHARACTERS};
