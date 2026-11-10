'use strict';const {parentPort}=require('node:worker_threads'),{extract}=require('./reading-fulltext-extractor');
parentPort.on('message',({id,input})=>{try{parentPort.postMessage({id,ok:true,article:extract(input)});}catch(e){parentPort.postMessage({id,ok:false,error:e.message,code:e.code||'parse'});}});
