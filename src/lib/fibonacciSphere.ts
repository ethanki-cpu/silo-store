// EPIC-113: 이미지를 구 표면에 "균등하게, 충돌 없이" 배치하기 위한
// 피보나치 구면(Fibonacci sphere) 알고리즘 — 위도(y)를 -1..1로 균등
// 분할하고, 매 점마다 황금각(golden angle)만큼 경도(theta)를 회전시켜
// 점들이 나선형으로 고르게 퍼지도록 한다. N개의 점이 있을 때 이웃 점 간
// 최소 거리가 가장 커지는(밀집/충돌이 없는) 배치로 잘 알려져 있다.
//
// HOTFIX-121 버그 수정(사용자 신고 — "venus de milo가 안 나오는데?"):
// `y = 1 - (i/(count-1))*2` 식은 i=0/count-1일 때 정확히 y=±1(양극점)에
// 점을 찍는다 — count가 클 때는(게시글 마커 등) 다수 중 2개일 뿐이라
// 안 보였지만, count가 작을 때(장식 오브젝트 2개, 내핵 카테고리 4개)는
// 전체 점의 절반이 남극/북극에 겹쳐 찍히는 심하게 치우친 배치가 됐다 —
// 사용자가 정면에서 보는 적도 부근에는 아무것도 안 뜨는 원인 중 하나였다.
// 각 구간을 절반씩 밀어(offset) 정확한 극점을 피하는 표준 변형으로 교체.
export function fibonacciSphere(count: number, radius: number): [number, number, number][] {
  if (count <= 0) return [];
  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * i + 1) / count;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push([x * radius, y * radius, z * radius]);
  }
  return points;
}
