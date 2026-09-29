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
  var pocketsEl = document.getElementById("pockets");
  var pocketCardsEl = document.getElementById("pocket-cards");

  var tipEl = document.getElementById("tip");

  var lastRaw = null;
  var hasData = false;
  var busy = false;
  var queued = false;
  var sawHidden = false;

  var TIPS = {
    "way-ahead": [
      "Look at you, swimming in cash like Scrooge McDuck.",
      "Date night? The budget says yes.",
      "The cushion is fluffy. Do a little dance.",
      "Future you is already grateful.",
      "You are so early the month is still tying its shoes.",
      "This much room should be celebrated. Enjoy it.",
      "Treat yourselves. The numbers said please."
    ],
    "ahead": [
      "A little ahead, and it looks good on you.",
      "Quiet win. The good snacks can stay.",
      "Breathing room achieved. No cape required.",
      "The pace is back there somewhere, waving.",
      "Soft money, softer landing.",
      "Keep this up and the 1st will feel like a gift.",
      "Nice cushion. Guard it like the last cookie."
    ],
    "on-pace": [
      "Right on the money. Literally.",
      "Steady as she goes.",
      "This is the plan, and the plan likes you.",
      "Not too spicy, not too plain. Just right.",
      "Goldilocks would high-five this month.",
      "Walking the line, and the line is friendly.",
      "Textbook. The budget is smiling.",
      "On the rails. Choo choo, but make it responsible."
    ],
    "slightly-over": [
      "Easy, tiger. Maybe skip the Target run.",
      "A smidge hot. Nothing a quiet week cannot cool.",
      "The budget raised an eyebrow, not an alarm.",
      "Close. The couch does not need another pillow.",
      "Gentle brakes. You can still stick the landing.",
      "Warm, not on fire. Home dinner is a power move.",
      "A tiny detour. The month is still on your side.",
      "We can land this. Leftovers are a love language."
    ],
    "way-over": [
      "Whoa there. Wallets in the drawer until the 1st.",
      "The budget called. It wants its money back.",
      "Plot twist: the couch and a walk are free.",
      "Park the cart. Wave at the store from the parking lot.",
      "The fun can wait. The reset cannot.",
      "Deep breath. The 1st brings a fresh start.",
      "Leftovers-and-library week. We have done harder things.",
      "Let us admire things through the window for a bit."
    ],
    "over-budget": [
      "Every dollar has a job, and some of them are working overtime.",
      "The allowance is spent. Creativity is still on the clock.",
      "We crossed the line and kept jogging. Walking is free.",
      "The jar tipped over. We will set it upright next month.",
      "Over the line, under the drama. Fresh start on the 1st.",
      "Budget used up. The rest is a bonus round of free fun.",
      "Empty envelope, full of information. Next month is a clean page.",
      "Spent the plan. The 1st gets a brand-new one."
    ]
  };

  var CARD_TIPS = {
    "way-ahead": [
      "Date night is a yes.",
      "Quack. The cushion is real.",
      "So early. Enjoy it.",
      "The numbers said please.",
      "Future you says thanks.",
      "Room to spare. Dance.",
      "Treat yourselves a little."
    ],
    "way-over": [
      "Wallets away until the 1st.",
      "The budget wants a word.",
      "Couch and a walk are free.",
      "Park the cart for now.",
      "Reset button: the 1st.",
      "Window-shopping counts.",
      "The fun can wait a bit."
    ],
    "over-budget": [
      "Some dollars are on overtime.",
      "Spent, not doomed.",
      "Fresh start on the 1st.",
      "Over the line, under the drama.",
      "We will right the jar.",
      "Walking is free from here.",
      "Next month, a clean page."
    ]
  };

  var BAND_COLOR = {
    "way-ahead": "teal",
    "ahead": "teal",
    "on-pace": "navy",
    "slightly-over": "amber",
    "way-over": "brick",
    "over-budget": "brick"
  };

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

  function paceBand(spentCents, budgetCents, day, days) {
    if (!(budgetCents > 0)) return spentCents > 0 ? "over-budget" : "on-pace";
    if (spentCents > budgetCents) return "over-budget";
    var pace = days > 0 ? Math.round(budgetCents * day / days) : 0;
    var ratio = (spentCents - pace) / budgetCents;
    if (ratio <= -0.15) return "way-ahead";
    if (ratio <= -0.05) return "ahead";
    if (ratio <= 0.03) return "on-pace";
    if (ratio <= 0.10) return "slightly-over";
    return "way-over";
  }

  function pickTip(band, previous, avoid, source) {
    var list = (source && source[band]) || TIPS[band] || TIPS["on-pace"];
    var pool = list.filter(function (line) {
      return line !== previous && (!avoid || avoid.indexOf(line) === -1);
    });
    if (!pool.length) pool = list.filter(function (line) { return line !== previous; });
    if (!pool.length) pool = list;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function paintTip(node, band, className, avoid) {
    node.hidden = false;
    node.dataset.band = band;
    var source = className === "card-tip" ? CARD_TIPS : null;
    node.textContent = pickTip(band, node.textContent, avoid, source);
    node.className = className + " " + BAND_COLOR[band];
  }

  function rollTips() {
    if (tipEl.dataset.band) paintTip(tipEl, tipEl.dataset.band, "tip");
    var notes = cardsEl.querySelectorAll(".card-tip");
    var used = [];
    for (var i = 0; i < notes.length; i++) {
      paintTip(notes[i], notes[i].dataset.band, "card-tip", used);
      used.push(notes[i].textContent);
    }
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
    tipEl.dataset.band = paceBand(spent, totalBudget, day, days);
    paintTip(tipEl, tipEl.dataset.band, "tip");
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
    var usedTips = [];
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
      var band = paceBand(cat.spent, cat.budget, day, days);
      if (band === "way-ahead" || band === "way-over" || band === "over-budget") {
        var note = $("p", "card-tip");
        note.dataset.band = band;
        paintTip(note, band, "card-tip", usedTips);
        usedTips.push(note.textContent);
        card.appendChild(note);
        card.setAttribute("aria-label", card.getAttribute("aria-label") + ". " + note.textContent);
      }
      cardsEl.appendChild(card);
    });

    renderPockets(data.pockets);
    hasData = true;
  }

  function readPockets(pockets) {
    if (pockets == null) return [];
    if (!Array.isArray(pockets)) throw new Error("pockets must be an array");
    return pockets.map(function (pocket) {
      if (!pocket || typeof pocket.name !== "string" || !pocket.name) throw new Error("pocket name missing");
      var funded = toCents(pocket.funded);
      var spentCents = toCents(pocket.spent);
      if (!Number.isFinite(funded) || funded < 0 || !Number.isFinite(spentCents) || spentCents < 0) {
        throw new Error("pocket amounts missing");
      }
      return { name: pocket.name, funded: funded, spent: spentCents };
    });
  }

  function renderPockets(raw) {
    var pockets = readPockets(raw);
    pocketCardsEl.replaceChildren();
    if (!pockets.length) {
      pocketsEl.hidden = true;
      return;
    }
    pockets.forEach(function (pocket) {
      var over = pocket.spent > pocket.funded;
      var level = over ? "bad" : "good";
      var leftLabel = remainText(pocket.funded, pocket.spent);
      var ofLabel = moneyCents(pocket.spent) + " of " + moneyExact(pocket.funded);
      var summary = leftLabel + ", " + ofLabel;
      var card = $("article", "card pocket " + level);
      card.setAttribute("aria-label", pocket.name + ", " + summary);

      card.appendChild($("h2", null, pocket.name));
      var line = $("p", "pocket-line");
      line.appendChild($("span", "remain " + level, leftLabel));
      line.appendChild(document.createTextNode(", " + ofLabel));
      card.appendChild(line);

      var track = $("div", "track");
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", pocket.name + " pocket, " + summary);
      setFill(track, pocket.spent, pocket.funded, level);
      card.appendChild(track);
      pocketCardsEl.appendChild(card);
    });
    pocketsEl.hidden = false;
  }

  function showError(message) {
    if (hasData) {
      notice.hidden = false;
      notice.textContent = "Couldn't refresh. Showing the last numbers loaded.";
      return;
    }
    statusEl.className = "status";
    statusEl.textContent = message;
    tipEl.hidden = true;
    hero.hidden = true;
    cardsEl.replaceChildren();
    pocketCardsEl.replaceChildren();
    pocketsEl.hidden = true;
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
        if (raw === lastRaw) {
          if (sawHidden) {
            sawHidden = false;
            rollTips();
          }
          return;
        }
        var data = JSON.parse(raw);
        render(data);
        lastRaw = raw;
        sawHidden = false;
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

  retry.addEventListener("click", function () {
    sawHidden = true;
    refresh();
  });
  window.addEventListener("focus", schedule);
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") sawHidden = true;
    schedule();
  });
  refresh();
})();
