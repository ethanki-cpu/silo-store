// EPIC-113: 이미지를 구 표면에 "균등하게, 충돌 없이" 배치하기 위한
// 피보나치 구면(Fibonacci sphere) 알고리즘 — 위도(y)를 -1..1로 균등
// 분할하고, 매 점마다 황금각(golden angle)만큼 경도(theta)를 회전시켜
// 점들이 나선형으로 고르게 퍼지도록 한다. N개의 점이 있을 때 이웃 점 간
// 최소 거리가 가장 커지는(밀집/충돌이 없는) 배치로 잘 알려져 있다.
export function fibonacciSphere(count: number, radius: number): [number, number, number][] {
  if (count <= 0) return [];
  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push([x * radius, y * radius, z * radius]);
  }
  return points;
}
