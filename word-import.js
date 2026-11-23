'use strict';

const WordImport = (() => {
  const maxFile = 10 * 1024 * 1024;
  const maxEntry = 24 * 1024 * 1024;
  const headers = {
    w: ['word','spelling','单词','拼写'], m: ['meaning','definition','释义','中文释义'],
    p: ['phonetic','音标'], uk: ['uk','英式音标'], us: ['us','美式音标'],
    pos: ['pos','词性'], e: ['example','例句'], t: ['translation','例句翻译'],
    expanded: ['expanded','拓展释义'], forms: ['forms','变形','词形']
  };

  function rowsToWords(rows) {
    const cleaned=rows.filter(row=>row.some(cell=>String(cell||'').trim()));
    const first=cleaned[0]?.map(cell=>String(cell||'').trim().toLowerCase())||[];
    const columns=Object.fromEntries(Object.entries(headers).map(([name,aliases])=>[name,first.findIndex(text=>aliases.includes(text))]));
    if(columns.w>=0&&columns.m>=0){
      return cleaned.slice(1,10001).map(row=>Object.fromEntries(Object.entries(columns).filter(([,index])=>index>=0).map(([name,index])=>[name,row[index]])));
    }
    return cleaned.slice(0,10000).map(row=>{
      if(row.length<=2)return {w:row[0],m:row[1]};
      if(row.length===3)return {w:row[0],p:row[1],m:row[2]};
      return {w:row[0],p:row[1],pos:row[2],m:row[3],e:row[4],t:row[5]};
    });
  }

  function delimited(text) {
    const separator=(text.split(/\r?\n/,1)[0]||'').includes('\t')?'\t':',';
    const rows=[];
    let row=[],value='',quoted=false;
    const pushCell=()=>{row.push(value.trim());value='';};
    for(let index=0;index<text.length&&rows.length<10001;index++){
      const char=text[index];
      if(char==='"'&&(quoted||!value)){
        if(quoted&&text[index+1]==='"'){value+='"';index++;}
        else quoted=!quoted;
      }else if(!quoted&&char===separator)pushCell();
      else if(!quoted&&char==='\n'){pushCell();rows.push(row);row=[];}
      else if(char!=='\r')value+=char;
    }
    if(quoted)throw Error('请检查 CSV 或 TXT 的引号是否成对');
    if(value||row.length){pushCell();rows.push(row);}
    return rowsToWords(rows);
  }

  async function xlsx(file) {
    if(file.size>maxFile)throw Error('Excel 文件不能超过 10 MB');
    const entries=new Map();
    let total=0;
    const zip=new fflate.Unzip(entry=>{
      if(!/^xl\/(?:worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels)$/.test(entry.name))return;
      if(entry.originalSize>maxEntry)throw Error('Excel 工作表过大');
      const decoder=new TextDecoder(),parts=[];
      let size=0;
      entry.ondata=(error,chunk,end)=>{
        if(error)throw error;
        size+=chunk.length;
        total+=chunk.length;
        if(size>maxEntry||total>maxEntry*2)throw Error('Excel 工作表过大');
        parts.push(decoder.decode(chunk,{stream:!end}));
        if(end)entries.set(entry.name,parts.join(''));
      };
      entry.start();
    });
    zip.register(fflate.UnzipInflate);
    const bytes=new Uint8Array(await file.arrayBuffer());
    for(let offset=0;offset<bytes.length;offset+=32768)zip.push(bytes.subarray(offset,offset+32768),offset+32768>=bytes.length);
    const parse=name=>{
      const contents=entries.get(name);
      if(!contents)return null;
      if(/<!DOCTYPE/i.test(contents))throw Error('Excel XML 格式不受支持');
      const xml=new DOMParser().parseFromString(contents,'application/xml');
      if(xml.querySelector('parsererror'))throw Error('Excel 内容格式无效');
      return xml;
    };
    const workbook=parse('xl/workbook.xml');
    const firstSheet=workbook?.getElementsByTagNameNS('*','sheet')[0];
    const relation=firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const sheetRelation=[...parse('xl/_rels/workbook.xml.rels')?.getElementsByTagNameNS('*','Relationship')||[]].find(item=>item.getAttribute('Id')===relation);
    const target=sheetRelation?.getAttribute('Target')||'worksheets/sheet1.xml';
    const sheet=parse(target.startsWith('/')?target.slice(1):'xl/'+target);
    if(!sheet)throw Error('没有可读取的第一个工作表');
    const text=node=>[...node.getElementsByTagNameNS('*','t')].map(part=>part.textContent).join('');
    const strings=[...parse('xl/sharedStrings.xml')?.getElementsByTagNameNS('*','si')||[]].map(text);
    const rows=[...sheet.getElementsByTagNameNS('*','row')].slice(0,10001).map(row=>{
      const values=[];
      for(const cell of row.getElementsByTagNameNS('*','c')){
        const letters=(cell.getAttribute('r')||'').match(/^[A-Z]+/)?.[0]||'';
        const index=letters?Array.from(letters).reduce((column,letter)=>column*26+letter.charCodeAt(0)-64,0)-1:values.length;
        if(index>=64)continue;
        const value=cell.getElementsByTagNameNS('*','v')[0]?.textContent;
        const type=cell.getAttribute('t');
        values[index]=type==='s'?strings[Number(value)]||'':type==='inlineStr'?text(cell):value||'';
      }
      return values;
    });
    return rowsToWords(rows);
  }
  return {xlsx,delimited};
})();
