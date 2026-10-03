export const elements = {
  wood: {name:"목", han:"木", title:"자라는 방", line:"조금씩 바뀌어도 편안한 공간", colors:["#355D4F","#CFD9B7","#E8D9C5"], material:"나무의 결, 초록의 작은 면적", ritual:"눈이 자주 닿는 한 자리에 나무 질감이나 초록색 물건을 모아보세요."},
  fire: {name:"화", han:"火", title:"온기를 모으는 방", line:"머무르고 싶은 한 장면", colors:["#A44732","#EAB776","#EFE1D1"], material:"작은 따뜻한 색, 부드러운 직물", ritual:"이미 가진 따뜻한 색의 물건 하나를 방의 작은 중심으로 삼아보세요."},
  earth: {name:"토", han:"土", title:"돌아오는 방", line:"흩어진 하루가 제자리를 찾는 곳", colors:["#876A4C","#C5AD87","#E9E2D5"], material:"흙빛, 무광의 차분한 표면", ritual:"자주 쓰는 물건 세 개에 돌아갈 자리를 정해보세요."},
  metal: {name:"금", han:"金", title:"여백이 있는 방", line:"좋아하는 것이 더 잘 보이도록", colors:["#59616A","#B9C2CA","#F1F2EE"], material:"깨끗한 선, 은은한 회색", ritual:"가장 좋아하는 물건 옆을 비워 그 물건이 더 잘 보이게 해보세요."},
  water: {name:"수", han:"水", title:"고요가 흐르는 방", line:"오늘의 속도를 천천히 낮추는 곳", colors:["#203D62","#7D9FAB","#E2E8E7"], material:"짙은 파랑의 작은 면적, 부드러운 겹", ritual:"기존의 푸른 물건이나 천 하나로 시선이 쉬는 지점을 만들어보세요."}
};
const allowed={element:Object.keys(elements),concern:["rest","focus","clutter"],light:["low","bright"],scope:["rental","flexible"],budget:["zero","small","medium"]};
export function buildReport(input){
  for(const [key,values] of Object.entries(allowed)) if(!values.includes(input[key])) throw new Error("선택 내용을 다시 확인해주세요.");
  const theme=elements[input.element];
  const first={
    rest:["침대에서 보이는 일을 줄이세요","누운 자리에서 업무 물건이 보인다면, 오늘 밤에는 상자나 가방 한곳에 모아 시야 밖에 두세요. 잠이 좋아진다는 보장은 없지만 쉬는 자리와 일하는 자리를 구분할 수 있습니다."],
    focus:["책상 한 칸을 비워보세요","지금 하는 일에 필요한 물건만 손이 닿는 범위에 남기고, 나머지는 한곳으로 옮겨보세요. 콘센트와 통로를 가리지 않는 자리에서 시험하세요."],
    clutter:["새 수납장보다 빈 면 하나","가장 어수선한 상판 하나를 고르세요. 매일 쓰는 것만 남기고 나머지를 기존 상자에 모아 7일 동안 실제로 꺼내는지 확인해보세요."]
  }[input.concern];
  const second=input.light==="low"?
    ["어두운 방에는 밝은 면을","창 앞을 가리는 작은 물건을 치우고, 이미 가진 밝은 천이나 종이를 책상 일부에 놓아보세요. 조명을 새로 살 때는 눈에 직접 비치지 않는지 먼저 확인하세요."] :
    ["빛을 가리기 전에 눈부심부터","앉는 자리에서 창이나 화면 반사가 눈부신지 확인하세요. 커튼을 조절하거나 작은 물건의 위치를 바꿔보고, 가구를 움직일 때는 통로를 먼저 확보하세요."];
  const third=input.budget==="zero"?
    ["오늘은 아무것도 사지 마세요",theme.ritual+" 새 물건을 들이기 전에 기존 물건의 자리와 조합만 바꿔보세요."]:
    input.budget==="small"?
    ["작은 직물 하나만 비교하세요",theme.material+"을 참고해 쿠션 커버나 작은 패브릭 하나만 비교해보세요. 3만 원은 구매 상한이며 가격 확인 전 견적이 아닙니다. 이미 가진 것으로도 충분합니다."]:
    ["큰 가구보다 작은 변화부터",theme.material+"을 참고하되, 먼저 기존 물건으로 조합을 시험해보세요. 실제 가격·치수·반품 조건을 확인한 뒤 10만 원 안에서 필요한 것 하나만 결정하세요."];
  return {
    ...theme, input:{...input}, actions:[first,second,third],
    constraint:input.scope==="rental"?"임차 공간에서는 벽 타공·전기 작업 없이 옮길 수 있는 물건으로만 바꿔보세요.":"가구 이동 전 문 열림·통로·콘센트·가구 안정성을 확인하세요. 구조·전기 작업은 이 제안에 포함되지 않습니다.",
    basis:"오행은 사용자가 고른 이야기의 테마입니다. 실제 사주·용신 계산이나 운세 예측 결과가 아닙니다. 공간 제안은 선택한 고민·채광·예산·변경 범위에서 나옵니다."
  };
}
export function reportText(r){
 return ["방결 · "+r.title,r.line,"",...r.actions.map((a,i)=>(i+1)+". "+a[0]+"\n"+a[1]),"",r.constraint,"",r.basis].join("\n");
}

