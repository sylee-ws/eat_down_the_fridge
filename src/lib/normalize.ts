/** 이름 정규화: 앞뒤 공백 제거 + 내부 공백 모두 제거 */
export function norm(s: string): string {
  return s.replace(/\s+/g, "");
}
