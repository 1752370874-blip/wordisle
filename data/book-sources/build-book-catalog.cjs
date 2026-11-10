const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const app=path.resolve('outputs/词屿竞赛体验版/resources/app/app');
const source=path.resolve('work/package/assets/ecdict.csv');
const ctx={window:{}};vm.createContext(ctx);
for(const file of fs.readdirSync(path.join(app,'data')).filter(n=>n.startsWith('dict-')))vm.runInContext(fs.readFileSync(path.join(app,'data',file),'utf8'),ctx);
const original=ctx.window.DECKS,examples=new Map();for(const d of original)for(const w of d.words)if(w.e&&!examples.has(w.w.toLowerCase()))examples.set(w.w.toLowerCase(),w);
const entries=new Map();let row=[],field='',quoted=false,start=true;
function cell(){row.push(field);field='';start=true}
function line(){cell();const [word,p,,translation,,,,tags,bnc,frq]=row;row=[];if(!word||word==='word'||!translation||!/[\u3400-\u9fff]/.test(translation)||!/^\p{L}[A-Za-z' .-]*$/u.test(word)||!/[A-Za-z]/.test(word))return;const k=word.toLowerCase();if(entries.has(k))return;const sample=examples.get(k);entries.set(k,{w:word,p:p?'/'+p.replace(/^\/+|\/+$/g,'')+'/':'',pos:'',m:translation.replace(/\\n/g,'；').replace(/\s+/g,' ').slice(0,700),e:sample?.e||'',t:sample?.t||'',tags:(tags||'').split(' '),rank:Math.min(+bnc>0?+bnc:1e9,+frq>0?+frq:1e9)});}
const data=fs.readFileSync(source,'utf8');for(let i=0;i<data.length;i++){const c=data[i];if(quoted){if(c==='"'){if(data[i+1]==='"'){field+='"';i++}else quoted=false}else field+=c}else if(c==='"'&&start){quoted=true;start=false}else if(c===',')cell();else if(c==='\n')line();else if(c!=='\r'){field+=c;start=false}}if(field||row.length)line();
const groups=JSON.parse(fs.readFileSync('work/primary-book-source.json','utf8')),books=[],primary=new Map();
const clean=x=>({w:x.w,p:x.p||'',pos:x.pos||'',m:x.m,e:x.e||'',t:x.t||''});
for(const g of groups){const words=g.pairs.split('|').map(pair=>{const [w,m]=pair.split('=');if(!w||!m)throw Error(pair);const found=entries.get(w.toLowerCase());const obj={w,m,p:found?.p||'',pos:'',e:'',t:''};if(!primary.has(w.toLowerCase()))primary.set(w.toLowerCase(),obj);return obj});books.push({id:g.id,name:g.name,level:'小学',desc:'围绕'+g.name.replace(/^小学 · /,'')+'积累常用词，短时练习也能轻松开始。',source:'词屿编选生活主题词书；音标参考 ECDICT。不对应具体教材版本或官方全量词表。',words});}
books.unshift({id:'primary-all',name:'小学 · 生活与校园综合',level:'小学',desc:'汇集日常、校园、自然与常用表达的基础词，从生活里开始积累。',source:'词屿编选生活主题词书；音标参考 ECDICT。不对应具体教材版本或官方全量词表。',words:[...primary.values()]});
const tagged=t=>[...entries.values()].filter(w=>w.tags.includes(t)).sort((a,b)=>a.rank-b.rank||a.w.localeCompare(b.w));
function add(id,name,level,words,desc){if(!words.length)throw Error('empty '+id);books.push({id,name,level,desc,source:'ECDICT 0.0.4 快照，按标签及 BNC/当代语料频率编选；非考试官方或出版社词书',words:words.map(clean)})}
const junior=tagged('zk'),senior=tagged('gk'),juniorSet=new Set(junior.map(w=>w.w.toLowerCase()));
add('junior-all','初中 · 中考标签总表','初中',junior,'公开词典中标注中考的词汇，按语料常用程度排序。');
add('junior-start','初中 · 常用入门','初中',junior.slice(0,900),'中考标签中较常用的前 900 词，先打好日常阅读基础。');
add('junior-advance','初中 · 进阶积累','初中',junior.slice(900),'中考标签其余词汇，与常用入门分册互补。');
add('senior-all','高中 · 高考标签总表','高中',senior,'公开词典中标注高考的词汇，按语料常用程度排序。');
add('senior-start','高中 · 常用基础','高中',senior.slice(0,1500),'高考标签中较常用的前 1500 词。');
add('senior-advance','高中 · 衔接拓展','高中',senior.filter(w=>!juniorSet.has(w.w.toLowerCase())),'高考标签中未被中考标签收录的词汇，适合衔接积累。');
for(const [tag,level,title,n] of [['cet4','大学','四级',2000],['cet6','大学','六级',1500],['ky','大学','考研',2000],['ielts','雅思','雅思',1500],['toefl','托福','托福',2000],['gre','GRE','GRE',2500]]){const words=tagged(tag);add(tag+'-common',title+' · 常用优先',level,words.slice(0,n),'按语料词频编选的常用部分；不是考试出现频率排名。');add(tag+'-extension',title+' · 进阶补充',level,words.slice(n),'与“常用优先”分册互补的标签词汇。');}
const oldLevels={cet4:'大学',cet6:'大学',kaoyan:'大学',ielts:'雅思',toefl:'托福',gre:'GRE',oxford3000:'通用',oxford5000:'通用',collins5:'通用'};
const records=original.map(d=>({id:d.id,name:d.name,level:oldLevels[d.id]||'通用',words:d.words.length,source:'3.9.19 已有词库，内容与标识保留'})).concat(books.map(d=>({id:d.id,name:d.name,level:d.level,words:d.words.length,source:d.source})));
const seenIds=new Set();for(const d of [...original,...books]){if(seenIds.has(d.id))throw Error('duplicate id '+d.id);seenIds.add(d.id);if(new Set(d.words.map(w=>w.w.toLowerCase())).size!==d.words.length)throw Error('duplicate word '+d.id);if(d.words.some(w=>!w.w||!w.m))throw Error('missing meaning '+d.id)}
fs.writeFileSync(path.join(app,'data','books-expanded.js'),'window.DECKS=window.DECKS||[];window.DECKS.push(...'+JSON.stringify(books)+');\nwindow.BOOK_CATALOG='+JSON.stringify(records)+';\n');
const report={version:1,source:'ECDICT via ecdict@0.0.4',url:'https://github.com/skywind3000/ECDICT',sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),primarySourceSha256:crypto.createHash('sha256').update(fs.readFileSync('work/primary-book-source.json')).digest('hex'),primaryWords:primary.size,bookCount:records.length,totalEntries:records.reduce((s,d)=>s+d.words,0),uniqueWords:new Set([...original,...books].flatMap(d=>d.words.map(w=>w.w.toLowerCase()))).size,books:records};
fs.mkdirSync(path.join(app,'data','book-sources'),{recursive:true});fs.writeFileSync(path.join(app,'data','book-sources','catalog.json'),JSON.stringify(report,null,2));fs.copyFileSync('work/primary-book-source.json',path.join(app,'data','book-sources','primary-word-selection.json'));fs.copyFileSync('work/build-book-catalog.cjs',path.join(app,'data','book-sources','build-book-catalog.cjs'));fs.copyFileSync(path.join(app,'data','extended-dict','LICENSE-ECDICT.txt'),path.join(app,'data','book-sources','LICENSE-ECDICT.txt'));
console.log(JSON.stringify({...report,books:records.map(d=>[d.id,d.words])},null,2));
