(() => {
  'use strict';
  const surface=document.getElementById('photographs');
  const button=document.getElementById('motion-toggle');
  const message=document.getElementById('motion-message');
  const Orientation=window.DeviceOrientationEvent;
  const touch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
  let enabled=false, requesting=false, baseline=null, frame=0, noticeTimer=0;
  let targetX=0,targetY=0,currentX=0,currentY=0;
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const setState=value=>{document.documentElement.dataset.motion=value;};
  const angle=()=>Number(screen.orientation?.angle??window.orientation??0);
  const delta=(value,origin)=>((value-origin+540)%360)-180;
  function paint(){
    surface.style.setProperty('--tilt-x',currentX.toFixed(3)+'px');
    surface.style.setProperty('--tilt-y',currentY.toFixed(3)+'px');
  }
  function animate(){
    frame=0;
    currentX+=(targetX-currentX)*.13;currentY+=(targetY-currentY)*.13;
    if(Math.abs(targetX-currentX)<.02&&Math.abs(targetY-currentY)<.02){
      currentX=targetX;currentY=targetY;paint();return;
    }
    paint();frame=requestAnimationFrame(animate);
  }
  function reset(){
    baseline=null;targetX=targetY=currentX=currentY=0;
    if(frame)cancelAnimationFrame(frame);
    frame=0;paint();
  }
  function announce(text){
    clearTimeout(noticeTimer);
    message.textContent=text;message.hidden=!text;
    if(text)noticeTimer=setTimeout(()=>{message.hidden=true;},4500);
  }
  function onOrientation(event){
    if(!enabled||document.hidden||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
    const rotation=angle();
    if(!baseline||baseline.angle!==rotation){
      baseline={beta:event.beta,gamma:event.gamma,angle:rotation};
      targetX=targetY=0;setState('active');return;
    }
    const radians=rotation*Math.PI/180;
    const horizontal=delta(event.gamma,baseline.gamma);
    const vertical=delta(event.beta,baseline.beta);
    const limit=Math.min(32,Math.min(innerWidth,innerHeight)*.055);
    targetX=clamp((horizontal*Math.cos(radians)+vertical*Math.sin(radians))/22,-1,1)*limit;
    targetY=clamp((vertical*Math.cos(radians)-horizontal*Math.sin(radians))/22,-1,1)*limit;
    if(!frame)frame=requestAnimationFrame(animate);
  }
  function stop(){
    enabled=false;window.removeEventListener('deviceorientation',onOrientation);
    surface.classList.remove('motion-active');reset();
    button.setAttribute('aria-pressed','false');button.textContent='기울여 보기';setState('off');
  }
  async function toggle(){
    if(requesting)return;
    if(enabled){stop();announce('기울기 움직임을 껐습니다.');return;}
    requesting=true;button.disabled=true;
    try{
      // Called directly from a click: iOS requires transient user activation.
      if(typeof Orientation.requestPermission==='function'){
        const permission=await Orientation.requestPermission();
        if(permission!=='granted'){setState('denied');announce('기울기 사용이 허용되지 않았습니다.');return;}
      }
      reset();enabled=true;setState('waiting');
      window.addEventListener('deviceorientation',onOrientation,{passive:true});
      surface.classList.add('motion-active');
      button.setAttribute('aria-pressed','true');button.textContent='기울기 끄기';
      announce('휴대폰을 천천히 기울여 보세요.');
    }catch{
      stop();setState('denied');announce('기울기 사용을 켤 수 없습니다.');
    }finally{requesting=false;button.disabled=false;}
  }
  if(touch&&Orientation&&window.isSecureContext){
    button.hidden=false;button.addEventListener('click',toggle);setState('off');
  }else{button.hidden=true;setState('unavailable');}
  window.addEventListener('orientationchange',reset,{passive:true});
  screen.orientation?.addEventListener?.('change',reset);
  document.addEventListener('visibilitychange',reset);
  window.addEventListener('pageshow',reset);
})();
