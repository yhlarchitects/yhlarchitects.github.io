(() => {
  'use strict';
  const viewport=document.getElementById('viewport');
  const track=document.getElementById('track');
  const svgNS='http://www.w3.org/2000/svg';
  let marqueeShape='';
  function makeMarquee(){
    const cell=innerWidth<=600?570:850;
    const copies=Math.ceil(Math.max(viewport.clientWidth,innerWidth)/cell)+2;
    const shape=cell+':'+copies;
    if(shape===marqueeShape)return;
    marqueeShape=shape;
    const oldDistance=parseFloat(track.style.getPropertyValue('--mail-distance'))||1;
    const oldTransform=getComputedStyle(track).transform;
    const offset=oldTransform==='none'?0:Math.abs(new DOMMatrix(oldTransform).m41)%oldDistance;
    const group=document.createElement('span');group.className='mail-group';
    // Both identical groups cover the widest possible visible interval.
    for(let i=0;i<copies;i++){
      const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 -741 11633 931');
      const use=document.createElementNS(svgNS,'use');use.setAttribute('href','#unit');svg.append(use);group.append(svg);
    }
    track.style.animation='none';track.replaceChildren(group,group.cloneNode(true));
    const distance=group.getBoundingClientRect().width,speed=32;
    track.style.setProperty('--mail-distance',distance+'px');
    track.style.setProperty('--mail-duration',distance/speed+'s');
    track.style.animationDelay=-(offset%cell)/speed+'s';
    void track.offsetWidth;track.style.removeProperty('animation');
  }
  makeMarquee();
  window.addEventListener('resize',makeMarquee,{passive:true});
  new ResizeObserver(makeMarquee).observe(viewport);
  const paper=document.getElementById('paper-scan');
  function loadPaper(){
    if(paper.hasAttribute('src'))return;
    paper.srcset=paper.dataset.srcset;paper.src=paper.dataset.src;
  }
  // Do not delay the collage with the large ending image.
  viewport.addEventListener('scroll',()=>{
    if(viewport.scrollTop>0)loadPaper();
    viewport.classList.toggle('is-ending',viewport.scrollTop>=viewport.clientHeight);
  },{passive:true});
  window.addEventListener('pageshow',()=>{if(viewport.scrollTop>0)loadPaper();});
  for(const type of ['gesturestart','gesturechange','gestureend']){
    document.addEventListener(type,event=>event.preventDefault(),{passive:false});
  }
  document.addEventListener('touchmove',event=>{if(event.touches.length>1)event.preventDefault();},{passive:false});
  let lastTouch=-1000;
  document.addEventListener('touchend',event=>{
    const now=performance.now();
    if(event.changedTouches.length===1&&now-lastTouch<300)event.preventDefault();
    lastTouch=now;
  },{passive:false});
  document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
  // Desktop visitors can grab the scan and drag upward to reach the paper.
  let drag=null;
  viewport.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('a,button'))return;
    drag={id:event.pointerId,y:event.clientY,scroll:viewport.scrollTop};
  });
  viewport.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(Math.abs(event.clientY-drag.y)>5){viewport.setPointerCapture(event.pointerId);viewport.scrollTop=drag.scroll+drag.y-event.clientY;}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,()=>{drag=null;});
})();
