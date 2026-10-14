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
    const wf = data.walkforward;
    const n = (data.comparisons || []).length;
    const dates = data.available_signal_dates || [];
    const range =
      dates.length > 1 ? `${dates[0]} → ${dates[dates.length - 1]}` : dates[0] || "无";
    let meta = `Walk-forward ${n} 日 · ${range} · K线 ${ (data.candles || []).length }`;
    if (wf?.hit_rates) {
      const t1 = wf.hit_rates.t1 != null ? `${(wf.hit_rates.t1 * 100).toFixed(1)}%` : "—";
      const t5 = wf.hit_rates.t5 != null ? `${(wf.hit_rates.t5 * 100).toFixed(1)}%` : "—";
      meta += ` · T+1命中 ${t1} / T+5命中 ${t5}`;
    }
    $("#history-meta").textContent = meta;

    const notes = $("#history-notes");
    notes.innerHTML = "";
    for (const ntxt of data.notes || []) {
      const li = document.createElement("li");
      li.textContent = ntxt;
      notes.appendChild(li);
    }

    const tbody = $("#cmp-table tbody");
    tbody.innerHTML = "";
    // Newest first for scanning; chart stays chronological
    const rows = [...(data.comparisons || [])].reverse();
    for (const c of rows) {
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

    renderCandleChart(data);
  }

  function toUnix(dateStr) {
    // Exchange session date as UTC midnight for lightweight-charts
    return Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
  }

  function renderCandleChart(data) {
    const host = $("#candle-chart");
    if (!host || !window.LightweightCharts) {
      const fallback = $("#price-chart");
      if (fallback && window.Chart) {
        // legacy line fallback only if candle host missing
        console.warn("lightweight-charts unavailable; skip K-line");
      }
      return;
    }

    const candles = (data.candles || []).filter(
      (c) => c && c.date && c.open != null && c.high != null && c.low != null && c.close != null
    );
    if (!candles.length) {
      host.innerHTML = '<p class="hint" style="padding:1rem">暂无 OHLC K 线数据</p>';
      return;
    }

    host.innerHTML = "";
    if (window.__candleChart) {
      try {
        window.__candleChart.remove();
      } catch (_) {}
      window.__candleChart = null;
    }

    const chart = window.LightweightCharts.createChart(host, {
      layout: {
        background: { color: "#243044" },
        textColor: "#9aa8bc",
      },
      grid: {
        vertLines: { color: "rgba(45,58,79,0.6)" },
        horzLines: { color: "rgba(45,58,79,0.6)" },
      },
      rightPriceScale: { borderColor: "#2d3a4f" },
      timeScale: {
        borderColor: "#2d3a4f",
        timeVisible: false,
      },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    window.__candleChart = chart;

    const series = chart.addCandlestickSeries({
      upColor: "#3ecf8e",
      downColor: "#f07178",
      borderUpColor: "#3ecf8e",
      borderDownColor: "#f07178",
      wickUpColor: "#3ecf8e",
      wickDownColor: "#f07178",
    });
    series.setData(
      candles.map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // Predicted target overlays as line series (values known at asof; no future leak on chart)
    const cmpByDate = Object.fromEntries(
      (data.comparisons || []).map((c) => [c.asof_date, c])
    );
    const t1Line = [];
    const t5Line = [];
    for (const c of candles) {
      const cmp = cmpByDate[c.date];
      if (!cmp) continue;
      if (cmp.t1_predicted_price != null) {
        t1Line.push({ time: c.date, value: Number(cmp.t1_predicted_price) });
      }
      if (cmp.t5_predicted_price != null) {
        t5Line.push({ time: c.date, value: Number(cmp.t5_predicted_price) });
      }
    }
    if (t1Line.length) {
      const s1 = chart.addLineSeries({
        color: "#7aa2ff",
        lineWidth: 1,
        lineStyle: 2,
        title: "T+1 目标价",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      s1.setData(t1Line);
    }
    if (t5Line.length) {
      const s5 = chart.addLineSeries({
        color: "#c792ea",
        lineWidth: 1,
        lineStyle: 2,
        title: "T+5 目标价",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      s5.setData(t5Line);
    }

    // Signal markers: shape by direction; text only for matured hit/miss on T+1
    const markers = [];
    for (const c of data.comparisons || []) {
      if (!c.asof_date || !cmpByDate[c.asof_date]) continue;
      // only mark days that exist on candle axis
      if (!candles.some((x) => x.date === c.asof_date)) continue;
      const up = c.t1_direction === "up";
      let text = up ? "↑" : "↓";
      if (c.matured_t1 === true) {
        text += c.t1_direction_hit ? "✓" : "✗";
      } else {
        // unmatured: direction only, do not show hit/miss
        text += "·";
      }
      markers.push({
        time: c.asof_date,
        position: up ? "belowBar" : "aboveBar",
        color: up ? "#3ecf8e" : "#f07178",
        shape: up ? "arrowUp" : "arrowDown",
        text,
      });
    }
    if (markers.length) {
      series.setMarkers(markers);
    }

    const legend = document.createElement("div");
    legend.className = "chart-legend";
    legend.innerHTML =
      '<span class="lg-up">涨</span><span class="lg-down">跌</span>' +
      '<span class="lg-t1">T+1 目标</span><span class="lg-t5">T+5 目标</span>' +
      '<span class="lg-mark">箭头=信号方向；✓/✗ 仅已到期 T+1；未到期显示 ·</span>';
    host.appendChild(legend);

    chart.timeScale().fitContent();

    // Resize observer
    if (window.__candleRo) window.__candleRo.disconnect();
    window.__candleRo = new ResizeObserver(() => {
      // autoSize handles most cases
    });
    window.__candleRo.observe(host);
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
    const needsAuth = Boolean(document.getElementById("auth-gate") || window.DASH_AUTH);
    if (!needsAuth || window.__DASH_UNLOCKED) {
      main();
      return;
    }
    window.addEventListener("dash-auth-ok", () => main(), { once: true });
  }
  startWhenReady();
})();
