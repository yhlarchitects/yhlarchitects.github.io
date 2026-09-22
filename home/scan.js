(() => {
  'use strict';
  const assets = PHOTO-CATALOG;
  const objectAssets = OBJECT-CATALOG;
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
