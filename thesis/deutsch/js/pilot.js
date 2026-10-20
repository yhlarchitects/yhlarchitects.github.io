/* First attempts are immutable; edits and self-checks carry their own times. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyPilot=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const validKey=k=>typeof k==='string'&&!['__proto__','constructor','prototype'].includes(k);
 const first=k=>/^(first-|listen-|turn-|view-transcript|model-turn-|seen-model-)/.test(k);
 const valid=r=>r&&typeof r==='object'&&typeof r.at==='string'&&!isNaN(Date.parse(r.at))&&['string','boolean','number'].includes(typeof r.value);
 const key=(language,day,course)=>language+':'+day+':'+course;
 function merge(a,b){
  const out={};
  for(const source of [a,b])for(const id of Object.keys(source||{})){
   if(!validKey(id)||!source[id]||typeof source[id]!=='object')continue;
   const target=own(out,id)?out[id]:(out[id]={});
   for(const field of Object.keys(source[id])){
    const next=source[id][field];if(!validKey(field)||!valid(next))continue;
    const old=target[field];
    const tie=old&&next.at===old.at&&JSON.stringify(next)<JSON.stringify(old);
    if(!old||tie||(first(field)?next.at<old.at:next.at>old.at))target[field]=JSON.parse(JSON.stringify(next));
   }
  }
  return out;
 }
 function put(results,id,field,value,at,meta){
  if(!validKey(id)||!validKey(field))return false;
  const item=own(results,id)?results[id]:(results[id]={});
  if(first(field)&&own(item,field))return false;
  const record={value,at,...meta};if(!valid(record))return false;item[field]=record;return true;
 }
 function read(results,id,field){const r=results?.[id]?.[field];return valid(r)?r:null}
 return {key,merge,put,read};
});
