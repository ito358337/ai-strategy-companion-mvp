const STORAGE_KEY = "ai-strategy-companion:mvp-light:session";
const QUESTION_FILES = {
  strategy: "./src/data/question-bank/strategy.json",
  tactics: "./src/data/question-bank/tactics.json",
  promotion: "./src/data/question-bank/promotion.json",
  experience: "./src/data/question-bank/experience.json",
  philosophy: "./src/data/question-bank/philosophy.json",
};

const app = document.querySelector("#app");

let questionBank = null;
let state = null;
let saveTimer = null;

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} を読み込めませんでした`);
  return response.json();
}

async function loadQuestionBank() {
  const categories = await loadJson("./src/data/categories.json");
  const chapters = await Promise.all(
    categories.map(async (category, index) => ({
      category,
      order: index + 1,
      questions: await loadJson(QUESTION_FILES[category.id]),
    }))
  );

  return {
    title: "AI経営伴走アプリ",
    version: "MVPライト版",
    chapters,
  };
}

function createSession() {
  const firstChapter = questionBank.chapters[0];
  const firstQuestion = firstChapter.questions[0];
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: `戦略設計セッション ${new Date().toLocaleDateString("ja-JP")}`,
    status: "in_progress",
    currentChapter: firstChapter.category.id,
    currentQuestionId: firstQuestion.id,
    answers: {},
    summaries: {},
    createdAt: now,
    updatedAt: now,
  };
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSession();
    return { ...createSession(), ...JSON.parse(raw) };
  } catch {
    return createSession();
  }
}

function persistSession(feedback = true) {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (feedback) showSaveState("保存しました");
  } catch {
    showSaveState("この環境では自動保存できません");
  }
}

function scheduleSave() {
  showSaveState("保存中...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistSession(true), 350);
}

function showSaveState(message) {
  const node = document.querySelector("[data-save-state]");
  if (node) node.textContent = message;
}

function getCurrentChapter() {
  return questionBank.chapters.find((chapter) => chapter.category.id === state.currentChapter);
}

function getCurrentQuestion() {
  return getAllQuestions().find((question) => question.id === state.currentQuestionId);
}

function getAllQuestions() {
  return questionBank.chapters.flatMap((chapter) => chapter.questions);
}

function getQuestionPosition(questionId = state.currentQuestionId) {
  const chapter = getCurrentChapter();
  const questionIndex = chapter.questions.findIndex((question) => question.id === questionId);
  return { chapter, questionIndex };
}

function getTotals() {
  const questions = getAllQuestions();
  const answered = questions.filter((question) => state.answers[question.id]?.answerText?.trim());
  return {
    total: questions.length,
    answered: answered.length,
    percent: questions.length === 0 ? 0 : Math.round((answered.length / questions.length) * 100),
  };
}

function getChapterProgress(chapter) {
  const answered = chapter.questions.filter((question) => state.answers[question.id]?.answerText?.trim());
  return {
    total: chapter.questions.length,
    answered: answered.length,
    completed: answered.length === chapter.questions.length,
  };
}

function setCurrentQuestion(chapterId, questionId) {
  state.currentChapter = chapterId;
  state.currentQuestionId = questionId;
  persistSession(false);
  render();
}

function moveQuestion(direction) {
  const { chapter, questionIndex } = getQuestionPosition();
  const nextIndex = questionIndex + direction;

  if (nextIndex >= 0 && nextIndex < chapter.questions.length) {
    setCurrentQuestion(chapter.category.id, chapter.questions[nextIndex].id);
    return;
  }

  const chapterIndex = questionBank.chapters.findIndex((item) => item.category.id === chapter.category.id);
  const nextChapter = questionBank.chapters[chapterIndex + direction];
  if (!nextChapter) return;

  const nextQuestion = direction > 0 ? nextChapter.questions[0] : nextChapter.questions[nextChapter.questions.length - 1];
  setCurrentQuestion(nextChapter.category.id, nextQuestion.id);
}

function saveAnswer(value) {
  const question = getCurrentQuestion();
  state.answers[question.id] = {
    questionId: question.id,
    answerText: value,
    aiDeepPrompt: value.trim().length > 0 && value.trim().length <= 20 ? question.level2 : "",
    updatedAt: new Date().toISOString(),
  };
  scheduleSave();
  updateDerivedUi(question);
}

function updateDerivedUi(question) {
  const answer = state.answers[question.id];
  const deepNode = document.querySelector("[data-deep-prompt]");
  if (deepNode) {
    deepNode.hidden = !answer?.aiDeepPrompt;
    deepNode.querySelector("p").textContent = answer?.aiDeepPrompt ?? "";
  }

  const totals = getTotals();
  document.querySelector("[data-total-answered]").textContent = `${totals.answered}/${totals.total}`;
  document.querySelector("[data-progress-bar]").style.width = `${totals.percent}%`;
  document.querySelector("[data-progress-label]").textContent = `${totals.percent}%`;
}

function generateChapterSummary(chapter) {
  const answered = chapter.questions
    .map((question) => ({ question, answer: state.answers[question.id]?.answerText?.trim() }))
    .filter((item) => item.answer);

  if (answered.length === 0) return "";

  const themes = [...new Set(answered.map((item) => item.question.theme))].slice(0, 4).join("・");
  const frameworks = [...new Set(answered.flatMap((item) => item.question.framework))].slice(0, 4).join(" / ");
  return `${chapter.category.name}では「${themes}」を中心に整理しました。関連フレームワークは ${frameworks} です。回答内容をもとに、次の章でより実行に近い問いへ進めます。`;
}

function completeChapter() {
  const chapter = getCurrentChapter();
  state.summaries[chapter.category.id] = generateChapterSummary(chapter);

  const allDone = getTotals().answered === getTotals().total;
  if (allDone) {
    state.status = "completed";
    state.summaries.all = "5章すべての回答が揃いました。経営の原点、販売導線、宣伝、顧客体験、哲学をつなげて90日アクションプランへ落とし込める状態です。";
  }

  persistSession(true);
  render();
}

function exportMarkdown() {
  const lines = [`# ${state.title}`, "", `- ステータス: ${state.status}`, `- 更新日時: ${new Date(state.updatedAt).toLocaleString("ja-JP")}`, ""];

  for (const chapter of questionBank.chapters) {
    lines.push(`## ${chapter.category.name}`, "");
    for (const question of chapter.questions) {
      const answer = state.answers[question.id]?.answerText?.trim() || "未回答";
      lines.push(`### ${question.id} ${question.theme} / ${question.subTheme}`, "");
      lines.push(`**Q.** ${question.level1}`, "");
      lines.push(`**A.** ${answer}`, "");
    }
    if (state.summaries[chapter.category.id]) {
      lines.push(`**章まとめ:** ${state.summaries[chapter.category.id]}`, "");
    }
  }

  if (state.summaries.all) {
    lines.push("## 全体まとめ", "", state.summaries.all, "");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "strategy-session.md";
  link.click();
  URL.revokeObjectURL(url);
}

function resetSession() {
  state = createSession();
  persistSession(true);
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderChapters() {
  return questionBank.chapters
    .map((chapter) => {
      const progress = getChapterProgress(chapter);
      const active = chapter.category.id === state.currentChapter;
      return `
        <button class="chapter-tab ${active ? "is-active" : ""}" data-action="chapter" data-chapter-id="${chapter.category.id}">
          <span>
            <strong>${chapter.order}. ${escapeHtml(chapter.category.name)}</strong>
            <small>${escapeHtml(chapter.category.description)}</small>
          </span>
          <em>${progress.answered}/${progress.total}</em>
        </button>
      `;
    })
    .join("");
}

function renderQuestionDots(chapter) {
  return chapter.questions
    .map((question, index) => {
      const active = question.id === state.currentQuestionId;
      const answered = Boolean(state.answers[question.id]?.answerText?.trim());
      return `
        <button class="question-dot ${active ? "is-active" : ""} ${answered ? "is-answered" : ""}" data-action="question" data-question-id="${question.id}" aria-label="${question.id}">
          ${index + 1}
        </button>
      `;
    })
    .join("");
}

function renderSummary(chapter) {
  const summary = state.summaries[chapter.category.id];
  if (!summary) return "";
  return `
    <section class="summary-box">
      <span>章まとめ</span>
      <p>${escapeHtml(summary)}</p>
    </section>
  `;
}

function render() {
  const chapter = getCurrentChapter();
  const question = getCurrentQuestion();
  const answer = state.answers[question.id];
  const totals = getTotals();
  const position = getQuestionPosition();
  const chapterProgress = getChapterProgress(chapter);
  const canCompleteChapter = chapterProgress.answered === chapterProgress.total;

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">${escapeHtml(questionBank.version)} / ${totals.total} questions</p>
          <h1>${escapeHtml(questionBank.title)}</h1>
          <p class="lead">経営者の想い、強み、課題を一問一答で言語化します。</p>
        </div>
        <div class="header-actions">
          <span data-save-state>保存済み</span>
          <button class="ghost-button" data-action="export">Markdown出力</button>
          <button class="ghost-button" data-action="reset">リセット</button>
        </div>
      </header>

      <section class="stats" aria-label="全体進捗">
        <div>
          <span>回答済み</span>
          <strong data-total-answered>${totals.answered}/${totals.total}</strong>
        </div>
        <div>
          <span>完了状態</span>
          <strong>${state.status === "completed" ? "完了" : "進行中"}</strong>
        </div>
        <div class="progress-wrap">
          <span>進捗 <b data-progress-label>${totals.percent}%</b></span>
          <div class="progress" aria-label="進捗 ${totals.percent}%">
            <i data-progress-bar style="width: ${totals.percent}%"></i>
          </div>
        </div>
      </section>

      <div class="layout">
        <aside class="sidebar" aria-label="章一覧">
          ${renderChapters()}
        </aside>

        <section class="study-panel">
          <div class="chapter-head">
            <div>
              <p class="eyebrow">Chapter ${chapter.order}</p>
              <h2>${escapeHtml(chapter.category.name)}</h2>
              <p>${escapeHtml(chapter.category.description)}</p>
            </div>
            <div class="question-rail" aria-label="質問一覧">
              ${renderQuestionDots(chapter)}
            </div>
          </div>

          <article class="question-card">
            <div class="question-meta">
              <span>${escapeHtml(question.id)}</span>
              <span>${escapeHtml(question.theme)}</span>
              <span>${escapeHtml(question.subTheme)}</span>
            </div>
            <h3>${escapeHtml(question.level1)}</h3>
            <label class="answer-field">
              <span>回答</span>
              <textarea data-answer placeholder="今の考えをそのまま書いてください。短くても大丈夫です。">${escapeHtml(answer?.answerText ?? "")}</textarea>
            </label>

            <aside class="deep-prompt" data-deep-prompt ${answer?.aiDeepPrompt ? "" : "hidden"}>
              <strong>深掘りの問い</strong>
              <p>${escapeHtml(answer?.aiDeepPrompt ?? "")}</p>
            </aside>

            <div class="hint-grid">
              <div>
                <span>整理される観点</span>
                <strong>${escapeHtml(question.aiSummary)}</strong>
              </div>
              <div>
                <span>関連フレームワーク</span>
                <strong>${escapeHtml(question.framework.join(" / "))}</strong>
              </div>
            </div>
          </article>

          ${renderSummary(chapter)}

          <footer class="pager">
            <button class="secondary-button" data-action="prev">戻る</button>
            <span>${position.questionIndex + 1} / ${chapter.questions.length}</span>
            <div class="pager-actions">
              <button class="secondary-button" data-action="complete-chapter" ${canCompleteChapter ? "" : "disabled"}>章まとめ</button>
              <button class="primary-button" data-action="next">次へ</button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  `;
}

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-answer]")) {
    saveAnswer(event.target.value);
  }
});

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "chapter") {
    const chapter = questionBank.chapters.find((item) => item.category.id === target.dataset.chapterId);
    setCurrentQuestion(chapter.category.id, chapter.questions[0].id);
  }
  if (action === "question") setCurrentQuestion(state.currentChapter, target.dataset.questionId);
  if (action === "prev") moveQuestion(-1);
  if (action === "next") moveQuestion(1);
  if (action === "complete-chapter") completeChapter();
  if (action === "export") exportMarkdown();
  if (action === "reset") resetSession();
});

async function boot() {
  try {
    questionBank = await loadQuestionBank();
    state = loadSession();
    render();
  } catch (error) {
    app.innerHTML = `<main class="shell"><section class="study-panel"><h1>読み込みに失敗しました</h1><p>${escapeHtml(error.message)}</p></section></main>`;
  }
}

boot();
