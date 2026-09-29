"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestCandidates } from "@/lib/api";
import { avoidNames, emptyBoard, markShown, newBoard, nextAction, recheck, remaining, type BoardState } from "@/lib/board";
import { LIST_LIMIT } from "@/lib/presets";
import { pickUniformIndex } from "@/lib/random";
import {
  clearPasscode,
  isFavorite,
  NOTICE_TEXT,
  removeFavorite,
  setPasscode,
  setServings,
  toggleFavorite,
  type Settings,
  type Update,
} from "@/lib/settings";
import { loadSettings, saveSettings } from "@/lib/storage";
import type { Conditions, Favorite, Recipe } from "@/lib/types";
import RouletteWheel from "./RouletteWheel";
import ExclusionSection from "./ExclusionSection";
import FavoriteModal from "./FavoriteModal";
import FavoritesList from "./FavoritesList";
import PasscodeGate from "./PasscodeGate";
import RecipeCard from "./RecipeCard";
import ServingsPicker from "./ServingsPicker";
import TagPicker from "./TagPicker";
import Toast, { type ToastState } from "./Toast";
import styles from "./ui.module.css";

/** 룰렛·결과 영역의 단계 */
type Phase = "idle" | "loading" | "spinning" | "result" | "empty" | "error";

type Spin = { recipes: Recipe[]; winner: number | null; key: number };

const MSG_ONE = "후보가 하나뿐이에요";
const MSG_NONE = "조건에 맞는 요리를 못 찾았어요. 재료를 더 고르거나 제외를 줄여 보세요.";
const MSG_RETRY = "레시피를 못 가져왔어요. 다시 시도해 주세요";
const MSG_PROBLEM = "문제가 생겼어요";

const conditionsOf = (s: Settings): Conditions => ({
  ingredients: s.selectedIngredients,
  seasonings: s.ownedSeasonings,
  exclusions: s.exclusions,
});

const sameConditions = (a: Settings, b: Settings) =>
  a.selectedIngredients === b.selectedIngredients &&
  a.ownedSeasonings === b.ownedSeasonings &&
  a.exclusions === b.exclusions;

/** 한 페이지 앱 전체 흐름 (spec §5) */
export default function FridgeApp() {
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  const [expired, setExpired] = useState(false);

  // 후보판·현재 결과는 메모리에만 (spec §5.7)
  const [board, setBoardState] = useState<BoardState>(emptyBoard);
  const boardRef = useRef<BoardState>(board);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageMsg, setStageMsg] = useState<string | null>(null);
  const [result, setResult] = useState<Recipe | null>(null);
  const [spin, setSpin] = useState<Spin>({ recipes: [], winner: null, key: 0 });
  const [openFav, setOpenFav] = useState<Favorite | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const toastId = useRef(0);
  const stageRef = useRef<HTMLElement | null>(null);

  // 기기 저장값은 브라우저에서만 읽는다 (하이드레이션 불일치 방지)
  useEffect(() => {
    const s = loadSettings();
    settingsRef.current = s;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsState(s);
  }, []);

  useEffect(() => {
    if (phase === "loading" || phase === "result") {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase, result]);

  const showToast = useCallback((text: string) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);

  const commitBoard = (b: BoardState) => {
    boardRef.current = b;
    setBoardState(b);
  };

  /** 설정 변경: 즉시 저장, 안내 표시, 조건이 바뀌면 후보판 재검사 (spec §5.8) */
  const apply = (u: Update) => {
    const prev = settingsRef.current;
    const next = u.settings;
    if (u.notice) showToast(NOTICE_TEXT[u.notice]);
    if (prev === next) return;
    settingsRef.current = next;
    setSettingsState(next);
    saveSettings(next);
    if (prev && !sameConditions(prev, next)) commitBoard(recheck(boardRef.current, conditionsOf(next)));
  };

  const busy = phase === "loading" || phase === "spinning";

  /** 결과로 보여주고 "나온 것"으로 표시 */
  const show = (r: Recipe) => {
    commitBoard(markShown(boardRef.current, r.id));
    setResult(r);
    setPhase("result");
  };

  /** 남은 후보로 룰렛/바로 결과/빈 판 (spec §5.6, §5.7) */
  const play = (b: BoardState, fresh: boolean) => {
    const rem = remaining(b);
    const action = nextAction(b);
    if (action.kind === "spin") {
      setStageMsg(null);
      setSpin((s) => ({ recipes: rem, winner: pickUniformIndex(rem.length), key: s.key + 1 }));
      setPhase("spinning");
    } else if (action.kind === "direct") {
      setStageMsg(MSG_ONE);
      show(rem[0]);
    } else {
      setStageMsg(fresh ? MSG_NONE : null);
      setPhase("empty");
    }
  };

  const onLanded = (i: number) => {
    const r = spin.recipes[i];
    if (r) show(r);
  };

  /** 새 후보 요청 — 이번 사용 중 판에 올랐던 이름을 피할 이름으로 보낸다 */
  const fetchNew = async () => {
    const s = settingsRef.current;
    if (busy || !s || !s.passcode || s.selectedIngredients.length === 0) return;
    const before = phase;
    setPhase("loading");
    setStageMsg(null);
    const out = await requestCandidates({
      passcode: s.passcode,
      ingredients: s.selectedIngredients,
      seasonings: s.ownedSeasonings,
      exclusions: s.exclusions,
      servings: s.servings,
      avoidDishNames: avoidNames(boardRef.current),
    });
    const cur = settingsRef.current ?? s;
    switch (out.kind) {
      case "unauthorized":
        apply(clearPasscode(cur));
        setExpired(true);
        setPhase(result ? "result" : "idle");
        return;
      case "retry":
        setStageMsg(MSG_RETRY);
        setPhase("error");
        return;
      case "problem":
        showToast(MSG_PROBLEM);
        setPhase(before === "result" && result ? "result" : "idle");
        return;
      case "ok": {
        // 기다리는 동안 조건이 바뀌었을 수 있으니 지금 조건으로 한 번 더 검사
        const b = recheck(newBoard(boardRef.current, out.candidates), conditionsOf(cur));
        commitBoard(b);
        play(b, true);
      }
    }
  };

  if (!settings) {
    return (
      <main className={styles.loadingScreen} aria-busy="true">
        불러오는 중…
      </main>
    );
  }

  if (!settings.passcode) {
    return (
      <PasscodeGate
        expired={expired}
        onVerified={(pw) => {
          setExpired(false);
          apply(setPasscode(settingsRef.current ?? settings, pw));
        }}
      />
    );
  }

  const have = { ingredients: settings.selectedIngredients, seasonings: settings.ownedSeasonings };
  const action = nextAction(board);
  const remainCount = remaining(board).length;
  const canSpin = settings.selectedIngredients.length > 0 && !busy;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>🍳 냉장고 파먹기 룰렛</h1>
        <p className={styles.subtitle}>있는 재료로 15분 컷 요리를 골라 드려요</p>
      </header>

      <section className={styles.section} aria-labelledby="sec-ing">
        <h2 id="sec-ing" className={styles.sectionTitle}>
          🥬 냉장고 재료
          <span className={styles.count}>
            {settings.selectedIngredients.length}/{LIST_LIMIT}
          </span>
        </h2>
        <p className={styles.hint}>지금 냉장고에 있는 걸 눌러 주세요.</p>
        <TagPicker settings={settings} kind="ingredient" onUpdate={apply} />
      </section>

      <section className={styles.section} aria-labelledby="sec-sea">
        <details className={styles.details}>
          <summary>
            <h2 id="sec-sea" className={styles.sectionTitle}>
              🧂 보유 양념
              <span className={styles.count}>{settings.ownedSeasonings.length}개 있음</span>
            </h2>
          </summary>
          <div className={styles.detailsBody}>
            <p className={styles.hint}>집에 있는 양념을 체크해 주세요.</p>
            <TagPicker settings={settings} kind="seasoning" onUpdate={apply} />
          </div>
        </details>
      </section>

      <ExclusionSection settings={settings} onUpdate={apply} />

      <section className={styles.section} aria-labelledby="sec-serv">
        <h2 id="sec-serv" className={styles.sectionTitle}>
          🍽️ 몇 인분?
        </h2>
        <ServingsPicker value={settings.servings} onChange={(n) => apply(setServings(settings, n))} />
      </section>

      <div>
        <button type="button" className={styles.bigBtn} disabled={!canSpin} onClick={() => void fetchNew()}>
          🎡 오늘은 뭘 먹을까? 돌리기
        </button>
        {settings.selectedIngredients.length === 0 && (
          <p className={styles.suggest} style={{ marginTop: 8 }}>
            냉장고 재료를 1개 이상 골라 주세요
          </p>
        )}
      </div>

      {phase !== "idle" && (
        <section ref={stageRef} className={styles.stage} aria-label="룰렛과 결과" aria-busy={busy}>
          {(phase === "loading" || phase === "spinning") && (
            <>
              <RouletteWheel
                labels={spin.recipes.map((r) => r.name)}
                winnerIndex={phase === "spinning" ? spin.winner : null}
                spinKey={phase === "spinning" ? spin.key : 0}
                onLanded={onLanded}
                loading={phase === "loading"}
              />
              <p className={styles.stageText}>
                {phase === "loading" ? "레시피 후보를 고르는 중이에요…" : "두근두근… 뭐가 나올까요?"}
              </p>
            </>
          )}

          {stageMsg && <p className={styles.message}>{stageMsg}</p>}

          {(phase === "empty" || phase === "error") && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={!canSpin}
              onClick={() => void fetchNew()}
            >
              {phase === "empty" && !stageMsg ? "새 후보 받기" : "다시 시도"}
            </button>
          )}

          {phase === "result" && result && (
            <div style={{ width: "100%" }}>
              <RecipeCard
                recipe={result}
                servings={settings.servings}
                onServingsChange={(n) => apply(setServings(settings, n))}
                have={have}
                favorite={isFavorite(settings, result.id)}
                onToggleFavorite={() => {
                  const saved = isFavorite(settings, result.id);
                  apply(toggleFavorite(settings, result, settings.servings));
                  showToast(saved ? "즐겨찾기에서 뺐어요" : "즐겨찾기에 담았어요");
                }}
                onToast={showToast}
                kicker="오늘의 메뉴는!"
                headingId="result-title"
              >
                {remainCount > 0 && (
                  <button type="button" className={styles.btn} disabled={busy} onClick={() => play(boardRef.current, false)}>
                    🔄 다시 돌리기
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.btn} ${action.suggestNew ? styles.btnPrimary : ""}`}
                  disabled={!canSpin}
                  onClick={() => void fetchNew()}
                >
                  ✨ 새 후보 받기
                </button>
              </RecipeCard>
              {action.suggestNew && (
                <p className={styles.suggest} style={{ marginTop: 8 }}>
                  {remainCount === 0 ? "후보를 다 봤어요." : "남은 후보가 하나예요."} 새 후보를 받아 볼까요?
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <FavoritesList
        favorites={settings.favorites}
        onOpen={setOpenFav}
        onRemove={(id) => apply(removeFavorite(settings, id))}
      />

      {openFav && (
        <FavoriteModal
          key={openFav.recipe.id}
          favorite={openFav}
          isSaved={isFavorite(settings, openFav.recipe.id)}
          have={have}
          onToggleFavorite={(n) => apply(toggleFavorite(settings, openFav.recipe, n))}
          onClose={() => setOpenFav(null)}
          onToast={showToast}
        />
      )}

      <Toast toast={toast} onDone={hideToast} />
    </main>
  );
}
