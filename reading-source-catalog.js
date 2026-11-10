'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordIsleSourceCatalog=api;})(globalThis,()=>{
  const version=3;
  const groups=[{id:'news',name:'新闻与社会'},{id:'culture',name:'文化与生活'},{id:'learning',name:'学习与教育'},{id:'science',name:'科技与自然'}];
  const providers={
    nasa:{credit:'NASA',domains:['nasa.gov'],home:'https://www.nasa.gov/',policy:'https://www.nasa.gov/nasa-brand-center/images-and-media/',mode:'excerpt'},
    noaa:{credit:'NOAA',domains:['noaa.gov'],home:'https://www.noaa.gov/',policy:'https://www.noaa.gov/rss-feeds',mode:'excerpt'},
    nsf:{credit:'NSF',domains:['nsf.gov'],home:'https://www.nsf.gov/',policy:'https://www.nsf.gov/',mode:'excerpt'},
    npr:{credit:'NPR',domains:['npr.org'],home:'https://www.npr.org/',policy:'https://www.npr.org/about-npr/179876898/terms-of-use',mode:'summary'},
    smithsonian:{credit:'Smithsonian Magazine',domains:['smithsonianmag.com'],home:'https://www.smithsonianmag.com/',policy:'https://www.smithsonianmag.com/rss/',mode:'summary'},
    mit:{credit:'MIT News',domains:['news.mit.edu'],home:'https://news.mit.edu/',policy:'https://news.mit.edu/rss',mode:'summary',timeoutMs:35000},
    sciencedaily:{credit:'ScienceDaily',domains:['sciencedaily.com'],home:'https://www.sciencedaily.com/',policy:'https://www.sciencedaily.com/terms.htm',mode:'summary',bundleSummary:true},
    explores:{credit:'Science News Explores',domains:['snexplores.org'],home:'https://www.snexplores.org/',policy:'https://www.snexplores.org/feed',mode:'summary'}
  };
  const entries=[
    ['nasa','nasa','NASA','航天科技','science','https://www.nasa.gov/feed/','CET-6'],
    ['noaa','noaa','NOAA','自然环境','science','https://www.noaa.gov/rss.xml','CET-6'],
    ['nsf','nsf','NSF','科学研究','science','https://www.nsf.gov/rss/rss_www_news.xml','TOEFL'],
    ['npr','npr','NPR · 综合新闻','综合新闻','news','https://feeds.npr.org/1001/rss.xml','CET-6'],
    ['npr-world','npr','NPR · 世界','世界新闻','news','https://feeds.npr.org/1004/rss.xml','CET-6'],
    ['npr-books','npr','NPR · 图书','图书文化','culture','https://feeds.npr.org/1032/rss.xml','CET-6'],
    ['npr-education','npr','NPR · 教育','教育学习','learning','https://feeds.npr.org/1013/rss.xml','CET-6'],
    ['smithsonian','smithsonian','Smithsonian · 精选','文化见闻','culture','https://www.smithsonianmag.com/rss/latest_articles/','CET-6'],
    ['smithsonian-culture','smithsonian','Smithsonian · 艺术','艺术文化','culture','https://www.smithsonianmag.com/rss/arts-culture/','CET-6'],
    ['smithsonian-history','smithsonian','Smithsonian · 历史','历史人文','culture','https://www.smithsonianmag.com/rss/history/','CET-6'],
    ['smithsonian-travel','smithsonian','Smithsonian · 旅行','旅行生活','culture','https://www.smithsonianmag.com/rss/travel/','CET-6'],
    ['mit','mit','MIT News','大学与创新','learning','https://news.mit.edu/rss/feed','CET-6'],
    ['sn-explores','explores','Science News Explores','青少年科普','learning','https://www.snexplores.org/feed','CET-4'],
    ['sciencedaily-society','sciencedaily','ScienceDaily · 社会','社会与学习','news','https://www.sciencedaily.com/rss/top/society.xml','CET-6'],
    ['sciencedaily-health','sciencedaily','ScienceDaily · 健康','健康生活','culture','https://www.sciencedaily.com/rss/top/health.xml','CET-6'],
    ['sciencedaily-mind','sciencedaily','ScienceDaily · 心智','心理与认知','science','https://www.sciencedaily.com/rss/mind_brain.xml','CET-6']
  ];
  const fullPolicies={nasa:['article .entry-content','.entry-content'],noaa:['article .field--name-body','article .field--name-field-body'],nsf:['article .field--name-body','article .field--name-field-body'],mit:['[itemprop=articleBody]','.news-article--content--body--inner']};
  const sources=entries.map(([id,provider,name,topic,group,url,level])=>Object.freeze({...providers[provider],id,provider,name,topic,group,url,level,fullText:!!fullPolicies[provider],bodySelectors:fullPolicies[provider]||[],mode:fullPolicies[provider]?'full':'external',recommended:!!fullPolicies[provider],...(provider==='mit'?{policy:'https://news.mit.edu/terms-of-use',footer:'Reprinted with permission of MIT News'}:{})}));
  const ids=()=>sources.map(s=>s.id),recommended=()=>sources.filter(s=>s.recommended).map(s=>s.id),get=id=>sources.find(s=>s.id===id),filterIds=list=>Array.isArray(list)?[...new Set(list.filter(id=>get(id)))]:[];
  function preferences(raw={}){let selected=filterIds(raw.newsSources);if(!selected.length)selected=recommended();else if((raw.newsCatalogVersion||0)<version&&((selected.length===3&&['nasa','noaa','nsf'].every(id=>selected.includes(id)))||(selected.length===sources.length&&sources.every(s=>selected.includes(s.id)))))selected=recommended();return {autoNews:raw.autoNews!==false,newsHours:[6,12,24].includes(raw.newsHours)?raw.newsHours:6,newsSources:selected,newsCatalogVersion:version};}
  return Object.freeze({version,sources:Object.freeze(sources),groups:Object.freeze(groups),ids,recommended,get,filterIds,preferences});
});
