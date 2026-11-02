// Siden virker uden JavaScript. Dette er kun små forbedringer.

// Hero: chatfeltet. Når I vælger en agent i feltets bund, bliver "Hey Kasper, byg os lige …" skrevet færdigt,
// prikkerne skriver, og memojien svarer med agentens navn og beskrivelse.
// Agenterne er fem opgaver fra jobopslaget hos ed.
// Uden JavaScript står "Hey Kasper, byg os lige en sortiments-agent" i feltet, Sortiments-agenten vises, og valgene er skjult.

(function () {
  var hero = document.querySelector(".hero-pick");
  var picker = hero && hero.querySelector("[data-picker]");
  if (!picker) return;

  var picks = Array.prototype.slice.call(picker.querySelectorAll(".pick"));
  var hint = hero.querySelector("[data-picker-hint]");
  var hey = hero.querySelector(".hey");
  var typed = hero.querySelector("[data-typed]");
  var live = hero.querySelector("[data-scene-live]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = picks.filter(function (p) { return p.getAttribute("aria-pressed") === "true"; })[0] || picks[0];

  var panel = function (btn) { return document.getElementById(btn.getAttribute("data-show")); };

  // Navnet deles op i bogstaver og beskrivelsen i ord, så de kan glide ind ét ad gangen.
  // Skærmlæsere får navnet som én tekst.
  var split = function (el, byChar) {
    var text = el.textContent.trim();
    var n = 0;
    var box = document.createElement("span");
    text.split(/\s+/).forEach(function (word, i) {
      if (i) box.appendChild(document.createTextNode(" "));
      var wd = document.createElement("span");
      wd.className = "wd";
      if (byChar) {
        word.split("").forEach(function (c) {
          var ch = document.createElement("span");
          ch.className = "ch";
          ch.style.setProperty("--d", n++);
          ch.textContent = c;
          wd.appendChild(ch);
        });
      } else {
        wd.style.setProperty("--d", n++);
        wd.textContent = word;
      }
      box.appendChild(wd);
    });
    el.textContent = "";
    if (byChar) {
      var sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = text;
      box.setAttribute("aria-hidden", "true");
      el.appendChild(sr);
    }
    el.appendChild(box);
  };

  picks.forEach(function (btn) {
    var item = panel(btn);
    item.hidden = false;
    item.classList.toggle("is-off", btn !== current);
    split(item.querySelector(".scene-title"), true);
    split(item.querySelector(".scene-text"), false);
  });

  // Prikkerne taler, mens Kasper "skriver" sit svar.
  var talkTimer;
  var talk = function (ms) {
    if (reduce.matches) return;
    hey.classList.add("is-talking");
    clearTimeout(talkTimer);
    talkTimer = setTimeout(function () { hey.classList.remove("is-talking"); }, ms || 1400);
  };

  // Teksten i feltet bliver slettet og skrevet igen, bogstav for bogstav. Ved reduceret bevægelse skiftes den bare.
  var typeTimer;
  var type = function (text, done, erased) {
    clearTimeout(typeTimer);
    if (reduce.matches) {
      typed.textContent = text;
      hey.classList.remove("is-typing", "is-busy");
      if (erased) erased();
      if (done) done();
      return;
    }
    hey.classList.add("is-typing", "is-busy");
    // Det fælles stykke ("en " på dansk, "a " på engelsk) bliver stående, så kun agentens navn skrives om
    var keep = text.indexOf(" ") + 1;
    if (typed.textContent.slice(0, keep) !== text.slice(0, keep)) keep = 0;
    var erase = function () {
      var t = typed.textContent;
      if (t.length > keep) {
        typed.textContent = t.slice(0, -1);
        typeTimer = setTimeout(erase, 8);
      } else {
        if (erased) erased();
        write(t.length);
      }
    };
    var write = function (i) {
      if (i <= text.length) {
        typed.textContent = text.slice(0, i);
        typeTimer = setTimeout(function () { write(i + 1); }, 18);
      } else {
        hey.classList.remove("is-busy");
        typeTimer = setTimeout(function () { hey.classList.remove("is-typing"); }, 700);
        if (done) done();
      }
    };
    erase();
  };

  var show = function (btn) {
    var prev = panel(current);
    var next = panel(btn);
    if (prev === next) return;

    prev.classList.remove("is-in");
    prev.classList.add("is-out");
    clearTimeout(prev.outTimer);
    prev.outTimer = setTimeout(function () {
      prev.classList.remove("is-out");
      prev.classList.add("is-off");
    }, reduce.matches ? 150 : 140);

    clearTimeout(next.outTimer);
    next.classList.remove("is-off", "is-out", "is-in");
    void next.offsetWidth; // starter animationen forfra
    next.classList.add("is-in"); // ved reduceret bevægelse bliver det en stille fade (se CSS)
    current = btn;
  };

  var select = function (btn) {
    if (btn === current && !hey.classList.contains("is-busy")) return;
    picks.forEach(function (p) { p.setAttribute("aria-pressed", p === btn ? "true" : "false"); });
    hero.setAttribute("data-glow", btn.getAttribute("data-glow"));
    if (live) live.textContent = btn.getAttribute("aria-label") + ". " + panel(btn).querySelector(".scene-text").textContent;
    talk(1600);
    // Svaret kommer, så snart det gamle navn er slettet, mens det nye bliver skrevet
    type(btn.getAttribute("data-prompt"), null, function () { show(btn); });
  };

  picks.forEach(function (btn) {
    btn.addEventListener("click", function () { select(btn); });
  });

  // Piletasterne skifter agent, når valgene har fokus.
  picker.addEventListener("keydown", function (e) {
    var i = picks.indexOf(picks.filter(function (p) { return p.getAttribute("aria-pressed") === "true"; })[0]);
    var to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: picks.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    var btn = picks[Math.max(0, Math.min(picks.length - 1, to))];
    select(btn);
    btn.focus();
  });

  // På mobil kan man stryge til siden på svaret eller valgene for at skifte.
  var swipe = function (el) {
    var start = null;
    el.addEventListener("pointerdown", function (e) {
      if (e.isPrimary) start = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener("pointerup", function (e) {
      if (!start) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      var pressed = picks.filter(function (p) { return p.getAttribute("aria-pressed") === "true"; })[0];
      var i = picks.indexOf(pressed) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < picks.length) select(picks[i]);
    });
    el.addEventListener("pointercancel", function () { start = null; });
  };
  swipe(hero.querySelector("[data-swipe]"));
  swipe(picker);

  picker.hidden = false;
  if (hint) hint.hidden = false;
  panel(current).classList.add("is-in");
  // Når siden åbner, bliver prompten skrevet én gang, og prikkerne svarer
  if (!reduce.matches) {
    setTimeout(function () {
      talk(1400);
      type(current.getAttribute("data-prompt"));
    }, 300);
  }
})();

// Knappen i toppen skifter mellem lyst og mørkt tema og husker valget i browseren.
var toggle = document.querySelector("[data-theme-toggle]");
if (toggle) {
  var root = document.documentElement;
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  var current = function () {
    return root.getAttribute("data-theme") || (prefersDark.matches ? "dark" : "light");
  };
  var render = function () {
    var dark = current() === "dark";
    toggle.setAttribute("data-active", dark ? "dark" : "light");
    var en = document.documentElement.lang === "en";
    toggle.setAttribute("aria-label", dark ? (en ? "Switch to light theme" : "Skift til lyst tema") : (en ? "Switch to dark theme" : "Skift til mørkt tema"));
    // Browserens farve (adresselinjen på mobil) følger det valgte tema.
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute("content", dark ? "#0B0D24" : "#FFFFFF");
    });
  };
  toggle.hidden = false;
  render();
  prefersDark.addEventListener("change", render);
  toggle.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("tema", next); } catch (e) {}
    render();
  });
}

// Afsløring ved scroll: overskrifter og grupper glider stille ind første gang, de kommer frem.
// Kun når browseren kan det, så intet indhold nogensinde bliver hængende usynligt.
(function () {
  if (!("IntersectionObserver" in window)) return;
  var groups = [
    ".section:not(.hero) > h2", ".split-text", ".section > .lede-small", ".process-intro",
    ".about-text", ".cases-head", ".case-card", ".tool", ".contact-list li"
  ];
  var els = [];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) {
      el.setAttribute("data-reveal", "");
      // Elementer i samme gruppe kommer lidt efter hinanden (højst 5 trin, så intet venter længe)
      if (/li|item|tool|card/.test(sel)) el.style.setProperty("--i", Math.min(i, 5));
      els.push(el);
    });
  });
  if (!els.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.documentElement.classList.add("js-reveal");
  els.forEach(function (el) { io.observe(el); });
})();

// Værktøjer: prikkerne viger for musen (eller fingeren) som et magnetfelt, fliserne retter sig op og trækkes mod den,
// når den kommer tæt på, og øjnene i stakken kigger efter den. Ved reduceret bevægelse står alt stille med CSS-prikkerne.
(function () {
  var stage = document.querySelector("[data-tools]");
  var canvas = stage && stage.querySelector(".tools-field");
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ctx = canvas.getContext("2d");
  var eyes = stage.querySelector("[data-eyes]");
  var svg = stage.querySelector("[data-stack]");
  var tools = Array.prototype.slice.call(stage.querySelectorAll(".tool")).map(function (li) {
    return { li: li, tile: li.querySelector(".tool-tile"), x: 0, y: 0, half: 30, hit: false };
  });

  var GAP = 18, RADIUS = 120, PUSH = 26, REACH = 190;
  var dots = [], w = 0, h = 0, dpr = 1, raf = 0;
  var pointer = { x: 0, y: 0, active: false, strength: 0 };
  var eye = { x: 0, y: 0 };
  var colors = { dot: "#A1A5BC", accent: "#1A1D56" };

  stage.classList.add("has-field");

  var readColors = function () {
    var cs = getComputedStyle(stage);
    colors.dot = cs.getPropertyValue("--plus").trim() || colors.dot;
    colors.accent = cs.getPropertyValue("--accent").trim() || colors.accent;
  };

  // Fliserne måles i forhold til fladen, uden deres egen transform
  var measure = function () {
    var r = stage.getBoundingClientRect();
    tools.forEach(function (t) {
      var el = t.tile, x = 0, y = 0;
      var keep = el.style.transform;
      el.style.transform = "none";
      var b = el.getBoundingClientRect();
      el.style.transform = keep;
      x = b.left - r.left + b.width / 2; y = b.top - r.top + b.height / 2;
      t.x = x; t.y = y; t.half = b.width / 2;
    });
  };

  var build = function () {
    var r = stage.getBoundingClientRect();
    w = r.width; h = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    var cols = Math.floor(w / GAP), rows = Math.floor(h / GAP);
    var offX = (w - (cols - 1) * GAP) / 2, offY = (h - (rows - 1) * GAP) / 2;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      dots.push({ hx: offX + i * GAP, hy: offY + j * GAP, ox: 0, oy: 0, vx: 0, vy: 0, f: 0 });
    }
    readColors(); measure(); draw();
  };

  var draw = function () {
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = .55; ctx.fillStyle = colors.dot;
    ctx.beginPath();
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (d.f > .02) continue;
      ctx.moveTo(d.hx + d.ox + 1.1, d.hy + d.oy); ctx.arc(d.hx + d.ox, d.hy + d.oy, 1.1, 0, 6.2832);
    }
    ctx.fill();
    // Prikkerne tæt på musen bliver lidt større og tager accentfarven
    ctx.fillStyle = colors.accent;
    for (var k = 0; k < dots.length; k++) {
      var e = dots[k];
      if (e.f <= .02) continue;
      ctx.globalAlpha = .55 + e.f * .4;
      ctx.beginPath(); ctx.arc(e.hx + e.ox, e.hy + e.oy, 1.1 + e.f * 1.3, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  var step = function () {
    raf = 0;
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * .12;
    var moving = pointer.strength > .01;

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i], tx = 0, ty = 0, f = 0;
      if (moving) {
        var dx = d.hx - pointer.x, dy = d.hy - pointer.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS && dist > .001) {
          f = (1 - dist / RADIUS); f = f * f * pointer.strength;
          tx = dx / dist * PUSH * f; ty = dy / dist * PUSH * f;
        }
      }
      // Fjeder tilbage mod hjemmet, med lidt efterslæb som sand
      d.vx = (d.vx + (tx - d.ox) * .1) * .78; d.vy = (d.vy + (ty - d.oy) * .1) * .78;
      d.ox += d.vx; d.oy += d.vy; d.f = f;
      if (Math.abs(d.ox) > .05 || Math.abs(d.vx) > .05 || Math.abs(d.oy) > .05) moving = true;
    }

    tools.forEach(function (t) {
      var dx = pointer.x - t.x, dy = pointer.y - t.y, dist = Math.sqrt(dx * dx + dy * dy);
      var p = Math.max(0, 1 - dist / REACH) * pointer.strength;
      var hit = pointer.active && dist < t.half + 6;
      t.tile.style.setProperty("--p", p.toFixed(3));
      t.tile.style.setProperty("--px", (dx * .12 * p).toFixed(2));
      t.tile.style.setProperty("--py", (dy * .12 * p).toFixed(2));
      if (hit !== t.hit) { t.hit = hit; t.li.classList.toggle("is-hit", hit); }
    });

    if (eyes && svg) {
      // Musens retning set fra ansigtets midte, omregnet til ansigtets skrå (isometriske) plan
      var sb = svg.getBoundingClientRect(), r = stage.getBoundingClientRect(), s = sb.width / 320;
      var cx = sb.left - r.left + 160 * s, cy = sb.top - r.top + 95 * s;
      var ex = 0, ey = 0;
      if (pointer.strength > .01) {
        var vx = pointer.x - cx, vy = pointer.y - cy, len = Math.sqrt(vx * vx + vy * vy) || 1;
        var amt = Math.min(1, len / 160) * pointer.strength;
        vx = vx / len * amt; vy = vy / len * amt;
        ex = (vx / 1.732 + vy) * 7; ey = (-vx / 1.732 + vy) * 7;
      }
      eye.x += (ex - eye.x) * .18; eye.y += (ey - eye.y) * .18;
      eyes.setAttribute("transform", "translate(" + eye.x.toFixed(2) + " " + eye.y.toFixed(2) + ")");
      if (Math.abs(ex - eye.x) > .02 || Math.abs(ey - eye.y) > .02) moving = true;
    }

    draw();
    if (moving || pointer.active) raf = requestAnimationFrame(step);
  };

  var kick = function () { if (!raf) raf = requestAnimationFrame(step); };
  var place = function (e) {
    var r = stage.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  };

  stage.addEventListener("pointerenter", function (e) { readColors(); measure(); place(e); pointer.active = true; kick(); });
  stage.addEventListener("pointermove", function (e) { place(e); pointer.active = true; kick(); });
  stage.addEventListener("pointerdown", function (e) { place(e); pointer.active = true; kick(); });
  ["pointerleave", "pointercancel"].forEach(function (type) {
    stage.addEventListener(type, function () { pointer.active = false; kick(); });
  });
  // På touch slipper fingeren feltet, når den løftes
  stage.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") { pointer.active = false; kick(); } });

  var resizeTimer = 0;
  new ResizeObserver(function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 80); }).observe(stage);
  // Temaskift ændrer prikkernes farve
  new MutationObserver(function () { readColors(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { readColors(); draw(); });
  build();
})();

// Sådan foregår det: kortene stables med position: sticky (CSS). Her skaleres de efter scroll:
// det kommende kort vokser fra 92 % til fuld størrelse, og hvert kort, der lægger sig ovenpå, gør de underliggende
// lidt mindre og mørkere. Kører kun, mens sektionen er på skærmen, og slet ikke ved reduceret bevægelse.
(function () {
  var stack = document.querySelector("[data-pstack]");
  if (!stack || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cards = Array.prototype.slice.call(stack.querySelectorAll(".pcard"));
  var raf = 0, visible = false;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  var update = function () {
    raf = 0;
    var vh = window.innerHeight;
    // Skaleringen sker fra toppen af kortet, så toppens position påvirkes ikke af den
    var info = cards.map(function (c) {
      return { el: c, stick: parseFloat(getComputedStyle(c).top) || 0, top: c.getBoundingClientRect().top, h: c.offsetHeight };
    });
    info.forEach(function (c, i) {
      // Hvor langt kortet er fra sin faste plads: 0 = på plads, 1 = et godt stykke nede
      var away = clamp((c.top - c.stick) / (vh * .55));
      var depth = 0;
      for (var j = i + 1; j < info.length; j++) {
        depth += clamp(1 - (info[j].top - info[j].stick) / Math.max(c.h, 1));
      }
      c.el.style.setProperty("--s", (1 - .08 * away - .04 * depth).toFixed(4));
      c.el.style.setProperty("--b", (1 - .05 * depth).toFixed(3));
    });
  };
  var kick = function () { if (visible && !raf) raf = requestAnimationFrame(update); };
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting; kick();
  }, { rootMargin: "20% 0px" }).observe(stack);
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  update();
})();
