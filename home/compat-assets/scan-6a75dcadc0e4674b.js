(() => {
  'use strict';
  const assets = [{"src": "assets/photo-0da4a8752b7e75a5.webp", "title": "chamber aerial", "ratio": 0.670625}, {"src": "assets/photo-f3ccd599fd3ce562.webp", "title": "chamber court", "ratio": 0.670625}, {"src": "assets/photo-b19de194ec98606c.webp", "title": "chamber facade", "ratio": 0.670625}, {"src": "assets/photo-3550ecd2e952c1ab.webp", "title": "crown detail", "ratio": 1.4911463187325256}, {"src": "assets/photo-2ff6b045c854fe4b.webp", "title": "garden seats", "ratio": 1.490566037735849}, {"src": "assets/photo-53e13430716f7d90.webp", "title": "garden walk", "ratio": 1.4911463187325256}, {"src": "assets/photo-5558d70169f8aa91.webp", "title": "project 1004", "ratio": 0.6525}];
  const objectAssets = [
    {id:'rose-petal',kind:'petal',src:'assets/rose-petal-89a96dc340f8424f.webp',ratio:1},
    {id:'white-petal',kind:'petal',src:'assets/white-petal-99914f85702549a5.webp',ratio:1},
    {id:'blue-tulip-petal',kind:'petal',src:'assets/blue-tulip-petal-14887f3ca29d4431.webp',ratio:1},
    {id:'silver-key',kind:'key',src:'assets/silver-key-cd901d891b0d5be6.webp',ratio:.8},
    {id:'brass-key',kind:'key',src:'assets/brass-key-62e3ce816b7d37f9.webp',ratio:.8}
  ];
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
    const rand=randomGenerator(seed), W=innerWidth, H=innerHeight, mobile=W<620;
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
          width:width+'px',height:height+'px',transform:`rotate(${rotation}deg)`,
          zIndex:String((6-depth)*10+local)
        });
        const focusAngle=Math.round(rand()*360);
        figure.style.setProperty('--focus-angle',focusAngle+'deg');
        figure.style.setProperty('--focus-blur',focusBlur.toFixed(2)+'px');
        figure.style.setProperty('--edge',(edge+focusBlur*.6).toFixed(2)+'px');
        figure.style.setProperty('--bloom',(edge*2+focusBlur).toFixed(2)+'px');
        figure.style.setProperty('--lift',(edge*1.5+focusBlur).toFixed(2)+'px');
        figure.style.setProperty('--drift-x',((rand()-.5)*edge*1.3).toFixed(2)+'px');
        figure.style.setProperty('--drift-y',((rand()-.5)*edge*1.3).toFixed(2)+'px');
        figure.dataset.focus=String(focusAngle);
        ['mist','defocus','focus','fringe'].forEach((kind,layer)=>{
          const img=document.createElement('img');img.src=asset.src;img.alt=layer===2?asset.title:'';
          img.className='layer '+kind;img.draggable=false;img.decoding='async';
          if(layer!==2)img.setAttribute('aria-hidden','true');figure.append(img);
        });
        const grid=document.createElement('div');grid.className='scan-grid';grid.setAttribute('aria-hidden','true');figure.append(grid);
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
    const amount=generation===1?2:(rand()<.45?1:2);
    const petals=objectAssets.filter(a=>a.kind==='petal'), keys=objectAssets.filter(a=>a.kind==='key');
    const pick=list=>list[Math.floor(rand()*list.length)];
    const chosen=amount===2?shuffle([pick(petals),pick(keys)],rand):[pick(objectAssets)];
    const placed=[];
    chosen.forEach((asset,index)=>{
      let depth=amount===2?index+1:(rand()<.5?1:2);
      const length=asset.kind==='petal'?
        (mobile?W*(.25+rand()*.08):Math.min(W*(.11+rand()*.025),H*.28)):
        (mobile?W*(.33+rand()*.09):Math.min(W*(.15+rand()*.025),H*.38));
      const width=asset.ratio>=1?length:length*asset.ratio;
      const height=asset.ratio>=1?length/asset.ratio:length;
      const angle=rand()*360-180, radians=angle*Math.PI/180;
      const boundW=Math.abs(width*Math.cos(radians))+Math.abs(height*Math.sin(radians));
      const boundH=Math.abs(height*Math.cos(radians))+Math.abs(width*Math.sin(radians));
      const candidates=Array.from({length:36},()=>({
        x:clamp((.09+rand()*.82)*W,boundW/2+12,W-boundW/2-12),
        y:clamp((.14+rand()*.69)*H,boundH/2+84,H-85-boundH/2)
      }));
      function evaluate(candidate,z){
        let visible=0,empty=0;
        for(const [dx,dy] of [[0,0],[-.3,0],[.3,0],[0,-.3],[0,.3],[-.22,-.22],[.22,.22]]){
          const top=document.elementsFromPoint(candidate.x+dx*boundW,candidate.y+dy*boundH).find(el=>el.classList.contains('print'));
          if(!top||+top.style.zIndex<z)visible++;
          if(!top)empty++;
        }
        const crowd=placed.some(p=>Math.hypot(p.x-candidate.x,p.y-candidate.y)<(p.size+Math.max(boundW,boundH))*.6);
        const logo=candidate.x-boundW/2<(mobile?185:295)&&candidate.y-boundH/2<100;
        return {visible:visible/7,score:visible*10+empty*.4-(crowd?55:0)-(logo?70:0)};
      }
      let z=depth===1?56+index:46+index;
      let best=candidates.map(c=>({...c,...evaluate(c,z)})).sort((a,b)=>b.score-a.score)[0];
      // A decoration must remain perceptible; lift it to the front if photographs hide it.
      if(best.visible<.7){depth=1;z=56+index;best=candidates.map(c=>({...c,...evaluate(c,z)})).sort((a,b)=>b.score-a.score)[0];}
      const object=document.createElement('div');object.className='scanned-object';
      object.dataset.depth=String(depth);object.dataset.kind=asset.kind;object.dataset.object=asset.id;
      object.dataset.visible=best.visible.toFixed(2);object.setAttribute('aria-hidden','true');
      Object.assign(object.style,{
        left:(best.x-width/2+marginX)+'px',top:(best.y-height/2+marginY)+'px',
        width:width+'px',height:height+'px',transform:`rotate(${angle}deg)`,zIndex:String(z)
      });
      object.style.setProperty('--object-blur',depth===1?'.12px':(mobile?'1.25px':'2.4px'));
      const img=document.createElement('img');img.src=asset.src;img.alt='';img.draggable=false;img.decoding='async';
      object.append(img);surface.append(object);
      placed.push({...best,size:Math.max(boundW,boundH)});
    });
    return amount;
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
  async function init(){
    await Promise.all([...assets,...objectAssets].map(asset=>new Promise(resolve=>{
      const img=new Image();img.onload=()=>{asset.ratio=img.naturalWidth/img.naturalHeight;resolve();};img.onerror=resolve;img.src=asset.src;
    })));
    layout();
  }
  document.getElementById('rescan').addEventListener('click',()=>layout());
  window.addEventListener('keydown',event=>{if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key.toLowerCase()==='r')layout();});
  window.addEventListener('resize',()=>{clearTimeout(layoutTimer);layoutTimer=setTimeout(()=>layout(false),100);});
  window.scanGallery={reshuffle:()=>layout(), getState:()=>({seed,generation,assets:assets.map(a=>({...a})),filters:[...filters],objects:objectAssets.map(a=>({...a}))})};
  scannerGrain();
  init();
})();
