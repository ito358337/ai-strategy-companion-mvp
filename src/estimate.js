const STORAGE_KEY = "aether-estimate:v1";
const MASTER_URL = new URL("./data/estimate-master.json", import.meta.url);
const CATEGORIES = ["材料", "施工", "経費", "その他"];

const app = document.querySelector("#app");

let state = null;
let view = "input";
let saveTimer = null;
const openRooms = new Set();

function createEmptySettings() {
  return {
    taxRate: 0.1,
    targetMargin: 0.3,
    minMargin: 0.25,
    companyName: "株式会社Aether",
    representative: "伊藤 雄一",
  };
}

function createEmptyState() {
  return {
    version: 1,
    projectName: "リフォーム工事一式",
    customerName: "",
    date: new Date().toISOString().slice(0, 10),
    settings: createEmptySettings(),
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

function createItem(room = "") {
  return {
    id: crypto.randomUUID(),
    room,
    category: "材料",
    item: "",
    qty: null,
    unit: "",
    custUnitPrice: null,
    custManualAmount: null,
    execQty: null,
    execUnit: "",
    execUnitPrice: null,
    execManualAmount: null,
    priceNote: "",
    productNote: "",
    display: true,
    remark: "",
  };
}

function normalizeItem(item) {
  return { ...createItem(), ...item, id: item.id ?? crypto.randomUUID() };
}

function normalizeState(raw) {
  const base = createEmptyState();
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    items: (raw.items ?? []).map(normalizeItem),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persist(feedback = true) {
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
  saveTimer = setTimeout(() => persist(true), 350);
}

function showSaveState(message) {
  const node = document.querySelector("[data-save-state]");
  if (node) node.textContent = message;
}

async function loadMaster() {
  const response = await fetch(MASTER_URL);
  if (!response.ok) throw new Error("単価マスターを読み込めませんでした");
  return response.json();
}

function applyMaster(master) {
  const next = createEmptyState();
  next.settings = { ...next.settings, ...master.settings };
  next.items = master.items.map(normalizeItem);
  state = next;
  openRooms.clear();
  const first = getRooms()[0];
  if (first) openRooms.add(first);
}

// ---- 計算（Excelの数式を踏襲） ----

function customerAmount(item) {
  if (!item.display) return 0;
  if (item.custManualAmount > 0) return Math.round(item.custManualAmount);
  return Math.round((item.qty ?? 0) * (item.custUnitPrice ?? 0));
}

function execAmount(item) {
  if (!item.display) return 0;
  if (item.execManualAmount > 0) return Math.round(item.execManualAmount);
  return Math.round((item.execQty ?? 0) * (item.execUnitPrice ?? 0));
}

function profitOf(item) {
  return customerAmount(item) - execAmount(item);
}

function marginOf(item) {
  const cust = customerAmount(item);
  return cust ? profitOf(item) / cust : 0;
}

function getRooms() {
  const rooms = [];
  for (const item of state.items) {
    if (item.room && !rooms.includes(item.room)) rooms.push(item.room);
  }
  return rooms;
}

function roomItems(room) {
  return state.items.filter((item) => item.room === room);
}

function roomTotals(room) {
  const items = roomItems(room);
  const customer = items.reduce((sum, item) => sum + customerAmount(item), 0);
  const exec = items.reduce((sum, item) => sum + execAmount(item), 0);
  // 消費税は工区ごとに切り捨て（Excel版の端数課題を修正）
  const tax = Math.floor(customer * state.settings.taxRate);
  return { customer, exec, tax, taxIncluded: customer + tax, profit: customer - exec, margin: customer ? (customer - exec) / customer : 0 };
}

function grandTotals() {
  const rooms = getRooms();
  const totals = rooms.map((room) => roomTotals(room));
  const customer = totals.reduce((sum, t) => sum + t.customer, 0);
  const exec = totals.reduce((sum, t) => sum + t.exec, 0);
  const tax = totals.reduce((sum, t) => sum + t.tax, 0);
  return { customer, exec, tax, taxIncluded: customer + tax, profit: customer - exec, margin: customer ? (customer - exec) / customer : 0 };
}

function judgment(margin) {
  if (margin >= state.settings.targetMargin) return "OK";
  if (margin >= state.settings.minMargin) return "注意";
  return "要改善";
}

function judgmentClass(label) {
  return label === "OK" ? "is-ok" : label === "注意" ? "is-warn" : "is-bad";
}

// ---- 表示ユーティリティ ----

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function yen(value) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function numAttr(value) {
  return value === null || value === undefined ? "" : value;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("ja-JP");
}

// ---- 入力ビュー ----

function renderItemRow(item, index) {
  const cust = customerAmount(item);
  const exec = execAmount(item);
  const margin = marginOf(item);
  const label = judgment(margin);
  return `
    <div class="est-item ${item.display ? "" : "is-hidden-item"}" data-item-id="${item.id}">
      <div class="est-item-head">
        <span class="est-no">${index + 1}</span>
        <input class="est-name" data-field="item" value="${escapeHtml(item.item)}" placeholder="工事項目" />
        <select data-field="category">
          ${CATEGORIES.map((c) => `<option value="${c}" ${item.category === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <label class="est-display-toggle" title="お客様見積書に表示する">
          <input type="checkbox" data-field="display" ${item.display ? "checked" : ""} /> 表示
        </label>
        <button class="est-delete" data-action="delete-item" title="この行を削除">✕</button>
      </div>
      <div class="est-item-grid">
        <label><span>数量</span><input type="number" step="any" inputmode="decimal" data-field="qty" value="${numAttr(item.qty)}" /></label>
        <label><span>単位</span><input data-field="unit" value="${escapeHtml(item.unit)}" /></label>
        <label><span>お客様単価</span><input type="number" step="any" inputmode="numeric" data-field="custUnitPrice" value="${numAttr(item.custUnitPrice)}" /></label>
        <label><span>手入力金額</span><input type="number" step="any" inputmode="numeric" data-field="custManualAmount" value="${numAttr(item.custManualAmount)}" placeholder="優先" /></label>
        <label><span>実行単価（原価）</span><input type="number" step="any" inputmode="numeric" data-field="execUnitPrice" value="${numAttr(item.execUnitPrice)}" /></label>
        <label><span>実行手入力金額</span><input type="number" step="any" inputmode="numeric" data-field="execManualAmount" value="${numAttr(item.execManualAmount)}" placeholder="優先" /></label>
      </div>
      <div class="est-item-grid est-item-grid-notes">
        <label><span>商品名・品番</span><input data-field="productNote" value="${escapeHtml(item.productNote)}" /></label>
        <label><span>定価・掛率・人工費</span><input data-field="priceNote" value="${escapeHtml(item.priceNote)}" /></label>
      </div>
      <div class="est-item-amounts">
        <span>見積 <strong>${yen(cust)}</strong></span>
        <span>原価 <strong>${yen(exec)}</strong></span>
        <span>粗利 <strong>${yen(cust - exec)}</strong></span>
        <span class="est-badge ${judgmentClass(label)}">${pct(margin)} ${label}</span>
      </div>
    </div>
  `;
}

function renderInputView() {
  const rooms = getRooms();
  if (rooms.length === 0) {
    return `
      <section class="est-empty">
        <h2>明細がまだありません</h2>
        <p>Aetherのリフォーム見積サンプル（156明細）を読み込むか、工区を追加して入力を始めてください。</p>
        <div class="est-empty-actions">
          <button class="primary-button" data-action="load-master">サンプルを読み込む</button>
          <button class="secondary-button" data-action="add-room">工区を追加</button>
        </div>
      </section>
    `;
  }

  const sections = rooms
    .map((room) => {
      const totals = roomTotals(room);
      const label = judgment(totals.margin);
      const items = roomItems(room);
      return `
        <details class="est-room" data-room="${escapeHtml(room)}" ${openRooms.has(room) ? "open" : ""}>
          <summary>
            <span class="est-room-name">${escapeHtml(room)}<small>${items.length}件</small></span>
            <span class="est-room-totals">
              <span>${yen(totals.customer)}</span>
              <span class="est-badge ${judgmentClass(label)}">${pct(totals.margin)} ${label}</span>
            </span>
          </summary>
          <div class="est-room-body">
            ${items.map((item) => renderItemRow(item, state.items.indexOf(item))).join("")}
            <div class="est-room-actions">
              <button class="secondary-button" data-action="add-item" data-room="${escapeHtml(room)}">＋ この工区に行を追加</button>
              <button class="ghost-button" data-action="rename-room" data-room="${escapeHtml(room)}">工区名を変更</button>
            </div>
          </div>
        </details>
      `;
    })
    .join("");

  return `
    ${sections}
    <div class="est-input-footer">
      <button class="secondary-button" data-action="add-room">＋ 工区を追加</button>
    </div>
  `;
}

// ---- お客様見積書ビュー ----

function renderQuoteSummaryTable() {
  const rooms = getRooms();
  const grand = grandTotals();
  return `
    <table class="est-table">
      <thead><tr><th>工区・部屋</th><th class="num">小計（税抜）</th><th class="num">消費税</th><th class="num">税込金額</th></tr></thead>
      <tbody>
        ${rooms
          .map((room) => {
            const t = roomTotals(room);
            return `<tr><td>${escapeHtml(room)}</td><td class="num">${yen(t.customer)}</td><td class="num">${yen(t.tax)}</td><td class="num">${yen(t.taxIncluded)}</td></tr>`;
          })
          .join("")}
      </tbody>
      <tfoot><tr><th>合計</th><th class="num">${yen(grand.customer)}</th><th class="num">${yen(grand.tax)}</th><th class="num">${yen(grand.taxIncluded)}</th></tr></tfoot>
    </table>
  `;
}

function renderQuoteDetailTable(room) {
  const items = roomItems(room).filter((item) => item.display);
  if (items.length === 0) return "";
  return `
    <h3 class="est-detail-room">${escapeHtml(room)}</h3>
    <table class="est-table est-detail-table">
      <thead><tr><th>工事項目</th><th class="num">数量</th><th>単位</th><th class="num">単価</th><th class="num">金額</th><th>備考</th></tr></thead>
      <tbody>
        ${items
          .map(
            (item) => `
            <tr>
              <td>${escapeHtml(item.item)}</td>
              <td class="num">${numAttr(item.qty)}</td>
              <td>${escapeHtml(item.unit)}</td>
              <td class="num">${item.custUnitPrice ? yen(item.custUnitPrice) : ""}</td>
              <td class="num">${yen(customerAmount(item))}</td>
              <td class="note">${escapeHtml(item.productNote)}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderQuoteView() {
  const grand = grandTotals();
  return `
    <section class="est-doc">
      <div class="est-doc-head">
        <div>
          <h2>御見積書</h2>
          <p class="est-doc-meta">
            <label>お客様名 <input data-doc-field="customerName" value="${escapeHtml(state.customerName)}" placeholder="○○" /> 様</label>
            <label>工事名 <input data-doc-field="projectName" value="${escapeHtml(state.projectName)}" /></label>
            <label>作成日 <input type="date" data-doc-field="date" value="${escapeHtml(state.date)}" /></label>
          </p>
        </div>
        <div class="est-doc-company">
          <strong>${escapeHtml(state.settings.companyName)}</strong>
          <span>代表 ${escapeHtml(state.settings.representative)}</span>
        </div>
      </div>
      <p class="est-grand">御見積金額 <strong>${yen(grand.taxIncluded)}</strong><small>（税抜 ${yen(grand.customer)}／消費税 ${yen(grand.tax)}・端数切り捨て）</small></p>
      ${renderQuoteSummaryTable()}
      <h3 class="est-section-title">明細</h3>
      ${getRooms().map((room) => renderQuoteDetailTable(room)).join("")}
    </section>
  `;
}

// ---- 社内実行予算書ビュー ----

function renderBudgetView() {
  const rooms = getRooms();
  const grand = grandTotals();
  const grandLabel = judgment(grand.margin);
  return `
    <section class="est-doc">
      <div class="est-doc-head">
        <div>
          <h2>社内実行予算書</h2>
          <p class="est-doc-meta-plain">${escapeHtml(state.projectName)}　作成日 ${formatDate(state.date)}　目標粗利率 ${pct(state.settings.targetMargin)}／警告 ${pct(state.settings.minMargin)}</p>
        </div>
      </div>
      <table class="est-table">
        <thead><tr><th>工区・部屋</th><th class="num">お客様見積</th><th class="num">実行予算</th><th class="num">粗利額</th><th class="num">粗利率</th><th>判定</th></tr></thead>
        <tbody>
          ${rooms
            .map((room) => {
              const t = roomTotals(room);
              const label = judgment(t.margin);
              return `<tr><td>${escapeHtml(room)}</td><td class="num">${yen(t.customer)}</td><td class="num">${yen(t.exec)}</td><td class="num">${yen(t.profit)}</td><td class="num">${pct(t.margin)}</td><td><span class="est-badge ${judgmentClass(label)}">${label}</span></td></tr>`;
            })
            .join("")}
        </tbody>
        <tfoot><tr><th>合計</th><th class="num">${yen(grand.customer)}</th><th class="num">${yen(grand.exec)}</th><th class="num">${yen(grand.profit)}</th><th class="num">${pct(grand.margin)}</th><th><span class="est-badge ${judgmentClass(grandLabel)}">${grandLabel}</span></th></tr></tfoot>
      </table>
      <h3 class="est-section-title">明細（原価・粗利）</h3>
      ${rooms
        .map((room) => {
          const items = roomItems(room).filter((item) => item.display);
          if (items.length === 0) return "";
          return `
            <h3 class="est-detail-room">${escapeHtml(room)}</h3>
            <table class="est-table est-detail-table">
              <thead><tr><th>工事項目</th><th class="num">見積金額</th><th class="num">実行金額</th><th class="num">粗利額</th><th class="num">粗利率</th><th>メモ</th></tr></thead>
              <tbody>
                ${items
                  .map((item) => {
                    const margin = marginOf(item);
                    return `<tr class="${margin < state.settings.minMargin ? "is-low-margin" : ""}"><td>${escapeHtml(item.item)}</td><td class="num">${yen(customerAmount(item))}</td><td class="num">${yen(execAmount(item))}</td><td class="num">${yen(profitOf(item))}</td><td class="num">${pct(margin)}</td><td class="note">${escapeHtml(item.priceNote)}</td></tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          `;
        })
        .join("")}
    </section>
  `;
}

// ---- 粗利分析ビュー ----

function renderAnalysisView() {
  const rooms = getRooms();
  const grand = grandTotals();
  const grandLabel = judgment(grand.margin);
  const lowItems = state.items
    .filter((item) => item.display && customerAmount(item) > 0 && marginOf(item) < state.settings.minMargin)
    .sort((a, b) => marginOf(a) - marginOf(b))
    .slice(0, 10);
  return `
    <section class="est-doc">
      <h2>粗利分析ダッシュボード</h2>
      <div class="est-kpis">
        <div><span>お客様見積合計（税抜）</span><strong>${yen(grand.customer)}</strong></div>
        <div><span>実行予算合計</span><strong>${yen(grand.exec)}</strong></div>
        <div><span>粗利額</span><strong>${yen(grand.profit)}</strong></div>
        <div><span>粗利率</span><strong class="${judgmentClass(grandLabel)}">${pct(grand.margin)}</strong></div>
        <div><span>税込見積合計</span><strong>${yen(grand.taxIncluded)}</strong></div>
      </div>
      <h3 class="est-section-title">工区別の粗利率（目標 ${pct(state.settings.targetMargin)}）</h3>
      <div class="est-bars">
        ${rooms
          .map((room) => {
            const t = roomTotals(room);
            const label = judgment(t.margin);
            const width = Math.max(2, Math.min(100, t.margin * 200));
            return `
              <div class="est-bar-row">
                <span class="est-bar-label">${escapeHtml(room)}</span>
                <div class="est-bar-track">
                  <i class="est-bar ${judgmentClass(label)}" style="width:${width}%"></i>
                  <b class="est-bar-target" style="left:${state.settings.targetMargin * 200}%"></b>
                </div>
                <span class="est-bar-value">${pct(t.margin)} <span class="est-badge ${judgmentClass(label)}">${label}</span></span>
              </div>
            `;
          })
          .join("")}
      </div>
      ${
        lowItems.length
          ? `
        <h3 class="est-section-title">粗利率が低い明細（警告ライン ${pct(state.settings.minMargin)} 未満）</h3>
        <table class="est-table est-detail-table">
          <thead><tr><th>工区</th><th>工事項目</th><th class="num">見積金額</th><th class="num">粗利額</th><th class="num">粗利率</th></tr></thead>
          <tbody>
            ${lowItems
              .map(
                (item) => `<tr class="is-low-margin"><td>${escapeHtml(item.room)}</td><td>${escapeHtml(item.item)}</td><td class="num">${yen(customerAmount(item))}</td><td class="num">${yen(profitOf(item))}</td><td class="num">${pct(marginOf(item))}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>`
          : `<p class="est-ok-note">警告ライン（${pct(state.settings.minMargin)}）を下回る明細はありません。</p>`
      }
    </section>
  `;
}

// ---- 設定ビュー ----

function renderSettingsView() {
  const s = state.settings;
  return `
    <section class="est-doc">
      <h2>設定</h2>
      <div class="est-settings-grid">
        <label><span>消費税率（%）</span><input type="number" step="any" data-setting="taxRate" value="${s.taxRate * 100}" /></label>
        <label><span>目標粗利率（%）</span><input type="number" step="any" data-setting="targetMargin" value="${s.targetMargin * 100}" /></label>
        <label><span>最低粗利率・警告（%）</span><input type="number" step="any" data-setting="minMargin" value="${s.minMargin * 100}" /></label>
        <label><span>会社名</span><input data-setting="companyName" value="${escapeHtml(s.companyName)}" /></label>
        <label><span>代表者</span><input data-setting="representative" value="${escapeHtml(s.representative)}" /></label>
      </div>
      <h3 class="est-section-title">データ</h3>
      <div class="est-data-actions">
        <button class="secondary-button" data-action="load-master">Aetherサンプル（156明細）を読み込み直す</button>
        <button class="secondary-button" data-action="clear-all">全明細をクリアして新規見積を作る</button>
      </div>
      <p class="est-hint">明細と設定はこのブラウザ（localStorage）に自動保存されます。サンプル読み込みとクリアは現在の明細を置き換えるため、必要ならその前にPDF出力で控えを残してください。</p>
    </section>
  `;
}

// ---- 印刷（PDF出力） ----

function renderPrintQuote() {
  const grand = grandTotals();
  return `
    <header class="print-head">
      <p class="print-eyebrow">御見積書</p>
      <h1>${escapeHtml(state.customerName ? `${state.customerName} 様` : "御見積書")}</h1>
      <p class="print-meta">工事名：${escapeHtml(state.projectName)}　作成日：${formatDate(state.date)}　${escapeHtml(state.settings.companyName)}　代表 ${escapeHtml(state.settings.representative)}</p>
    </header>
    <p class="print-grand">御見積金額（税込） <strong>${yen(grand.taxIncluded)}</strong>（税抜 ${yen(grand.customer)}／消費税 ${yen(grand.tax)}・端数切り捨て）</p>
    ${renderQuoteSummaryTable()}
    ${getRooms().map((room) => renderQuoteDetailTable(room)).join("")}
    <footer class="print-foot">${escapeHtml(state.settings.companyName)}</footer>
  `;
}

function renderPrintBudget() {
  return `
    <header class="print-head">
      <p class="print-eyebrow">社内資料</p>
      <h1>社内実行予算書</h1>
      <p class="print-meta">工事名：${escapeHtml(state.projectName)}　作成日：${formatDate(state.date)}　目標粗利率 ${pct(state.settings.targetMargin)}</p>
    </header>
    ${renderBudgetView()}
    <footer class="print-foot">${escapeHtml(state.settings.companyName)}（社外秘）</footer>
  `;
}

function exportPdf() {
  const sheet = document.createElement("div");
  sheet.className = "print-sheet est-print";
  sheet.innerHTML = view === "budget" || view === "analysis" ? renderPrintBudget() : renderPrintQuote();
  document.body.appendChild(sheet);
  document.body.classList.add("is-printing");

  const cleanup = () => {
    sheet.remove();
    document.body.classList.remove("is-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

// ---- 全体レンダリング ----

const VIEWS = [
  { id: "input", label: "入力" },
  { id: "quote", label: "お客様見積書" },
  { id: "budget", label: "実行予算" },
  { id: "analysis", label: "粗利分析" },
  { id: "settings", label: "設定" },
];

function renderView() {
  if (view === "quote") return renderQuoteView();
  if (view === "budget") return renderBudgetView();
  if (view === "analysis") return renderAnalysisView();
  if (view === "settings") return renderSettingsView();
  return renderInputView();
}

function render() {
  const grand = grandTotals();
  const grandLabel = judgment(grand.margin);
  app.innerHTML = `
    <main class="shell est-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Aether Estimate / ${state.items.length} 明細</p>
          <h1>見積・実行予算システム</h1>
          <p class="lead">一度の入力で、お客様見積書・社内実行予算書・粗利分析に反映されます。</p>
        </div>
        <div class="header-actions">
          <span data-save-state>保存済み</span>
          <button class="ghost-button" data-action="export-pdf">PDF出力</button>
          <a class="ghost-button" href="../">経営伴走アプリへ</a>
        </div>
      </header>

      <section class="stats est-stats" aria-label="全体サマリー">
        <div><span>税込見積合計</span><strong>${yen(grand.taxIncluded)}</strong></div>
        <div><span>粗利額</span><strong>${yen(grand.profit)}</strong></div>
        <div><span>粗利率</span><strong class="${judgmentClass(grandLabel)}">${pct(grand.margin)}<em class="est-badge ${judgmentClass(grandLabel)}">${grandLabel}</em></strong></div>
      </section>

      <nav class="est-tabs" aria-label="画面切り替え">
        ${VIEWS.map((v) => `<button class="est-tab ${view === v.id ? "is-active" : ""}" data-view="${v.id}">${v.label}</button>`).join("")}
      </nav>

      <section class="study-panel est-panel">
        ${renderView()}
      </section>
    </main>
  `;
}

// ---- 操作 ----

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function updateItemField(item, field, target) {
  if (field === "display") {
    item.display = target.checked;
  } else if (["qty", "custUnitPrice", "custManualAmount", "execQty", "execUnitPrice", "execManualAmount"].includes(field)) {
    item[field] = parseNumber(target.value);
    if (field === "qty" && item.execQty === null) item.execQty = item[field];
  } else {
    item[field] = target.value;
  }
  // 実行数量・単位は簡略化のため数量・単位に追従（個別入力は手入力金額で調整）
  if (field === "qty") item.execQty = item[field];
  if (field === "unit") item.execUnit = target.value;
}

app.addEventListener("change", (event) => {
  const target = event.target;

  const settingField = target.dataset.setting;
  if (settingField) {
    if (["taxRate", "targetMargin", "minMargin"].includes(settingField)) {
      const n = parseNumber(target.value);
      if (n !== null) state.settings[settingField] = n / 100;
    } else {
      state.settings[settingField] = target.value;
    }
    scheduleSave();
    render();
    return;
  }

  const docField = target.dataset.docField;
  if (docField) {
    state[docField] = target.value;
    scheduleSave();
    return;
  }

  const field = target.dataset.field;
  if (field) {
    const row = target.closest("[data-item-id]");
    const item = state.items.find((i) => i.id === row?.dataset.itemId);
    if (!item) return;
    updateItemField(item, field, target);
    scheduleSave();
    render();
  }
});

app.addEventListener("toggle", (event) => {
  const details = event.target;
  if (!details.matches?.(".est-room")) return;
  if (details.open) openRooms.add(details.dataset.room);
  else openRooms.delete(details.dataset.room);
}, true);

app.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    view = viewButton.dataset.view;
    render();
    return;
  }

  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "export-pdf") {
    exportPdf();
  }

  if (action === "add-room") {
    const name = prompt("工区・部屋の名前を入力してください（例：キッチン）");
    if (!name?.trim()) return;
    const item = createItem(name.trim());
    state.items.push(item);
    openRooms.add(name.trim());
    persist(true);
    render();
  }

  if (action === "rename-room") {
    const from = target.dataset.room;
    const to = prompt("新しい工区名を入力してください", from);
    if (!to?.trim() || to === from) return;
    for (const item of state.items) {
      if (item.room === from) item.room = to.trim();
    }
    openRooms.delete(from);
    openRooms.add(to.trim());
    persist(true);
    render();
  }

  if (action === "add-item") {
    const room = target.dataset.room;
    const last = roomItems(room).at(-1);
    const index = last ? state.items.indexOf(last) + 1 : state.items.length;
    state.items.splice(index, 0, createItem(room));
    persist(true);
    render();
  }

  if (action === "delete-item") {
    const row = target.closest("[data-item-id]");
    const item = state.items.find((i) => i.id === row?.dataset.itemId);
    if (!item) return;
    if (item.item.trim() && !confirm(`「${item.item}」を削除しますか？`)) return;
    state.items = state.items.filter((i) => i !== item);
    persist(true);
    render();
  }

  if (action === "load-master") {
    if (state.items.length && !confirm("現在の明細をAetherサンプル（156明細）で置き換えます。よろしいですか？")) return;
    try {
      applyMaster(await loadMaster());
      view = "input";
      persist(true);
      render();
    } catch (error) {
      alert(error.message);
    }
  }

  if (action === "clear-all") {
    if (!confirm("全明細と設定を初期化します。よろしいですか？")) return;
    state = createEmptyState();
    openRooms.clear();
    view = "input";
    persist(true);
    render();
  }
});

async function boot() {
  const saved = loadState();
  if (saved) {
    state = saved;
    const first = getRooms()[0];
    if (first) openRooms.add(first);
  } else {
    state = createEmptyState();
    try {
      applyMaster(await loadMaster());
      persist(false);
    } catch {
      // マスターが読めなくても空の状態で起動する
    }
  }
  render();
}

boot();
