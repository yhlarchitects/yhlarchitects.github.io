(() => {
  'use strict';
  const surface=document.getElementById('photographs');
  const viewport=document.getElementById('viewport');
  const Orientation=window.DeviceOrientationEvent;
  const touch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
  let enabled=false,requesting=false,baseline=null,frame=0;
  let targetX=0,targetY=0,currentX=0,currentY=0;
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const state=value=>{document.documentElement.dataset.motion=value;};
  const angle=()=>Number(screen.orientation?.angle??window.orientation??0);
  const delta=(value,origin)=>((value-origin+540)%360)-180;
  function paint(){
    surface.style.setProperty('--tilt-x',currentX.toFixed(3)+'px');
    surface.style.setProperty('--tilt-y',currentY.toFixed(3)+'px');
  }
  function animate(){
    frame=0;currentX+=(targetX-currentX)*.13;currentY+=(targetY-currentY)*.13;
    if(Math.abs(targetX-currentX)<.02&&Math.abs(targetY-currentY)<.02){currentX=targetX;currentY=targetY;paint();return;}
    paint();frame=requestAnimationFrame(animate);
  }
  function reset(){
    baseline=null;targetX=targetY=currentX=currentY=0;
    if(frame)cancelAnimationFrame(frame);frame=0;paint();
  }
  function onOrientation(event){
    if(!enabled||document.hidden||viewport.scrollTop>=viewport.clientHeight||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
    const rotation=angle();
    if(!baseline||baseline.angle!==rotation){baseline={beta:event.beta,gamma:event.gamma,angle:rotation};targetX=targetY=0;state('active');return;}
    const radians=rotation*Math.PI/180;
    const horizontal=delta(event.gamma,baseline.gamma),vertical=delta(event.beta,baseline.beta);
    const limit=Math.min(32,Math.min(innerWidth,innerHeight)*.055);
    targetX=clamp((horizontal*Math.cos(radians)+vertical*Math.sin(radians))/22,-1,1)*limit;
    targetY=clamp((vertical*Math.cos(radians)-horizontal*Math.sin(radians))/22,-1,1)*limit;
    if(!frame)frame=requestAnimationFrame(animate);
  }
  function listen(){
    reset();enabled=true;state('waiting');surface.classList.add('motion-active');
    window.addEventListener('deviceorientation',onOrientation,{passive:true});
  }
  async function requestFromGesture(){
    if(requesting||enabled)return;
    requesting=true;
    try{
      // iOS requires a real user gesture. There is no separate page control.
      const permission=await Orientation.requestPermission();
      if(permission==='granted')listen();else state('denied');
      document.removeEventListener('click',requestFromGesture,true);
      document.removeEventListener('touchend',requestFromGesture,true);
    }catch{state('denied');}
    finally{requesting=false;}
  }
  if(touch&&Orientation&&window.isSecureContext){
    if(typeof Orientation.requestPermission==='function'){
      state('gesture');document.addEventListener('click',requestFromGesture,true);
      document.addEventListener('touchend',requestFromGesture,{capture:true,passive:true});
    }else listen();
  }else state('unavailable');
  window.addEventListener('orientationchange',reset,{passive:true});
  screen.orientation?.addEventListener?.('change',reset);
  document.addEventListener('visibilitychange',reset);
  window.addEventListener('pageshow',reset);
})();
