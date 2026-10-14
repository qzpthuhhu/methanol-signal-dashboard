(() => {
  const $ = (sel) => document.querySelector(sel);

  const fmtPct = (x, digits = 1) =>
    x == null || Number.isNaN(Number(x)) ? "—" : `${(Number(x) * 100).toFixed(digits)}%`;
  const fmtNum = (x, digits = 0) =>
    x == null || Number.isNaN(Number(x)) ? "—" : Number(x).toFixed(digits);
  const fmtRet = (x) =>
    x == null || Number.isNaN(Number(x))
      ? "—"
      : `${Number(x) >= 0 ? "+" : ""}${(Number(x) * 100).toFixed(2)}%`;
  const dirZh = (d) => (d === "up" ? "看涨" : d === "down" ? "看跌" : "—");
  const dirClass = (d) => (d === "up" ? "up" : d === "down" ? "down" : "");

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  }

  function renderBadges(latest) {
    const row = $("#badge-row");
    row.innerHTML = "";
    const add = (text, cls) => {
      const el = document.createElement("span");
      el.className = `badge ${cls || ""}`;
      el.textContent = text;
      row.appendChild(el);
    };
    if (!latest) return;
    if (latest.research_only) add("研究用途 research-only", "research");
    const sig = latest.signal || "";
    if (sig.includes("卖出")) add(sig, "sell");
    else if (sig.includes("警戒")) add(sig, "warn");
    else add(sig || "无信号", "hold");
    if (latest.display_symbol || latest.contract) {
      add(latest.display_symbol || latest.contract);
    }
    if (latest.asof_date) add(`asof ${latest.asof_date}`);
  }

  function renderLatest(data) {
    const L = data.latest;
    $("#latest-summary").textContent = data.summary_text || (L ? L.reason : "暂无信号");
    $("#latest-meta").textContent = L
      ? `生成 ${L.generated_at || "—"} · 模型 ${L.model_id || "—"}`
      : "";
    renderBadges(L);

    const metrics = $("#latest-metrics");
    metrics.innerHTML = "";
    const cells = [
      ["合约", L?.display_symbol || L?.contract || "—"],
      ["asof", L?.asof_date || "—"],
      ["收盘价", fmtNum(L?.entry_close, 0)],
      ["建议", L?.signal || "—"],
    ];
    for (const [label, value] of cells) {
      const div = document.createElement("div");
      div.className = "metric";
      div.innerHTML = `<div class="label">${label}</div><div class="value">${value}</div>`;
      metrics.appendChild(div);
    }

    const cards = $("#forecast-cards");
    cards.innerHTML = "";
    const horizons = [
      {
        title: "T+1（下一交易日）",
        dir: L?.t1_direction,
        prob: L?.t1_probability,
        ret: L?.t1_predicted_return,
        price: L?.t1_predicted_price,
        forecast: (L?.forecasts || []).find((f) => f.horizon_trading_days === 1),
      },
      {
        title: "T+5（第五交易日）",
        dir: L?.t5_direction,
        prob: L?.t5_probability,
        ret: L?.t5_predicted_return,
        price: L?.t5_predicted_price,
        forecast: (L?.forecasts || []).find((f) => f.horizon_trading_days === 5),
      },
    ];
    for (const h of horizons) {
      const f = h.forecast || {};
      const card = document.createElement("div");
      card.className = "fcard";
      card.innerHTML = `
        <h3>${h.title}</h3>
        <dl>
          <dt>方向</dt><dd class="${dirClass(h.dir)}">${dirZh(h.dir)}</dd>
          <dt>上涨概率</dt><dd>${fmtPct(h.prob)}</dd>
          <dt>预期收益</dt><dd>${fmtRet(h.ret)}</dd>
          <dt>目标价</dt><dd>${fmtNum(h.price, 0)}</dd>
          <dt>90%区间</dt><dd>${fmtNum(f.price_interval_90_low, 0)} – ${fmtNum(f.price_interval_90_high, 0)}</dd>
          <dt>训练样本</dt><dd>${f.training_rows ?? "—"}</dd>
        </dl>`;
      cards.appendChild(card);
    }

    if (data.exported_at) {
      $("#export-stamp").textContent = `数据导出时间：${data.exported_at}`;
    }
  }

  function renderMethod(data) {
    $("#method-lead").textContent = data.title || "";
    const ol = $("#method-steps");
    ol.innerHTML = "";
    for (const step of data.pipeline_steps || []) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${step.name}</strong> — ${step.detail}`;
      ol.appendChild(li);
    }
    let disc = data.disclaimer || "";
    if (data.gate?.reason) {
      disc += ` 当前闸门：${data.gate.reason}`;
    }
    $("#method-disclaimer").textContent = disc;
  }

  function renderFactors(data) {
    $("#factors-meta").textContent = data.panel_latest
      ? `面板最新行 ${data.panel_latest.date} · 非空 ${data.panel_latest.non_null_count}`
      : data.asof_date
        ? `信号 asof ${data.asof_date}`
        : "";

    const fill = (el, items) => {
      el.innerHTML = "";
      for (const it of items || []) {
        const li = document.createElement("li");
        const val =
          it.panel_value == null || it.panel_value === ""
            ? ""
            : `<span class="val">${typeof it.panel_value === "number" ? it.panel_value.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) : it.panel_value}</span>`;
        li.innerHTML = `<span><div>${it.label_zh}</div><div class="id">${it.id}</div></span>${val}`;
        el.appendChild(li);
      }
      if (!(items || []).length) {
        el.innerHTML = "<li>暂无因子</li>";
      }
    };
    fill($("#tech-list"), data.technical);
    fill($("#fund-list"), data.fundamental);

    const snaps = data.overlay_snapshots || [];
    const block = $("#overlay-block");
    if (!snaps.length) {
      block.hidden = true;
      return;
    }
    block.hidden = false;
    const tbody = $("#overlay-table tbody");
    tbody.innerHTML = "";
    for (const s of snaps) {
      const tr = document.createElement("tr");
      const val =
        s.value == null
          ? "—"
          : `${s.value}${s.unit ? " " + s.unit : ""}`;
      tr.innerHTML = `<td>${s.label || s.factor}</td><td>${val}</td><td>${s.signal_direction || "—"}</td><td>${s.note || ""}</td>`;
      tbody.appendChild(tr);
    }
  }

  function hitCell(hit, matured) {
    if (!matured) return '<td class="pending">未到期</td>';
    if (hit === true) return '<td class="hit">命中</td>';
    if (hit === false) return '<td class="miss">未中</td>';
    return '<td class="pending">—</td>';
  }

  function renderHistory(data) {
    const dates = (data.available_signal_dates || []).join("、") || "无";
    $("#history-meta").textContent = `可复原信号 asof：${dates} · 价格点 ${ (data.price_series || []).length }`;

    const notes = $("#history-notes");
    notes.innerHTML = "";
    for (const n of data.notes || []) {
      const li = document.createElement("li");
      li.textContent = n;
      notes.appendChild(li);
    }

    const tbody = $("#cmp-table tbody");
    tbody.innerHTML = "";
    for (const c of data.comparisons || []) {
      const tr = document.createElement("tr");
      const t1Pred = `${dirZh(c.t1_direction)} ${fmtPct(c.t1_probability)} → ${fmtNum(c.t1_predicted_price, 0)}`;
      const t5Pred = `${dirZh(c.t5_direction)} ${fmtPct(c.t5_probability)} → ${fmtNum(c.t5_predicted_price, 0)}`;
      const t1Act = c.matured_t1
        ? `${fmtNum(c.t1_actual_close, 0)} (${fmtRet(c.t1_actual_return)})`
        : "未到期";
      const t5Act = c.matured_t5
        ? `${fmtNum(c.t5_actual_close, 0)} (${fmtRet(c.t5_actual_return)})`
        : "未到期";
      tr.innerHTML = `
        <td>${c.asof_date}</td>
        <td>${c.display_symbol || c.contract || "—"}</td>
        <td>${fmtNum(c.entry_close, 0)}</td>
        <td>${c.signal || "—"}</td>
        <td>${t1Pred}</td>
        <td>${t1Act}</td>
        ${hitCell(c.t1_direction_hit, c.matured_t1)}
        <td>${t5Pred}</td>
        <td>${t5Act}</td>
        ${hitCell(c.t5_direction_hit, c.matured_t5)}`;
      tbody.appendChild(tr);
    }

    renderChart(data);
  }

  function renderChart(data) {
    const canvas = $("#price-chart");
    if (!window.Chart || !canvas) return;
    const series = data.price_series || [];
    const markers = data.signal_markers || [];
    const labels = series.map((p) => p.date);
    const closes = series.map((p) => p.close);

    const markerByDate = Object.fromEntries(markers.map((m) => [m.asof_date, m]));
    const markerPoints = series.map((p) => {
      const m = markerByDate[p.date];
      return m ? m.entry_close : null;
    });

    // Predicted T+1 / T+5 target overlays as scattered points on asof dates
    const t1Targets = series.map((p) => {
      const m = markerByDate[p.date];
      // find comparison for predicted prices
      const cmp = (data.comparisons || []).find((c) => c.asof_date === p.date);
      return cmp ? cmp.t1_predicted_price : null;
    });
    const t5Targets = series.map((p) => {
      const cmp = (data.comparisons || []).find((c) => c.asof_date === p.date);
      return cmp ? cmp.t5_predicted_price : null;
    });

    if (window.__priceChart) window.__priceChart.destroy();
    window.__priceChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "主力连续收盘价",
            data: closes,
            borderColor: "#3dd6c6",
            backgroundColor: "rgba(61, 214, 198, 0.12)",
            fill: true,
            tension: 0.15,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "信号日",
            data: markerPoints,
            borderColor: "#e6b450",
            backgroundColor: "#e6b450",
            showLine: false,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: "T+1 目标价",
            data: t1Targets,
            borderColor: "#7aa2ff",
            backgroundColor: "#7aa2ff",
            showLine: false,
            pointStyle: "triangle",
            pointRadius: 6,
          },
          {
            label: "T+5 目标价",
            data: t5Targets,
            borderColor: "#c792ea",
            backgroundColor: "#c792ea",
            showLine: false,
            pointStyle: "rectRot",
            pointRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#9aa8bc", boxWidth: 12 },
          },
          tooltip: {
            callbacks: {
              afterBody(items) {
                const idx = items[0]?.dataIndex;
                if (idx == null) return [];
                const date = labels[idx];
                const m = markerByDate[date];
                if (!m) return [];
                return [
                  `信号: ${m.signal || "—"}`,
                  `T+1 概率: ${fmtPct(m.t1_probability)}`,
                  `T+5 概率: ${fmtPct(m.t5_probability)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#9aa8bc",
              maxTicksLimit: 8,
              maxRotation: 0,
            },
            grid: { color: "rgba(45,58,79,0.6)" },
          },
          y: {
            ticks: { color: "#9aa8bc" },
            grid: { color: "rgba(45,58,79,0.6)" },
          },
        },
      },
    });
  }

  async function main() {
    try {
      const [latest, factors, history, method] = await Promise.all([
        loadJSON("data/latest.json"),
        loadJSON("data/factors.json"),
        loadJSON("data/history.json"),
        loadJSON("data/method.json"),
      ]);
      renderLatest(latest);
      renderMethod(method);
      renderFactors(factors);
      renderHistory(history);
    } catch (err) {
      $("#latest-summary").textContent =
        `加载失败：${err.message}\n请在 dashboard/ 目录运行 python -m http.server 后访问。`;
      console.error(err);
    }
  }

  function startWhenReady() {
    if (window.__DASH_UNLOCKED) {
      main();
      return;
    }
    window.addEventListener("dash-auth-ok", () => main(), { once: true });
  }
  startWhenReady();
})();
