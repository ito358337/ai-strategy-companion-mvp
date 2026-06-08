const STORAGE_KEY = "ai-strategy-companion:mvp-light:session";
const RECORDING_DB_NAME = "ai-strategy-companion-recordings";
const RECORDING_STORE_NAME = "voice-recordings";
const QUESTION_FILES = {
  strategy: "./src/data/question-bank/strategy.json",
  tactics: "./src/data/question-bank/tactics.json",
  promotion: "./src/data/question-bank/promotion.json",
  experience: "./src/data/question-bank/experience.json",
  philosophy: "./src/data/question-bank/philosophy.json",
};

const deepDiveTemplates = [
  {
    type: "episode",
    label: "具体的な出来事",
    question: "それを強く感じた、具体的な出来事や場面はありますか？",
  },
  {
    type: "emotion",
    label: "感情",
    question: "その時、心の中ではどんな気持ちがありましたか？",
  },
  {
    type: "reason",
    label: "大切な理由",
    question: "なぜ、それがあなたにとって大事だと感じるのでしょうか？",
  },
  {
    type: "forWhom",
    label: "誰のためか",
    question: "その想いを、誰に一番届けたいですか？",
  },
  {
    type: "oneWord",
    label: "一言化",
    question: "今のお話を一言で表すなら、どんな言葉になりますか？",
  },
];

const app = document.querySelector("#app");

let questionBank = null;
let state = null;
let saveTimer = null;
let activeDeepDiveIndex = 0;
const deepDiveStartedQuestions = new Set();
let speechRecognition = null;
let activeVoiceTextarea = null;
let isVoiceListening = false;
let lastVoiceError = false;
let shouldKeepVoiceListening = false;
let pendingInterimText = "";
let restartVoiceTimer = null;
let mediaRecorder = null;
let voiceStream = null;
let voiceRecordingChunks = [];
let activeVoiceTarget = "basic";
let activeVoiceQuestionId = "";

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
    return normalizeSession({ ...createSession(), ...JSON.parse(raw) });
  } catch {
    return createSession();
  }
}

function normalizeSession(session) {
  const normalizedAnswers = {};
  for (const question of getAllQuestions()) {
    if (session.answers?.[question.id]) {
      normalizedAnswers[question.id] = normalizeAnswer(question.id, session.answers[question.id]);
    }
  }
  return { ...session, answers: normalizedAnswers };
}

function createEmptyAnswer(questionId) {
  return {
    questionId,
    basicAnswer: "",
    deepDiveAnswers: deepDiveTemplates.map((template) => ({ ...template, answer: "" })),
    finalSummary: "",
    pdfSentence: "",
    completed: false,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeAnswer(questionId, answer) {
  const base = createEmptyAnswer(questionId);
  const deepDiveAnswers = deepDiveTemplates.map((template) => {
    const existing = answer.deepDiveAnswers?.find((item) => item.type === template.type);
    return {
      ...template,
      answer: existing?.answer ?? "",
    };
  });

  return {
    ...base,
    ...answer,
    questionId,
    basicAnswer: answer.basicAnswer ?? answer.answerText ?? "",
    deepDiveAnswers,
    finalSummary: answer.finalSummary ?? "",
    pdfSentence: answer.pdfSentence ?? "",
    completed: Boolean(answer.completed ?? answer.finalSummary ?? answer.answerText),
    updatedAt: answer.updatedAt ?? new Date().toISOString(),
  };
}

function getAnswer(questionId) {
  return normalizeAnswer(questionId, state.answers[questionId] ?? createEmptyAnswer(questionId));
}

function setAnswer(questionId, answer) {
  state.answers[questionId] = normalizeAnswer(questionId, {
    ...answer,
    updatedAt: new Date().toISOString(),
  });
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

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

function isVoiceSessionActive() {
  return shouldKeepVoiceListening || isVoiceListening;
}

function isMediaRecorderSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function openRecordingDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECORDING_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDING_STORE_NAME)) {
        db.createObjectStore(RECORDING_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVoiceRecording(blob) {
  const questionId = activeVoiceQuestionId || getCurrentQuestion().id;
  const recording = {
    id: `${questionId}:${activeVoiceTarget}:${Date.now()}`,
    questionId,
    target: activeVoiceTarget,
    blob,
    mimeType: blob.type,
    createdAt: new Date().toISOString(),
  };

  const db = await openRecordingDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(RECORDING_STORE_NAME, "readwrite");
    transaction.objectStore(RECORDING_STORE_NAME).put(recording);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return recording;
}

async function startVoiceRecording() {
  if (!isMediaRecorderSupported()) {
    showRecordingStatus("このブラウザでは録音バックアップを保存できません。文字起こしのみ行います。", "error");
    return;
  }

  if (mediaRecorder?.state === "recording") return;

  voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  voiceRecordingChunks = [];
  mediaRecorder = new MediaRecorder(voiceStream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) voiceRecordingChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(voiceRecordingChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    voiceRecordingChunks = [];
    stopVoiceTracks();

    if (!blob.size) return;

    try {
      const recording = await saveVoiceRecording(blob);
      showRecordingStatus("録音バックアップを保存しました。文字起こし漏れがある場合は音声を確認できます。", "done", recording, blob);
    } catch {
      showRecordingStatus("録音は完了しましたが、このブラウザでは保存できませんでした。", "error", null, blob);
    }
  };

  mediaRecorder.start(1000);
  showRecordingStatus("録音バックアップ中です。音声そのものも一時保存しています。", "listening");
}

function stopVoiceRecording() {
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.stop();
    return;
  }
  stopVoiceTracks();
}

function stopVoiceTracks() {
  voiceStream?.getTracks().forEach((track) => track.stop());
  voiceStream = null;
}

function initSpeechRecognition() {
  if (!isSpeechRecognitionSupported()) return null;
  if (speechRecognition) return speechRecognition;

  const SpeechRecognition = getSpeechRecognitionConstructor();
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    isVoiceListening = true;
    lastVoiceError = false;
    pendingInterimText = "";
    showVoiceStatus("聞き取り中です。少し間が空いても、そのまま話し続けてください。", "listening");
    updateVoiceButtons();
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript.trim();
      if (event.results[index].isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (finalText) {
      appendRecognizedText(finalText);
      pendingInterimText = "";
    }

    if (interimText) {
      pendingInterimText = interimText;
      showVoiceStatus(`認識中：${interimText}`, "listening");
    }
  };

  recognition.onerror = (event) => {
    handleVoiceError(event.error);
  };

  recognition.onend = () => {
    isVoiceListening = false;
    flushPendingInterimText();
    updateVoiceButtons();
    if (shouldKeepVoiceListening && !lastVoiceError) {
      showVoiceStatus("聞き取りが一瞬途切れました。自動で再開します。", "listening");
      restartVoiceTimer = setTimeout(() => {
        restartVoiceRecognition();
      }, 250);
      return;
    }

    if (activeVoiceTextarea && !lastVoiceError) {
      showVoiceStatus("文字起こししました。必要に応じて少し整えてください。", "done");
    }
  };

  speechRecognition = recognition;
  return speechRecognition;
}

async function startVoiceInput(targetTextarea, target = "basic") {
  if (!isSpeechRecognitionSupported()) {
    showVoiceStatus("このブラウザは音声入力に対応していません。Google Chromeでお試しください。", "error");
    return;
  }

  activeVoiceTarget = target;
  activeVoiceQuestionId = getCurrentQuestion().id;
  activeVoiceTextarea = targetTextarea ?? document.activeElement;
  if (!activeVoiceTextarea?.matches("textarea")) {
    activeVoiceTextarea = document.querySelector("[data-answer]");
  }

  clearTimeout(restartVoiceTimer);
  shouldKeepVoiceListening = true;
  pendingInterimText = "";
  if (isVoiceListening) stopVoiceInput(false);

  try {
    await startVoiceRecording();
    initSpeechRecognition().start();
  } catch {
    stopVoiceRecording();
    shouldKeepVoiceListening = false;
    handleVoiceError("not-allowed");
  }
}

function restartVoiceRecognition() {
  if (!shouldKeepVoiceListening || lastVoiceError || !speechRecognition) return;
  try {
    speechRecognition.start();
  } catch {
    restartVoiceTimer = setTimeout(() => {
      restartVoiceRecognition();
    }, 500);
  }
}

function stopVoiceInput(manual = true) {
  clearTimeout(restartVoiceTimer);
  if (manual) shouldKeepVoiceListening = false;
  flushPendingInterimText();
  if (manual) stopVoiceRecording();
  if (!speechRecognition || !isVoiceListening) return;
  speechRecognition.stop();
}

function appendRecognizedText(text) {
  if (!activeVoiceTextarea || !text.trim()) return;

  const currentValue = activeVoiceTextarea.value.trimEnd();
  const separator = currentValue ? " " : "";
  activeVoiceTextarea.value = `${currentValue}${separator}${text.trim()}`;
  activeVoiceTextarea.focus();
  activeVoiceTextarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function flushPendingInterimText() {
  if (!pendingInterimText.trim()) return;
  appendRecognizedText(pendingInterimText);
  pendingInterimText = "";
}

function showVoiceStatus(message, type = "info") {
  document.querySelectorAll("[data-voice-message]").forEach((node) => {
    node.textContent = message;
    node.dataset.voiceState = type;
  });
}

function showRecordingStatus(message, type = "info", recording = null, blob = null) {
  document.querySelectorAll("[data-recording-message]").forEach((node) => {
    node.textContent = message;
    node.dataset.voiceState = type;
  });

  if (!blob) return;

  const audioUrl = URL.createObjectURL(blob);
  document.querySelectorAll(`[data-voice-target="${activeVoiceTarget}"] [data-recording-actions]`).forEach((node) => {
    node.innerHTML = `
      <audio controls src="${audioUrl}"></audio>
      <a href="${audioUrl}" download="${recording?.questionId ?? "voice"}-${recording?.target ?? "answer"}.webm">録音を保存</a>
    `;
  });
}

function handleVoiceError(error) {
  if (error === "no-speech" && shouldKeepVoiceListening) {
    lastVoiceError = false;
    showVoiceStatus("少し無音がありました。聞き取りを続けます。", "listening");
    return;
  }

  if (error === "aborted" && !shouldKeepVoiceListening) {
    return;
  }

  isVoiceListening = false;
  shouldKeepVoiceListening = false;
  lastVoiceError = true;
  clearTimeout(restartVoiceTimer);
  updateVoiceButtons();

  if (error === "not-allowed" || error === "service-not-allowed") {
    showVoiceStatus("マイクの使用が許可されませんでした。Chromeの設定からマイクを許可してください。", "error");
    return;
  }

  showVoiceStatus("音声入力でエラーが起きました。通常のテキスト入力はそのまま使えます。", "error");
}

function updateVoiceButtons() {
  document.querySelectorAll("[data-action='voice-toggle']").forEach((button) => {
    button.textContent = isVoiceSessionActive() ? "⏹ 停止" : "🎙 話して答える";
    button.classList.toggle("is-listening", isVoiceSessionActive());
  });
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
  const answered = questions.filter((question) => getAnswer(question.id).completed);
  return {
    total: questions.length,
    answered: answered.length,
    percent: questions.length === 0 ? 0 : Math.round((answered.length / questions.length) * 100),
  };
}

function getChapterProgress(chapter) {
  const answered = chapter.questions.filter((question) => getAnswer(question.id).completed);
  return {
    total: chapter.questions.length,
    answered: answered.length,
    completed: answered.length === chapter.questions.length,
  };
}

function setCurrentQuestion(chapterId, questionId) {
  stopVoiceInput();
  state.currentChapter = chapterId;
  state.currentQuestionId = questionId;
  const answer = getAnswer(questionId);
  activeDeepDiveIndex = getFirstOpenDeepDiveIndex(answer);
  if (getAnsweredDeepDiveCount(answer) > 0 || answer.completed) {
    deepDiveStartedQuestions.add(questionId);
  }
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
  const answer = getAnswer(question.id);
  setAnswer(question.id, {
    ...answer,
    basicAnswer: value,
    finalSummary: "",
    pdfSentence: "",
    completed: false,
  });
  if (!value.trim()) {
    deepDiveStartedQuestions.delete(question.id);
  }
  scheduleSave();
  updateDerivedUi();
  const startButton = document.querySelector('[data-action="start-deep"]');
  if (startButton) startButton.disabled = !value.trim();
}

function saveDeepDiveAnswer(value) {
  const question = getCurrentQuestion();
  const answer = getAnswer(question.id);
  deepDiveStartedQuestions.add(question.id);
  answer.deepDiveAnswers[activeDeepDiveIndex].answer = value;
  answer.finalSummary = "";
  answer.pdfSentence = "";
  answer.completed = false;
  setAnswer(question.id, answer);
  scheduleSave();
  document.querySelectorAll('[data-action="start-deep"], [data-action="continue-deep"]').forEach((button) => {
    button.disabled = !value.trim();
  });
}

function updateDerivedUi() {
  const totals = getTotals();
  document.querySelector("[data-total-answered]").textContent = `${totals.answered}/${totals.total}`;
  document.querySelector("[data-progress-bar]").style.width = `${totals.percent}%`;
  document.querySelector("[data-progress-label]").textContent = `${totals.percent}%`;
}

function getAnsweredDeepDiveCount(answer) {
  return answer.deepDiveAnswers.filter((item) => item.answer.trim()).length;
}

function getFirstOpenDeepDiveIndex(answer) {
  const index = answer.deepDiveAnswers.findIndex((item) => !item.answer.trim());
  return index === -1 ? deepDiveTemplates.length - 1 : index;
}

function beginDeepDive() {
  const question = getCurrentQuestion();
  const answer = getAnswer(question.id);
  if (!answer.basicAnswer.trim()) return;
  deepDiveStartedQuestions.add(question.id);
  activeDeepDiveIndex = getFirstOpenDeepDiveIndex(answer);
  render();
}

function continueDeepDive() {
  stopVoiceInput();
  const question = getCurrentQuestion();
  const answer = getAnswer(question.id);
  const current = answer.deepDiveAnswers[activeDeepDiveIndex];
  if (!current?.answer.trim()) return;
  activeDeepDiveIndex = Math.min(activeDeepDiveIndex + 1, deepDiveTemplates.length - 1);
  render();
}

function summarizeAndMoveNext() {
  stopVoiceInput();
  const question = getCurrentQuestion();
  const answer = getAnswer(question.id);
  const summary = generateQuestionSummary(question, answer);
  setAnswer(question.id, {
    ...answer,
    finalSummary: summary.finalSummary,
    pdfSentence: summary.pdfSentence,
    completed: true,
  });
  persistSession(true);
  moveQuestion(1);
}

function generateQuestionSummary(question, answer) {
  const oneWord = answer.deepDiveAnswers.find((item) => item.type === "oneWord")?.answer.trim();
  const fallback = answer.basicAnswer.trim().split(/\s+/).slice(0, 24).join(" ");
  const pdfSentence = oneWord || fallback || "未整理";
  return {
    pdfSentence,
    finalSummary: [
      `受け止め：「${pdfSentence}」という想いが見えてきました。`,
      `整理：この回答は「${question.aiSummary}」として整理できます。`,
      `PDFに残す一文：「${pdfSentence}」`,
    ].join("\n"),
  };
}

function generateChapterSummary(chapter) {
  const answered = chapter.questions
    .map((question) => ({ question, answer: getAnswer(question.id) }))
    .filter((item) => item.answer.completed);

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
      const answer = getAnswer(question.id);
      lines.push(`## 質問ID：${question.id}`, "");
      lines.push("### 基本質問", question.level1, "");
      lines.push("### 基本回答", answer.basicAnswer.trim() || "未回答", "");
      lines.push("### 深掘り", "");
      answer.deepDiveAnswers.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.label}`);
        lines.push(`質問：${item.question}`);
        lines.push(`回答：${item.answer.trim() || "未回答"}`, "");
      });
      lines.push("### PDFに残す一文", answer.pdfSentence.trim() || "未整理", "");
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
  stopVoiceInput();
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
      const answered = getAnswer(question.id).completed;
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

function renderQuestionSummary(answer) {
  if (!answer.finalSummary) return "";
  const paragraphs = answer.finalSummary
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  return `
    <section class="summary-box question-summary">
      <span>この問いの整理</span>
      ${paragraphs}
    </section>
  `;
}

function renderVoiceInputControls(target) {
  const supported = isSpeechRecognitionSupported();
  const recordingSupported = isMediaRecorderSupported();
  return `
    <div class="voice-input" data-voice-target="${target}">
      <button class="voice-button" data-action="voice-toggle" data-voice-for="${target}" ${supported ? "" : "disabled"}>
        🎙 話して答える
      </button>
      <div class="voice-copy">
        <p data-voice-message data-voice-state="${supported ? "info" : "error"}">
          ${supported ? "音声入力はGoogle Chromeでの利用を推奨しています。" : "このブラウザは音声入力に対応していません。Google Chromeでお試しください。"}
        </p>
        <small>停止するまで聞き取りを続けます。話した内容は文字として入力欄に入り、録音バックアップも残します。</small>
        <small data-recording-message data-voice-state="${recordingSupported ? "info" : "error"}">
          ${recordingSupported ? "録音データはこのブラウザ内に保存されます。" : "このブラウザでは録音バックアップを保存できません。"}
        </small>
        <div class="recording-actions" data-recording-actions></div>
      </div>
    </div>
  `;
}

function renderDeepDivePanel(answer) {
  const basicDone = Boolean(answer.basicAnswer.trim());
  const answeredCount = getAnsweredDeepDiveCount(answer);
  const activeItem = answer.deepDiveAnswers[activeDeepDiveIndex];
  const currentAnswered = Boolean(activeItem?.answer.trim());
  const allDeepDone = answeredCount === deepDiveTemplates.length;
  const hasStarted = deepDiveStartedQuestions.has(answer.questionId) || answeredCount > 0;

  if (!basicDone) {
    return `
      <section class="deep-dive-panel is-waiting">
        <div>
          <span>深掘り対話</span>
          <strong>まずは基本回答を書いてください</strong>
          <p>回答後に、原体験や本音を引き出す5段階の深掘りへ進めます。</p>
        </div>
        <div class="deep-actions">
          <button class="primary-button" data-action="start-deep" disabled>深掘りへ進む</button>
        </div>
      </section>
    `;
  }

  if (!hasStarted) {
    return `
      <section class="deep-dive-panel">
        <div class="deep-dive-head">
          <div>
            <span>深掘り 0 / ${deepDiveTemplates.length}</span>
            <strong>回答をもう一段深めます</strong>
          </div>
          <em>準備完了</em>
        </div>
        <div class="deep-question">
          <span>次にやること</span>
          <p>基本回答をもとに、具体的な出来事、感情、大切な理由、誰に届けたいか、一言化まで順番に整理します。</p>
        </div>
        <div class="deep-actions">
          <button class="primary-button" data-action="start-deep">深掘りへ進む</button>
        </div>
      </section>
    `;
  }

  if (answer.completed) {
    return `
      <section class="deep-dive-panel is-complete">
        <div class="deep-dive-head">
          <span>深掘り完了</span>
          <strong>この問いは整理済みです</strong>
        </div>
        <div class="deep-dive-steps">
          ${answer.deepDiveAnswers
            .map((item, index) => `<button class="deep-step is-done" data-action="select-deep" data-deep-index="${index}">${index + 1}. ${escapeHtml(item.label)}</button>`)
            .join("")}
        </div>
      </section>
      ${renderQuestionSummary(answer)}
    `;
  }

  return `
    <section class="deep-dive-panel">
      <div class="deep-dive-head">
        <div>
          <span>深掘り ${Math.max(answeredCount, activeDeepDiveIndex)} / ${deepDiveTemplates.length}</span>
          <strong>${escapeHtml(activeItem.label)}</strong>
        </div>
        <em>${activeDeepDiveIndex + 1} / ${deepDiveTemplates.length}</em>
      </div>

      <div class="deep-dive-steps" aria-label="深掘り進捗">
        ${answer.deepDiveAnswers
          .map((item, index) => {
            const stateClass = index === activeDeepDiveIndex ? "is-active" : item.answer.trim() ? "is-done" : "";
            return `<button class="deep-step ${stateClass}" data-action="select-deep" data-deep-index="${index}">${index + 1}. ${escapeHtml(item.label)}</button>`;
          })
          .join("")}
      </div>

      <div class="deep-question">
        <span>深掘り質問</span>
        <p>${escapeHtml(activeItem.question)}</p>
      </div>

      <label class="answer-field">
        <span>追加回答</span>
        <textarea data-deep-answer placeholder="その場面や気持ちを、短くてもいいので書いてください。">${escapeHtml(activeItem.answer)}</textarea>
      </label>
      ${renderVoiceInputControls("deep")}

      <div class="deep-actions">
        ${
          answeredCount === 0 && activeDeepDiveIndex === 0
            ? `<button class="primary-button" data-action="start-deep" ${currentAnswered ? "" : "disabled"}>深掘りへ進む</button>`
            : ""
        }
        ${
          !allDeepDone && !(answeredCount === 0 && activeDeepDiveIndex === 0)
            ? `<button class="primary-button" data-action="continue-deep" ${currentAnswered ? "" : "disabled"}>さらに深掘りする</button>`
            : ""
        }
        <button class="secondary-button" data-action="summarize-question" ${answer.basicAnswer.trim() ? "" : "disabled"}>この問いを整理して次へ進む</button>
      </div>
    </section>
  `;
}

function render() {
  const chapter = getCurrentChapter();
  const question = getCurrentQuestion();
  const answer = getAnswer(question.id);
  const totals = getTotals();
  const position = getQuestionPosition();
  const chapterProgress = getChapterProgress(chapter);
  const canCompleteChapter = chapterProgress.answered === chapterProgress.total;
  const canMoveNext = answer.completed;

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">v0.2 / ${escapeHtml(questionBank.version)} / ${totals.total} questions</p>
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
              <span>基本回答</span>
              <textarea data-answer placeholder="今の考えをそのまま書いてください。短くても大丈夫です。">${escapeHtml(answer.basicAnswer)}</textarea>
            </label>
            ${renderVoiceInputControls("basic")}

            ${renderDeepDivePanel(answer)}

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
              <button class="secondary-button" data-action="next" ${canMoveNext ? "" : "disabled"}>${canMoveNext ? "次へ" : "整理後に次へ"}</button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  `;
  updateVoiceButtons();
}

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-answer]")) {
    saveAnswer(event.target.value);
  }
  if (event.target.matches("[data-deep-answer]")) {
    saveDeepDiveAnswer(event.target.value);
  }
});

app.addEventListener("focusin", (event) => {
  if (event.target.matches("textarea")) {
    activeVoiceTextarea = event.target;
  }
});

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "voice-toggle") {
    if (isVoiceSessionActive()) {
      stopVoiceInput();
      return;
    }

    const focusedTextarea = document.activeElement?.matches("textarea") ? document.activeElement : null;
    const fallbackSelector = target.dataset.voiceFor === "deep" ? "[data-deep-answer]" : "[data-answer]";
    const storedTextarea = activeVoiceTextarea?.matches(fallbackSelector) ? activeVoiceTextarea : null;
    const fallbackTextarea = target.closest(".question-card")?.querySelector(fallbackSelector);
    startVoiceInput(focusedTextarea ?? storedTextarea ?? fallbackTextarea, target.dataset.voiceFor);
    return;
  }
  if (action === "chapter") {
    const chapter = questionBank.chapters.find((item) => item.category.id === target.dataset.chapterId);
    setCurrentQuestion(chapter.category.id, chapter.questions[0].id);
  }
  if (action === "question") setCurrentQuestion(state.currentChapter, target.dataset.questionId);
  if (action === "select-deep") {
    activeDeepDiveIndex = Number(target.dataset.deepIndex);
    render();
  }
  if (action === "start-deep") beginDeepDive();
  if (action === "continue-deep") continueDeepDive();
  if (action === "summarize-question") summarizeAndMoveNext();
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
