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

(() => {
  'use strict';
  const assets = [{"src": "assets/photo-e8657368511e6b05.webp", "mobile": "assets/photo-mobile-e0d4594aeeb12dd6.webp", "preview": "assets/photo-rear-156ad546e106a7f2.webp", "title": "chamber aerial", "ratio": 0.670625}, {"src": "assets/photo-641ee67503bbae26.webp", "mobile": "assets/photo-mobile-9e04af738e6b9dcb.webp", "preview": "assets/photo-rear-ec72d395b1b423ae.webp", "title": "chamber court", "ratio": 0.670625}, {"src": "assets/photo-2edb87bd41714fed.webp", "mobile": "assets/photo-mobile-257c8b2cb0ae2c45.webp", "preview": "assets/photo-rear-12c8e613a289a275.webp", "title": "chamber facade", "ratio": 0.670625}, {"src": "assets/photo-beef53aff2236486.webp", "mobile": "assets/photo-mobile-581bd4d0b3ca8bb2.webp", "preview": "assets/photo-rear-75fc6d6d68163eac.webp", "title": "crown detail", "ratio": 1.4911463187325256}, {"src": "assets/photo-9790b9fc404d5716.webp", "mobile": "assets/photo-mobile-e34be5b08d42ad29.webp", "preview": "assets/photo-rear-3f9ec5dbd944c466.webp", "title": "garden seats", "ratio": 1.490566037735849}, {"src": "assets/photo-24baf8f1e24cd7f9.webp", "mobile": "assets/photo-mobile-e70c53b294f1cba3.webp", "preview": "assets/photo-rear-b7e8b81749d12186.webp", "title": "garden walk", "ratio": 1.4911463187325256}, {"src": "assets/photo-c5c853ba9cbacaf2.webp", "mobile": "assets/photo-mobile-469ef5e56987b2af.webp", "preview": "assets/photo-rear-57bceac6d371b854.webp", "title": "project 1004", "ratio": 0.6525}];
  const objectAssets = [{"id": "rose-petal", "kind": "petal", "src": "assets/rose-petal-6c56dcd673107ade.webp", "ratio": 1.0}, {"id": "white-petal", "kind": "petal", "src": "assets/white-petal-854d7e6ecc1dadde.webp", "ratio": 0.962}, {"id": "blue-tulip-petal", "kind": "petal", "src": "assets/blue-tulip-petal-aaabac9b04d96cb2.webp", "ratio": 0.75}, {"id": "silver-key", "kind": "key", "src": "assets/silver-key-71f798818d1b7298.webp", "ratio": 0.772}, {"id": "brass-key", "kind": "key", "src": "assets/brass-key-cc6b3cec4031f5ac.webp", "ratio": 0.847}];
  const filters = ['neutral','cold','copper','mesh','silver'];
  const surface = document.getElementById('photographs');
  let seed = 0, generation = 0, layoutTimer;
  const randomSeed = () => {
    const n = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(n);
    else n[0] = Math.random()*4294967295;
    return n[0];
  };
  function randomGenerator(value) {
    return () => { value += 0x6D2B79F5; let n=value; n=Math.imul(n^(n>>>15),n|1); n^=n+Math.imul(n^(n>>>7),n|61); return ((n^(n>>>14))>>>0)/4294967296; };
  }
  function shuffle(list,rand) {
    const a=[...list]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
  }
  function clamp(n,lo,hi) {return Math.max(lo,Math.min(hi,n));}
  function layout(newSeed = true) {
    if(newSeed){const previous=seed; do{seed=randomSeed();}while(seed===previous);generation++;}
    const rand=randomGenerator(seed), W=document.getElementById('stage').clientWidth, H=document.getElementById('stage').clientHeight, mobile=W<620;
    const marginX=W*.1, marginY=H*.1;
    const frontCount=rand()>.5?3:2, count=8+frontCount;
    const fragment=document.createDocumentFragment(), sizeBase=mobile?W*.88:Math.min(W*.43,H*.83);
    const lensScale=mobile?.57:clamp(Math.min(W/1920,H/1080),.65,1.18);
    const blurByDepth=[0,0,2.6,7,15,28];
    const scaleByDepth=[0,1,.94,.88,.83,.78];
    const deck=[]; while(deck.length<count)deck.push(...shuffle(assets.map((_,i)=>i),rand));
    const fronts=[]; while(fronts.length<frontCount)fronts.push(...shuffle(assets.map((_,i)=>i),rand).slice(0,frontCount-fronts.length));
    const filterDeck=[]; while(filterDeck.length<count)filterDeck.push(...shuffle(filters,rand));
    const mirror=rand()>.5;
    const points={
      5:[[-.07,.35],[1.07,.69]],
      4:[[.35,-.05],[.68,1.05]],
      3:[[.14,.66],[.88,.30]],
      2:[[.46,.25],[.57,.79]],
      1:mobile?(frontCount===2?[[.44,.31],[.60,.69]]:[[.39,.26],[.65,.50],[.39,.76]]):
          (frontCount===2?[[.29,.43],[.73,.59]]:[[.25,.39],[.76,.40],[.53,.76]])
    };
    let index=0;
    for(let depth=5;depth>=1;depth--){
      const amount=depth===1?frontCount:2;
      for(let local=0;local<amount;local++,index++){
        const assetIndex=depth===1?fronts[local]:deck[index];
        const asset=assets[assetIndex], effect=filterDeck[index];
        let width=sizeBase*scaleByDepth[depth]*(.93+rand()*.14)*Math.sqrt(asset.ratio/1.5);
        let height=width/asset.ratio;
        const angles=[-141,-104,-69,-36,29,58,94,133,158];
        const rotation=angles[Math.floor(rand()*angles.length)]+(rand()-.5)*16;
        const rad=rotation*Math.PI/180;
        let boundW=Math.abs(width*Math.cos(rad))+Math.abs(height*Math.sin(rad));
        let boundH=Math.abs(height*Math.cos(rad))+Math.abs(width*Math.sin(rad));
        const fit=Math.min(1,W*1.18/boundW,H*1.16/boundH);
        width*=fit;height*=fit;boundW*=fit;boundH*=fit;
        const anchor=points[depth][local];
        let cx=((mirror?1-anchor[0]:anchor[0])+(rand()-.5)*.11)*W;
        let cy=(anchor[1]+(rand()-.5)*.09)*H;
        // The scanner bed extends 10% past each side of the visible viewport.
        cx=clamp(cx,boundW/2-marginX,W+marginX-boundW/2);
        cy=clamp(cy,boundH/2-marginY,H+marginY-boundH/2);
        // Keep the sharp photographs legible while the rear planes leave the frame.
        if(depth===1){
          cx=clamp(cx,boundW*.38,W-boundW*.38);
          cy=clamp(cy,boundH*.39+26,H-40-boundH*.38);
        }
        const figure=document.createElement('figure');figure.className='print '+effect;
        figure.dataset.asset=String(assetIndex);figure.dataset.filter=effect;
        figure.dataset.depth=String(depth);figure.dataset.rotation=rotation.toFixed(2);
        const focusBlur=blurByDepth[depth]*lensScale;
        const edge=(depth===1?1.25:(5+depth*3.1))*lensScale;
        figure.dataset.blur=focusBlur.toFixed(2);
        Object.assign(figure.style,{
          left:(cx-width/2+marginX)+'px',top:(cy-height/2+marginY)+'px',
          width:width+'px',height:height+'px',
          zIndex:String((6-depth)*10+local)
        });
        figure.style.setProperty('--rotation',rotation+'deg');
        figure.style.setProperty('--parallax',String([0,1,.78,.56,.36,.18][depth]));
        const focusAngle=Math.round(rand()*360);
        figure.style.setProperty('--focus-angle',focusAngle+'deg');
        figure.style.setProperty('--focus-blur',focusBlur.toFixed(2)+'px');
        figure.style.setProperty('--edge',(edge+focusBlur*.6).toFixed(2)+'px');
        figure.style.setProperty('--bloom',(edge*2+focusBlur).toFixed(2)+'px');
        figure.style.setProperty('--lift',(edge*1.5+focusBlur).toFixed(2)+'px');
        figure.style.setProperty('--drift-x',((rand()-.5)*edge*1.3).toFixed(2)+'px');
        figure.style.setProperty('--drift-y',((rand()-.5)*edge*1.3).toFixed(2)+'px');
        figure.dataset.focus=String(focusAngle);
        // The rear planes need one small raster; the front retains lifted, soft edges.
        const layers=depth<=2?['defocus','focus']:['focus'];
        const source=depth>=3?asset.preview:(mobile?asset.mobile:asset.src);
        for(const kind of layers){
          const img=document.createElement('img');img.src=source;img.alt=kind==='focus'?asset.title:'';
          img.className='layer '+kind;img.draggable=false;img.decoding='async';
          img.fetchPriority=depth===1?'high':'low';
          if(kind!=='focus')img.setAttribute('aria-hidden','true');figure.append(img);
        }
        if(effect==='mesh'&&depth<=2){
          const grid=document.createElement('div');grid.className='scan-grid';grid.setAttribute('aria-hidden','true');figure.append(grid);
        }
        fragment.append(figure);
      }
    }
    surface.replaceChildren(fragment);
    const objectCount=scatterObjects(rand,W,H,marginX,marginY,mobile);
    surface.dataset.canvasWidth=String(W*1.2);surface.dataset.canvasHeight=String(H*1.2);
    document.getElementById('status').textContent=`앞쪽 선명한 사진 ${frontCount}장과 뒤쪽 사진 8장, 스캔 오브제 ${objectCount}개를 펼쳤습니다.`;
    document.documentElement.dataset.seed=String(seed);
    document.documentElement.dataset.ready='true';
  }

  function scatterObjects(rand,W,H,marginX,marginY,mobile){
    const placed=[];
    const vertical=H>=W, reverse=rand()>.5;
    // A separate link for each account, in every composition, including reloads.
    for(const kind of ['petal','key']){
      const pool=objectAssets.filter(asset=>asset.kind===kind);
      const asset=pool[Math.floor(rand()*pool.length)];
      const movement=Math.min(32,Math.min(W,H)*.055), padding=14+movement;
      let length=kind==='petal'?
        (mobile?W*(.25+rand()*.06):Math.min(W*(.11+rand()*.02),H*.26)):
        (mobile?W*(.31+rand()*.06):Math.min(W*(.14+rand()*.02),H*.33));
      let width=asset.ratio>=1?length:length*asset.ratio;
      let height=asset.ratio>=1?length/asset.ratio:length;
      const angle=rand()*360-180, radians=angle*Math.PI/180;
      let boundW=Math.abs(width*Math.cos(radians))+Math.abs(height*Math.sin(radians));
      let boundH=Math.abs(height*Math.cos(radians))+Math.abs(width*Math.sin(radians));
      const slotSpace=vertical?(H-75-68-padding*2)/2-12:(W-padding*2)/2-12;
      const fit=Math.min(1,(W-padding*2)/boundW,Math.max(44,H-75-68-padding*2)/boundH,Math.max(30,slotSpace)/(vertical?boundH:boundW));
      width*=fit;height*=fit;boundW*=fit;boundH*=fit;
      const half=(placed.length===0)!==reverse?0:1;
      const midY=(H+75-68)/2;
      const minX=vertical||half===0?padding:W/2+6;
      const maxX=vertical||half===1?W-padding:W/2-6;
      const minY=!vertical||half===0?75+padding:midY+6;
      const maxY=!vertical||half===1?H-68-padding:midY-6;
      const candidates=Array.from({length:48},()=>({
        x:clamp((.06+rand()*.88)*W,minX+boundW/2,maxX-boundW/2),
        y:clamp((.12+rand()*.76)*H,minY+boundH/2,maxY-boundH/2)
      }));
      function score(candidate){
        let score=0;
        // Prefer scanner glass, but never cover the other account's link.
        for(const other of placed){
          const dx=Math.abs(candidate.x-other.x),dy=Math.abs(candidate.y-other.y);
          const overlapX=(boundW+other.w)/2+20-dx,overlapY=(boundH+other.h)/2+20-dy;
          if(overlapX>0&&overlapY>0)score-=1000+overlapX*overlapY;
          score+=Math.hypot(dx/W,dy/H)*2;
        }
        const scroll=document.getElementById('viewport').scrollTop;
        for(const [dx,dy] of [[0,0],[-.3,0],[.3,0],[0,-.3],[0,.3]]){
          if(!document.elementsFromPoint(candidate.x+dx*boundW,candidate.y+dy*boundH-scroll).some(el=>el.classList.contains('print')))score++;
        }
        return score;
      }
      const best=candidates.map(c=>({...c,score:score(c)})).sort((a,b)=>b.score-a.score)[0];
      placed.push({...best,w:boundW,h:boundH});
      const handle=kind==='petal'?'yhlpic':'reyeonho';
      const object=document.createElement('a');object.className='scanned-object';
      object.href='https://www.instagram.com/'+handle+'/';object.target='_blank';object.rel='noopener noreferrer';
      object.setAttribute('aria-label',(kind==='petal'?'꽃잎':'열쇠')+' — Instagram @'+handle);object.title='@'+handle;
      object.dataset.depth='1';object.dataset.kind=kind;object.dataset.object=asset.id;object.dataset.visible='1';
      Object.assign(object.style,{left:(best.x-width/2+marginX)+'px',top:(best.y-height/2+marginY)+'px',width:width+'px',height:height+'px',zIndex:'56'});
      object.style.setProperty('--rotation',angle+'deg');object.style.setProperty('--parallax','1');
      const img=document.createElement('img');img.src=asset.src;img.alt='';img.draggable=false;img.decoding='async';img.fetchPriority='high';
      object.append(img);surface.append(object);
    }
    return placed.length;
  }

  function scannerGrain(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=240;
    const ctx=canvas.getContext('2d'), pixels=ctx.createImageData(240,240), rand=randomGenerator(913742);
    for(let i=0;i<pixels.data.length;i+=4){
      const value=Math.round(40+rand()*176);
      pixels.data[i]=value;pixels.data[i+1]=value;pixels.data[i+2]=value+1;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    document.querySelector('.grain').style.backgroundImage='url('+canvas.toDataURL()+')';
  }
  document.getElementById('rescan').addEventListener('click',()=>layout());
  window.addEventListener('keydown',event=>{if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key.toLowerCase()==='r')layout();});
  window.addEventListener('resize',()=>{clearTimeout(layoutTimer);layoutTimer=setTimeout(()=>layout(false),100);});
  window.scanGallery={reshuffle:()=>layout(), getState:()=>({seed,generation,assets:assets.map(a=>({...a})),filters:[...filters],objects:objectAssets.map(a=>({...a}))})};
  scannerGrain();
  layout();
})();

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
