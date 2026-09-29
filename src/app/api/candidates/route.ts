// 서버 전용 라우트: 요리 후보 생성 (spec §7.2). AI 키·암호는 서버 환경 변수에서만 읽는다.
import { handleCandidates } from "@/lib/server/handlers";

export const runtime = "nodejs";
/** 서버 기능 최대 실행 시간(초) — 요청 예산 약 50초 + 여유 */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  return handleCandidates(request, process.env);
}
