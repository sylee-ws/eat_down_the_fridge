// 서버 전용 라우트: 가족 암호 확인. 암호는 서버 환경 변수에서만 읽는다.
import { handleVerifyPasscode } from "@/lib/server/handlers";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleVerifyPasscode(request, process.env);
}
