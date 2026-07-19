const STORE_KEY = "aether-estimate:store:v2";
const LEGACY_KEY = "aether-estimate:v1";
const MASTER_URL = new URL("./data/estimate-master.json", import.meta.url);
const CATEGORIES = ["材料", "施工", "経費", "その他"];

const app = document.querySelector("#app");

let store = null;
let state = null;
let view = "input";
let saveTimer = null;
const openRooms = new Set();
const openMasterRooms = new Set();

function createEmptySettings() {
  return {
    taxRate: 0.1,
    targetMargin: 0.3,
    minMargin: 0.25,
    companyName: "株式会社Aether",
    representative: "伊藤 雄一",
  };
}

function createEmptyProject(projectName = "新規案件") {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectName,
    customerName: "",
    date: now.slice(0, 10),
    settings: { ...createEmptySettings(), ...(store?.masterSettings ?? {}) },
    items: [],
    createdAt: now,
    updatedAt: now,
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

function normalizeProject(raw) {
  const base = createEmptyProject();
  return {
    ...base,
    ...raw,
    id: raw.id ?? crypto.randomUUID(),
    settings: { ...base.settings, ...raw.settings },
    items: (raw.items ?? []).map(normalizeItem),
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        version: 2,
        currentId: parsed.currentId ?? null,
        masterSettings: parsed.masterSettings ?? null,
        masterItems: Array.isArray(parsed.masterItems) ? parsed.masterItems.map(normalizeItem) : null,
        projects: (parsed.projects ?? []).map(normalizeProject),
      };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const project = normalizeProject(JSON.parse(legacy));
      return { version: 2, currentId: project.id, masterSettings: null, masterItems: null, projects: [project] };
    }
  } catch {
    // 壊れたデータは初期状態で起動する
  }
  return { version: 2, currentId: null, masterSettings: null, masterItems: null, projects: [] };
}

function persist(feedback = true) {
  if (state) state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
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

function cloneItems(items) {
  return items.map((item) => ({ ...item, id: crypto.randomUUID() }));
}

function activateProject(project) {
  state = project;
  store.currentId = project.id;
  openRooms.clear();
  const first = getRooms()[0];
  if (first) openRooms.add(first);
}

function addProject(project) {
  store.projects.unshift(project);
  activateProject(project);
}

function createProjectFromMaster(projectName) {
  const project = createEmptyProject(projectName);
  project.items = cloneItems(store.masterItems ?? []);
  addProject(project);
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

function totalsFor(project) {
  const rooms = [];
  for (const item of project.items) {
    if (item.room && !rooms.includes(item.room)) rooms.push(item.room);
  }
  const customer = project.items.reduce((sum, item) => sum + customerAmount(item), 0);
  const exec = project.items.reduce((sum, item) => sum + execAmount(item), 0);
  const tax = rooms.reduce((sum, room) => {
    const roomCustomer = project.items
      .filter((item) => item.room === room)
      .reduce((acc, item) => acc + customerAmount(item), 0);
    return sum + Math.floor(roomCustomer * project.settings.taxRate);
  }, 0);
  return { customer, exec, tax, taxIncluded: customer + tax, profit: customer - exec, margin: customer ? (customer - exec) / customer : 0 };
}

function grandTotals() {
  return totalsFor(state);
}

function judgment(margin, settings = state.settings) {
  if (margin >= settings.targetMargin) return "OK";
  if (margin >= settings.minMargin) return "注意";
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
        <input class="est-name" data-field="item" list="est-master-list" value="${escapeHtml(item.item)}" placeholder="工事項目（マスターと一致で自動補完）" />
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
        <p>単価マスターの明細を読み込むか、工区を追加して入力を始めてください。</p>
        <div class="est-empty-actions">
          <button class="primary-button" data-action="load-master">単価マスターの明細を読み込む</button>
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
    ${renderMasterDatalist()}
  `;
}

function renderMasterDatalist() {
  const names = [...new Set((store.masterItems ?? []).map((item) => item.item).filter(Boolean))];
  return `<datalist id="est-master-list">${names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>`;
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

// ---- 案件一覧ビュー ----

function renderProjectsView() {
  const rows = [...store.projects].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return `
    <section class="est-doc">
      <h2>案件一覧</h2>
      <div class="est-data-actions">
        <button class="primary-button" data-action="new-from-master">＋ 新規案件（単価マスターの明細入り）</button>
        <button class="secondary-button" data-action="new-empty">＋ 新規案件（空）</button>
      </div>
      <div class="est-projects">
        ${rows
          .map((project) => {
            const totals = totalsFor(project);
            const label = judgment(totals.margin, project.settings);
            const isCurrent = project.id === state.id;
            return `
              <article class="est-project ${isCurrent ? "is-current" : ""}" data-project-id="${project.id}">
                <div class="est-project-main">
                  <strong>${escapeHtml(project.projectName)}</strong>
                  <small>${escapeHtml(project.customerName ? `${project.customerName} 様` : "お客様名未設定")}　作成日 ${formatDate(project.date)}　更新 ${new Date(project.updatedAt).toLocaleString("ja-JP")}　${project.items.length}明細</small>
                </div>
                <div class="est-project-numbers">
                  <span>税込 <strong>${yen(totals.taxIncluded)}</strong></span>
                  <span class="est-badge ${judgmentClass(label)}">${pct(totals.margin)} ${label}</span>
                </div>
                <div class="est-project-actions">
                  ${isCurrent ? `<span class="est-badge is-ok">編集中</span>` : `<button class="primary-button" data-action="open-project">開く</button>`}
                  <button class="secondary-button" data-action="duplicate-project">複製</button>
                  <button class="secondary-button" data-action="rename-project">名称変更</button>
                  <button class="ghost-button" data-action="delete-project">削除</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
      <p class="est-hint">案件ごとに明細・設定・お客様情報が保存されます。「複製」は同じ明細で新しい案件を作るので、類似工事の見積に便利です。</p>
    </section>
  `;
}

// ---- 単価マスタービュー ----

function renderMasterItemRow(entry) {
  return `
    <div class="est-item est-master-item" data-master-id="${entry.id}">
      <div class="est-item-head">
        <input class="est-name" data-master-field="item" value="${escapeHtml(entry.item)}" placeholder="工事項目" />
        <select data-master-field="category">
          ${CATEGORIES.map((c) => `<option value="${c}" ${entry.category === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <button class="est-delete" data-action="delete-master-item" title="このマスター行を削除">✕</button>
      </div>
      <div class="est-item-grid est-master-grid">
        <label><span>単位</span><input data-master-field="unit" value="${escapeHtml(entry.unit)}" /></label>
        <label><span>お客様単価</span><input type="number" step="any" inputmode="numeric" data-master-field="custUnitPrice" value="${numAttr(entry.custUnitPrice)}" /></label>
        <label><span>実行単価（原価）</span><input type="number" step="any" inputmode="numeric" data-master-field="execUnitPrice" value="${numAttr(entry.execUnitPrice)}" /></label>
        <label><span>商品名・品番</span><input data-master-field="productNote" value="${escapeHtml(entry.productNote)}" /></label>
        <label><span>定価・掛率・人工費</span><input data-master-field="priceNote" value="${escapeHtml(entry.priceNote)}" /></label>
      </div>
    </div>
  `;
}

function renderMasterView() {
  const items = store.masterItems ?? [];
  const rooms = [];
  for (const item of items) {
    if (item.room && !rooms.includes(item.room)) rooms.push(item.room);
  }
  return `
    <section class="est-doc">
      <h2>単価マスター</h2>
      <p class="est-hint">新規案件のひな形と、入力画面の自動補完（工事項目名がマスターと一致すると単価・単位・品番を自動入力）に使われます。マスターを変更しても既存案件の金額は変わりません。</p>
      <div class="est-data-actions">
        <button class="secondary-button" data-action="add-master-room">＋ 工区を追加</button>
        <button class="ghost-button" data-action="reset-master">Aether初期マスター（156明細）に戻す</button>
      </div>
      ${rooms
        .map((room) => {
          const roomEntries = items.filter((item) => item.room === room);
          return `
            <details class="est-room" data-scope="master" data-room="${escapeHtml(room)}" ${openMasterRooms.has(room) ? "open" : ""}>
              <summary>
                <span class="est-room-name">${escapeHtml(room)}<small>${roomEntries.length}件</small></span>
              </summary>
              <div class="est-room-body">
                ${roomEntries.map((entry) => renderMasterItemRow(entry)).join("")}
                <div class="est-room-actions">
                  <button class="secondary-button" data-action="add-master-item" data-room="${escapeHtml(room)}">＋ この工区にマスター行を追加</button>
                </div>
              </div>
            </details>
          `;
        })
        .join("")}
      ${rooms.length === 0 ? `<p>マスターが空です。「Aether初期マスターに戻す」で読み込めます。</p>` : ""}
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
      <p class="est-hint">この設定は現在編集中の案件に適用されます。案件の追加・複製・削除は「案件一覧」タブ、単価の既定値の管理は「単価マスター」タブで行えます。データはこのブラウザ（localStorage）に自動保存されます。</p>
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

function exportCsv() {
  const header = ["No", "部屋・工区", "カテゴリ", "工事項目", "数量", "単位", "お客様単価", "お客様手入力金額", "お客様金額", "実行単価", "実行手入力金額", "実行金額", "粗利額", "粗利率", "定価・掛率・人工費", "商品名・品番", "表示", "備考"];
  const escapeCsv = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [header.map(escapeCsv).join(",")];
  state.items.forEach((item, index) => {
    lines.push(
      [
        index + 1,
        item.room,
        item.category,
        item.item,
        item.qty ?? "",
        item.unit,
        item.custUnitPrice ?? "",
        item.custManualAmount ?? "",
        customerAmount(item),
        item.execUnitPrice ?? "",
        item.execManualAmount ?? "",
        execAmount(item),
        profitOf(item),
        `${(marginOf(item) * 100).toFixed(1)}%`,
        item.priceNote,
        item.productNote,
        item.display ? "表示" : "非表示",
        item.remark,
      ]
        .map(escapeCsv)
        .join(",")
    );
  });

  // BOM付きUTF-8にするとExcelで文字化けせずに開ける
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.projectName || "見積"}-明細-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  { id: "projects", label: "案件一覧" },
  { id: "input", label: "入力" },
  { id: "quote", label: "お客様見積書" },
  { id: "budget", label: "実行予算" },
  { id: "analysis", label: "粗利分析" },
  { id: "master", label: "単価マスター" },
  { id: "settings", label: "設定" },
];

function renderView() {
  if (view === "projects") return renderProjectsView();
  if (view === "quote") return renderQuoteView();
  if (view === "budget") return renderBudgetView();
  if (view === "analysis") return renderAnalysisView();
  if (view === "master") return renderMasterView();
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
          <p class="eyebrow">ゆずりえクラウド / ${escapeHtml(state.projectName)} / ${state.items.length} 明細</p>
          <h1>見積・実行予算システム</h1>
          <p class="lead">一度の入力で、お客様見積書・社内実行予算書・粗利分析に反映されます。</p>
        </div>
        <div class="header-actions">
          <span data-save-state>保存済み</span>
          <button class="ghost-button" data-action="export-csv">CSV出力</button>
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

function applyMasterDefaults(item, name) {
  const entry = store.masterItems?.find((m) => m.item && m.item === name.trim());
  if (!entry) return;
  if (!item.unit) {
    item.unit = entry.unit;
    item.execUnit = entry.unit;
  }
  if (item.custUnitPrice === null) item.custUnitPrice = entry.custUnitPrice;
  if (item.execUnitPrice === null) item.execUnitPrice = entry.execUnitPrice;
  if (!item.productNote) item.productNote = entry.productNote;
  if (!item.priceNote) item.priceNote = entry.priceNote;
  if (entry.category) item.category = entry.category;
}

function updateItemField(item, field, target) {
  if (field === "display") {
    item.display = target.checked;
  } else if (["qty", "custUnitPrice", "custManualAmount", "execQty", "execUnitPrice", "execManualAmount"].includes(field)) {
    item[field] = parseNumber(target.value);
    if (field === "qty" && item.execQty === null) item.execQty = item[field];
  } else {
    item[field] = target.value;
    if (field === "item") applyMasterDefaults(item, target.value);
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

  const masterField = target.dataset.masterField;
  if (masterField) {
    const row = target.closest("[data-master-id]");
    const entry = store.masterItems?.find((item) => item.id === row?.dataset.masterId);
    if (!entry) return;
    if (["custUnitPrice", "execUnitPrice"].includes(masterField)) {
      entry[masterField] = parseNumber(target.value);
    } else {
      entry[masterField] = target.value;
    }
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
  const set = details.dataset.scope === "master" ? openMasterRooms : openRooms;
  if (details.open) set.add(details.dataset.room);
  else set.delete(details.dataset.room);
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
    if (!store.masterItems?.length) {
      alert("単価マスターが空です。単価マスタータブから復元してください。");
      return;
    }
    if (state.items.length && !confirm(`現在の案件の明細を単価マスター（${store.masterItems.length}明細）で置き換えます。よろしいですか？`)) return;
    state.items = cloneItems(store.masterItems);
    openRooms.clear();
    const first = getRooms()[0];
    if (first) openRooms.add(first);
    view = "input";
    persist(true);
    render();
  }

  if (action === "export-csv") {
    exportCsv();
  }

  if (action === "new-from-master") {
    const name = prompt("新しい案件名を入力してください", `見積 ${new Date().toLocaleDateString("ja-JP")}`);
    if (!name?.trim()) return;
    createProjectFromMaster(name.trim());
    view = "input";
    persist(true);
    render();
  }

  if (action === "new-empty") {
    const name = prompt("新しい案件名を入力してください", `見積 ${new Date().toLocaleDateString("ja-JP")}`);
    if (!name?.trim()) return;
    addProject(createEmptyProject(name.trim()));
    view = "input";
    persist(true);
    render();
  }

  if (["open-project", "duplicate-project", "rename-project", "delete-project"].includes(action)) {
    const card = target.closest("[data-project-id]");
    const project = store.projects.find((p) => p.id === card?.dataset.projectId);
    if (!project) return;

    if (action === "open-project") {
      activateProject(project);
      view = "input";
      persist(false);
      render();
    }

    if (action === "duplicate-project") {
      const now = new Date().toISOString();
      const copy = {
        ...normalizeProject(project),
        id: crypto.randomUUID(),
        projectName: `${project.projectName}（複製）`,
        items: cloneItems(project.items),
        createdAt: now,
        updatedAt: now,
      };
      addProject(copy);
      persist(true);
      render();
    }

    if (action === "rename-project") {
      const name = prompt("案件名を入力してください", project.projectName);
      if (!name?.trim()) return;
      project.projectName = name.trim();
      persist(true);
      render();
    }

    if (action === "delete-project") {
      if (!confirm(`案件「${project.projectName}」を削除しますか？この操作は元に戻せません。`)) return;
      store.projects = store.projects.filter((p) => p !== project);
      if (project.id === state.id) {
        if (store.projects.length === 0) addProject(createEmptyProject("新規案件"));
        else activateProject(store.projects[0]);
      }
      persist(true);
      render();
    }
  }

  if (action === "add-master-room") {
    const name = prompt("単価マスターに追加する工区名を入力してください");
    if (!name?.trim()) return;
    store.masterItems ??= [];
    store.masterItems.push(createItem(name.trim()));
    openMasterRooms.add(name.trim());
    persist(true);
    render();
  }

  if (action === "add-master-item") {
    const room = target.dataset.room;
    const entries = store.masterItems.filter((item) => item.room === room);
    const last = entries.at(-1);
    const index = last ? store.masterItems.indexOf(last) + 1 : store.masterItems.length;
    store.masterItems.splice(index, 0, createItem(room));
    persist(true);
    render();
  }

  if (action === "delete-master-item") {
    const row = target.closest("[data-master-id]");
    const entry = store.masterItems?.find((item) => item.id === row?.dataset.masterId);
    if (!entry) return;
    if (entry.item.trim() && !confirm(`マスターから「${entry.item}」を削除しますか？`)) return;
    store.masterItems = store.masterItems.filter((item) => item !== entry);
    persist(true);
    render();
  }

  if (action === "reset-master") {
    if (!confirm("単価マスターをAether初期マスター（156明細）に戻します。現在のマスターの変更は失われます。よろしいですか？")) return;
    try {
      const master = await loadMaster();
      store.masterItems = master.items.map(normalizeItem);
      store.masterSettings = master.settings ?? null;
      persist(true);
      render();
    } catch (error) {
      alert(error.message);
    }
  }
});

async function boot() {
  store = loadStore();

  if (!store.masterItems) {
    try {
      const master = await loadMaster();
      store.masterItems = master.items.map(normalizeItem);
      store.masterSettings = master.settings ?? null;
    } catch {
      // マスターが読めなくても起動は続ける
    }
  }

  if (store.projects.length === 0) {
    createProjectFromMaster("リフォーム工事一式");
  } else {
    const current = store.projects.find((project) => project.id === store.currentId) ?? store.projects[0];
    activateProject(current);
  }

  if (store.projects.length > 1) view = "projects";
  persist(false);
  render();
}

boot();
