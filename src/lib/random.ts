/** 0 이상 n 미만 정수를 균등 확률로 뽑는다 (룰렛 당첨) */
export function pickUniformIndex(n: number, rand: () => number = secureRandom): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  return Math.min(n - 1, Math.floor(rand() * n));
}

function secureRandom(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}
