'use strict';
const crypto=require('node:crypto');
const STOP=new Set('the a an is are was were be been being to of and or in on at for from with by as it this that these those i you he she we they me him her us them my your his our their do does did have has had will would can could should may might not no but if than then so there here'.split(' '));
const words=text=>[...new Set((String(text).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[]).filter(w=>w.length>2&&!STOP.has(w)))];
const key=text=>(String(text).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[]).join(' ');
function parse(text){const seen=new Set(),pairs=[];for(const line of text.split(/\r?\n/)){const [en,zh,attribution]=line.split('\t');if(!en||!zh||!attribution?.includes('Attribution:'))continue;const count=(en.match(/[a-z]+/gi)||[]).length;if(count<3||count>80||zh.length>240||!/[\u3400-\u9fff]/.test(zh))continue;const id=key(en)+'\0'+zh.trim();if(seen.has(id))continue;seen.add(id);pairs.push({en:en.trim(),zh:zh.trim(),attribution})}return pairs}
const partition=en=>crypto.createHash('sha256').update(key(en)).digest()[0]%10;
function train(text,source){
  const pairs=parse(text),groups=new Map();for(const pair of pairs){const k=key(pair.en);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(pair)}
  const sets={train:[],validation:[],test:[]};for(const group of groups.values()){const p=partition(group[0].en);sets[p===0?'test':p===1?'validation':'train'].push(group[0])}
  if(sets.train.length<100)throw Error('英汉训练例句不足');
  const df=new Map();for(const row of sets.train)for(const w of words(row.en))df.set(w,(df.get(w)||0)+1);
  const idf=Object.fromEntries([...df].map(([w,n])=>[w,Math.log(1+(sets.train.length-n+.5)/(n+.5))]));
  const report={source,algorithm:'Document-frequency trained IDF + weighted lexical retrieval; English-normalized groups split by SHA-256; seed-free deterministic',rawPairs:text.split(/\r?\n/).filter(Boolean).length,filteredPairs:pairs.length,uniqueEnglish:groups.size,trainPairs:sets.train.length,validationPairs:sets.validation.length,testPairs:sets.test.length,vocabulary:df.size,overlap:0,note:'训练的是检索用的词频权重与例句索引，不是大模型微调。验证和测试英语组不进入运行时例句库；检索到的例句可能仍有错误，仅作措辞参考。该统计不是翻译准确率。'};
  return {model:{schema:1,source,idf,rows:sets.train,report},validation:sets.validation,test:sets.test,all:pairs};
}
function createRetriever(model){
  const postings=new Map(),features=model.rows.map(row=>words(row.en));features.forEach((list,i)=>list.forEach(w=>{if(!postings.has(w))postings.set(w,[]);postings.get(w).push(i)}));
  return text=>{const query=words(text),querySet=new Set(query);if(query.length<3)return [];const candidates=new Set();for(const w of query.filter(w=>postings.has(w)).sort((a,b)=>(model.idf[b]||0)-(model.idf[a]||0)).slice(0,8)){for(const i of postings.get(w)){candidates.add(i);if(candidates.size>=800)break}if(candidates.size>=800)break}
    const norm=query.reduce((n,w)=>n+(model.idf[w]||2),0),ranked=[];
    for(const i of candidates){const list=features[i],shared=list.filter(w=>querySet.has(w));if(shared.length<3)continue;const matched=shared.reduce((n,w)=>n+(model.idf[w]||2),0),other=list.reduce((n,w)=>n+(model.idf[w]||2),0),score=matched/Math.max(1,norm+other-matched);if(score>=.5)ranked.push({...model.rows[i],score})}
    return ranked.sort((a,b)=>b.score-a.score||a.en.localeCompare(b.en)).slice(0,2);
  };
}
module.exports={words,key,parse,partition,train,createRetriever};
