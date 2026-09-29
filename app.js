(function () {
  "use strict";

  var banner = document.getElementById("banner");
  var monthEl = document.getElementById("month");
  var updatedEl = document.getElementById("updated");
  var statusEl = document.getElementById("status");
  var retry = document.getElementById("retry");
  var notice = document.getElementById("notice");
  var hero = document.getElementById("hero");
  var spendLabel = document.getElementById("spend-label");
  var spendTrack = document.getElementById("spend-track");
  var spendMarker = document.getElementById("spend-marker");
  var monthLabel = document.getElementById("month-label");
  var monthTrack = document.getElementById("month-track");
  var cardsEl = document.getElementById("cards");

  var lastRaw = null;
  var hasData = false;
  var busy = false;
  var queued = false;

  function $(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function toCents(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function formatMoney(cents, digits) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(cents / 100);
  }

  function moneyCents(cents) {
    return formatMoney(cents, 2);
  }

  function moneyExact(cents) {
    return cents % 100 === 0 ? formatMoney(cents, 0) : formatMoney(cents, 2);
  }

  function moneyWholeFromCents(cents) {
    return formatMoney(Math.round(cents / 100) * 100, 0);
  }

  function formatUpdated(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Updated " + String(iso);
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Phoenix",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).formatToParts(date);
    function part(type) {
      var found = parts.find(function (item) { return item.type === type; });
      return found ? found.value : "";
    }
    return "Updated " + part("weekday") + ", " + part("month") + " " + part("day") + ", " + part("year") + " at " + part("hour") + ":" + part("minute") + " " + part("dayPeriod") + " (AZ)";
  }

  function formatMonth(ym) {
    var match = /^(\d{4})-(\d{2})$/.exec(String(ym || ""));
    if (!match) return String(ym || "");
    var year = Number(match[1]);
    var monthIndex = Number(match[2]) - 1;
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(Date.UTC(year, monthIndex, 1)));
  }

  function dayInPhoenix(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    var part = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Phoenix",
      day: "numeric"
    }).formatToParts(date).find(function (p) {
      return p.type === "day";
    });
    return part ? Number(part.value) : null;
  }

  function resolveDay(data, days) {
    var raw = data.day_of_month;
    var day = raw == null || raw === "" ? null : Number(raw);
    if (!Number.isFinite(day)) day = dayInPhoenix(data.updated_at);
    if (!Number.isFinite(day)) day = 0;
    if (day < 0) day = 0;
    if (day > days) day = days;
    return day;
  }

  function classify(spentCents, budgetCents, day, days) {
    var pace = days > 0 ? Math.round(budgetCents * day / days) : 0;
    var under = pace - spentCents;
    var gapCents = Math.abs(under);
    var gapDollars = Math.round(gapCents / 100);
    var level = "good";
    if (under < 0 && gapDollars > 0) {
      var limit = Math.round(pace * 1.05);
      level = spentCents <= limit ? "warn" : "bad";
    }
    var headline = level === "good"
      ? "On track, " + moneyWholeFromCents(gapCents) + " under pace"
      : "Behind, " + moneyWholeFromCents(gapCents) + " over pace";
    return { pace: pace, under: under, level: level, headline: headline };
  }

  function remainText(budgetCents, spentCents) {
    var left = budgetCents - spentCents;
    if (left < 0) return moneyCents(-left) + " over";
    return moneyCents(left) + " left";
  }

  function setFill(track, centsSpent, centsBudget, level) {
    track.replaceChildren();
    var fill = $("div", "fill " + level);
    var pct = 0;
    if (centsBudget > 0) pct = (centsSpent / centsBudget) * 100;
    else if (centsSpent > 0) pct = 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    fill.style.width = pct + "%";
    track.appendChild(fill);
    return pct;
  }

  function setMarker(marker, day, days) {
    var pct = days > 0 ? (day / days) * 100 : 0;
    marker.hidden = false;
    marker.style.left = pct + "%";
    return pct;
  }

  function render(data) {
    if (!data || !Array.isArray(data.categories)) throw new Error("categories missing");
    var totalBudget = toCents(data.total_budget);
    var days = Number(data.days_in_month);
    if (!Number.isFinite(totalBudget) || !Number.isFinite(days) || days <= 0) {
      throw new Error("budget month missing");
    }
    if (!data.updated_at || !data.month) throw new Error("updated_at or month missing");

    var day = resolveDay(data, days);
    var spent = 0;
    var categories = data.categories.map(function (cat) {
      if (!cat || typeof cat.name !== "string" || !cat.name) throw new Error("category name missing");
      var budget = toCents(cat.budget);
      var spentCents = toCents(cat.spent);
      if (!Number.isFinite(budget) || !Number.isFinite(spentCents)) throw new Error("category amounts missing");
      spent += spentCents;
      return { name: cat.name, budget: budget, spent: spentCents };
    });

    var overall = classify(spent, totalBudget, day, days);
    var monthPct = Math.round((day / days) * 100);

    document.body.classList.toggle("sample", data.sample === true);
    banner.hidden = data.sample !== true;

    monthEl.textContent = formatMonth(data.month);
    updatedEl.textContent = formatUpdated(data.updated_at);
    statusEl.textContent = overall.headline;
    statusEl.className = "status " + overall.level;
    notice.hidden = true;
    retry.hidden = true;

    hero.hidden = false;
    hero.className = "panel " + overall.level;
    spendLabel.textContent = moneyCents(spent) + " spent of " + moneyExact(totalBudget) + ", " + remainText(totalBudget, spent);
    setFill(spendTrack, spent, totalBudget, overall.level);
    var markerPct = setMarker(spendMarker, day, days);
    spendTrack.setAttribute(
      "aria-label",
      spendLabel.textContent + ". Pace line at " + Math.round(markerPct) + "% of the month."
    );

    monthLabel.textContent = "Day " + day + " of " + days + " (" + monthPct + "%)";
    setFill(monthTrack, day, days, "month");
    monthTrack.setAttribute("aria-label", monthLabel.textContent);

    cardsEl.replaceChildren();
    categories.forEach(function (cat) {
      var status = classify(cat.spent, cat.budget, day, days);
      var card = $("article", "card " + status.level);
      var leftLabel = remainText(cat.budget, cat.spent);
      card.setAttribute(
        "aria-label",
        cat.name + ", " + moneyCents(cat.spent) + " of " + moneyExact(cat.budget) + ", " + leftLabel + ", " + status.headline
      );

      card.appendChild($("h2", null, cat.name));
      card.appendChild($("p", "ratio", moneyCents(cat.spent) + " / " + moneyExact(cat.budget)));
      card.appendChild($("p", "remain " + status.level, leftLabel));

      var mini = $("div", "mini");
      mini.appendChild($("span", null, "Spent"));
      var spentWrap = $("div", "track-wrap");
      var spentBar = $("div", "track");
      spentBar.setAttribute("role", "img");
      spentBar.setAttribute("aria-label", cat.name + " spent, " + status.headline);
      setFill(spentBar, cat.spent, cat.budget, status.level);
      var marker = $("div", "marker");
      setMarker(marker, day, days);
      spentWrap.appendChild(spentBar);
      spentWrap.appendChild(marker);
      mini.appendChild(spentWrap);

      mini.appendChild($("span", null, "Month"));
      var monthBar = $("div", "track");
      monthBar.setAttribute("role", "img");
      monthBar.setAttribute("aria-label", "Month " + monthLabel.textContent);
      setFill(monthBar, day, days, "month");
      mini.appendChild(monthBar);

      card.appendChild(mini);
      cardsEl.appendChild(card);
    });

    hasData = true;
  }

  function showError(message) {
    if (hasData) {
      notice.hidden = false;
      notice.textContent = "Couldn't refresh. Showing the last numbers loaded.";
      return;
    }
    statusEl.className = "status";
    statusEl.textContent = message;
    hero.hidden = true;
    cardsEl.replaceChildren();
    retry.hidden = false;
  }

  function refresh() {
    if (busy) {
      queued = true;
      return;
    }
    busy = true;
    var url = "./data.json?t=" + Date.now();
    fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Couldn't load budget data.");
        return res.text();
      })
      .then(function (raw) {
        if (raw === lastRaw) return;
        var data = JSON.parse(raw);
        render(data);
        lastRaw = raw;
      })
      .catch(function () {
        showError("Couldn't load budget data.");
      })
      .then(function () {
        busy = false;
        if (queued) {
          queued = false;
          refresh();
        }
      });
  }

  function schedule() {
    if (document.visibilityState === "hidden") return;
    refresh();
  }

  retry.addEventListener("click", refresh);
  window.addEventListener("focus", schedule);
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", schedule);
  refresh();
})();
