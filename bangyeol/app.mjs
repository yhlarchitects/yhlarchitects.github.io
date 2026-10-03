import {buildReport,reportText,elements} from "./engine.mjs";
const q=id=>document.getElementById(id);
const form=q("roomForm");let current=null;
function input(){return Object.fromEntries(new FormData(form));}
function preview(r){
 q("resultTitle").textContent=r.title;q("resultElement").textContent=r.han;q("resultLine").textContent=r.line;q("material").textContent=r.material;
 q("swatches").replaceChildren(...r.colors.map(color=>{const el=document.createElement("div");el.className="swatch";el.style.backgroundColor=color;el.setAttribute("title",color);return el;}));
}
function render(r){
 current=r;preview(r);q("before").hidden=true;q("reportBody").hidden=false;q("resultState").textContent="02 / 나의 방 제안";
 q("actions").replaceChildren(...r.actions.map(([title,body])=>{const li=document.createElement("li"),h=document.createElement("h3"),p=document.createElement("p");h.textContent=title;p.textContent=body;li.append(h,p);return li;}));
 q("constraint").textContent=r.constraint;q("status").textContent="";
}
preview(elements.wood);
form.addEventListener("submit",event=>{event.preventDefault();try{render(buildReport(input()));q("formError").textContent="";q("result").focus({preventScroll:true});if(matchMedia("(max-width:760px)").matches)q("result").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth",block:"start"});}catch(error){q("formError").textContent=error.message;}});
form.addEventListener("change",()=>{if(current){current=null;q("before").textContent="선택이 바뀌었어요. 버튼을 눌러 새 제안을 확인해주세요.";q("before").hidden=false;q("reportBody").hidden=true;q("resultState").textContent="02 / 새 제안 대기";}});
q("copy").onclick=async()=>{if(!current)return;try{await navigator.clipboard.writeText(reportText(current));q("status").textContent="글을 복사했습니다.";}catch{q("status").textContent="이 브라우저에서는 자동 복사를 지원하지 않습니다. 화면의 글을 선택해 복사해주세요.";}};
q("keep").onclick=()=>{if(!current)return;try{localStorage.setItem("bangyeol-room-v1",JSON.stringify(current.input));q("status").textContent="이 기기에 보관했습니다. ‘처음부터’를 누르면 지워집니다.";}catch{q("status").textContent="이 브라우저에서는 보관할 수 없습니다. 카드 저장을 이용해주세요.";}};
q("reset").onclick=()=>{form.reset();current=null;try{localStorage.removeItem("bangyeol-room-v1");}catch{}preview(elements.wood);q("before").textContent="방의 조건을 고르면 오늘 해볼 세 가지를 보여드려요.";q("before").hidden=false;q("reportBody").hidden=true;q("resultState").textContent="02 / 결과 예시";q("formError").textContent="";form.querySelector("input").focus();};
q("saveCard").onclick=()=>{
 if(!current)return;
 const c=document.createElement("canvas");c.width=1080;c.height=1350;const x=c.getContext("2d");
 x.fillStyle="#eef2ee";x.fillRect(0,0,c.width,c.height);x.fillStyle="#192a43";x.font="bold 44px sans-serif";x.fillText("방결  /  ROOM NOTE",76,110);
 x.font="bold 78px sans-serif";x.fillText(current.title,76,300);x.font="32px sans-serif";x.fillText(current.line,76,373);
 current.colors.forEach((v,i)=>{x.fillStyle=v;x.fillRect(76+i*309,446,295,110);});
 x.fillStyle="#192a43";x.font="bold 34px sans-serif";
 current.actions.forEach((a,i)=>{x.fillText("0"+(i+1)+"  "+a[0],76,690+i*110);});
 x.font="25px sans-serif";x.fillStyle="#4c5b50";x.fillText("내 방의 작은 변화, 오늘 하나부터.",76,1110);x.fillText("직접 고른 오행 테마 · 사주 계산 전 체험판",76,1190);x.fillText("운세·건강·재산의 변화를 보장하지 않습니다.",76,1235);
 c.toBlob(blob=>{if(!blob){q("status").textContent="카드를 만들지 못했습니다. 글 복사를 이용해주세요.";return;}const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="방결-"+current.input.element+"-방카드.png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);q("status").textContent="카드를 저장했습니다. 브라우저 다운로드를 확인해주세요.";});
};
function showInfo(title,paragraphs){q("infoTitle").textContent=title;q("infoBody").replaceChildren(...paragraphs.map(text=>{const p=document.createElement("p");p.textContent=text;return p;}));q("info").showModal();}
q("about").onclick=()=>showInfo("방결의 첫 체험판",["‘사주로 보는 내 집·내 방’이라는 상품을 준비하며, 방에 관한 제안이 실제로 쓸모 있는지 먼저 확인하는 체험 화면입니다.","현재는 직접 고른 오행 테마와 방의 조건으로 제안을 만듭니다. 실제 사주·용신 계산, 생년월일 해석, AI 맞춤 생성, 결제, 앱스토어 출시는 제공하지 않습니다.","사진은 공통 분위기 예시입니다. 입력한 방을 촬영하거나 재현한 결과가 아닙니다. 방결은 가칭이며 상표 사용 가능성은 아직 확인되지 않았습니다."]);
q("privacy").onclick=()=>showInfo("체험판 개인정보 안내",["이 체험판은 생년월일·이름·사진·결제정보를 받지 않습니다. 고른 방의 조건은 브라우저 안에서만 처리합니다.","‘이 기기에 보관’을 누른 경우에만 방의 조건이 해당 브라우저에 남습니다. ‘처음부터’를 누르면 이 앱이 보관한 조건을 지웁니다. 다른 기기에서는 이어서 볼 수 없습니다.","웹으로 배포되는 경우 접속 제공업체가 접속 기록을 처리할 수 있습니다. 현재 앱에는 방문 통계·광고·외부 AI 전송 기능이 없습니다. 유료 서비스의 처리방침은 판매자와 처리업체 확정 후 별도로 마련합니다."]);
q("closeInfo").onclick=()=>q("info").close();
try{const saved=JSON.parse(localStorage.getItem("bangyeol-room-v1"));if(saved){const r=buildReport(saved);for(const [key,value]of Object.entries(saved)){const el=form.elements.namedItem(key);el.value=value;}render(r);q("status").textContent="이 기기에 보관한 방을 불러왔습니다.";}}catch{try{localStorage.removeItem("bangyeol-room-v1");}catch{}}

