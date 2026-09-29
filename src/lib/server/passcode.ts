import { createHash, timingSafeEqual } from "node:crypto";

// 길이가 달라도 같은 크기로 만들기 위해 해시를 비교한다 (길이도 새지 않음)
const digest = (s: string) => createHash("sha256").update(s.normalize("NFC"), "utf8").digest();

/**
 * 상수 시간 암호 비교 (spec §7.1). 문자열이 아니거나 정답이 비었으면 false.
 * 한글은 NFC로 맞춘 뒤 UTF-8 바이트로 비교한다. 암호는 로그에 남기지 않는다.
 */
export function passcodeMatches(input: unknown, expected: string): boolean {
  if (typeof input !== "string" || expected.length === 0) return false;
  return timingSafeEqual(digest(input), digest(expected));
}
