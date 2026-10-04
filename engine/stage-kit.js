// A component kit for lesson animations: the patterns every clip kept rebuilding by hand (a heading,
// lines that arrive with the words, chips, tables, bars against a capacity line, a stacked timeline,
// boxes with arrows and moving packets, a code card, a whiteboard, a step strip), each timed by the
// narration and drawn purely from t. Load after stage.js; styles are injected once.
//
// A module (long videos, see templates/long/clip.html) is written as
//
//   Kit.module("g1", (K) => {
//     K.heading("What gets graded", { at: "g1-vague" });
//     K.lines([{ html: "judgment", at: "g1-signals|judgment" }], { x: 60, y: 260 });
//   });
//
// and a one-off clip can do the same with Kit.clip(render => ...) (see kit/gallery). Times are anything
// Stage.time accepts: seconds, "scene", "scene#2", "scene|word", ["scene|word", 0.3]. Positions are stage
// pixels (1920x1080); keep x 60-1860 and, in long videos, y 120-1010. Tones: accent, good, bad, warn,
// violet, muted, ink. Every component takes { at, until } (appear, disappear) and { in: group }.
//
// Toasts are small pop-up badges that mark a moment the narration flags: 💡 a key idea, 🤔 the tricky
// part, 🧠 a callback. The kinds are fixed (Kit.TOASTS) so a mark means the same thing all video long.
// K.toast(kind, { at, text }) in a module; in long videos, usually "toasts" on a scene in script.json.
(function () {
  const { prog, within, lerp, clamp, ease, show, typed, time } = Stage;

  const CSS = `
.k-abs { position: absolute; }
.k-title { font-size: 84px; font-weight: 700; letter-spacing: -.035em; line-height: 1.08; }
.k-big { font-size: 64px; font-weight: 650; letter-spacing: -.02em; line-height: 1.15; }
.k-text { font-size: 48px; line-height: 1.3; }
.k-small { font-size: 44px; line-height: 1.3; }
.k-mono { font-family: var(--mono); font-size: 46px; }
.k-label { font-size: 44px; font-weight: 700; letter-spacing: .04em; }
.k-muted { color: var(--muted); }
.k-heading { font-size: 56px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; }
.k-heading .k-sub { margin-left: 20px; font-size: 44px; font-weight: 500; color: var(--muted); }
.k-lines { display: flex; flex-direction: column; }
.k-line { font-size: 48px; line-height: 1.3; }
.k-line .k-note { display: block; font-size: 44px; color: var(--muted); margin-top: 2px; }
.k-line.k-mono-line { font-family: var(--mono); font-size: 46px; white-space: pre; }
.k-bullet { color: var(--accent); margin-right: 18px; font-weight: 700; }
.k-strike { position: absolute; left: -6px; right: -6px; top: 52%; height: 5px; border-radius: 3px; background: var(--bad); transform-origin: 0 50%; }
.k-rel { position: relative; display: inline-block; }
.k-chips { display: flex; flex-wrap: wrap; gap: 18px; }
.k-table { display: grid; background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 10px 26px 14px; }
.k-table .k-th { font-size: 44px; font-weight: 700; color: var(--accent); letter-spacing: .03em; padding: 12px 14px 12px 0; border-bottom: 3px solid var(--border); }
.k-table .k-td { font-size: 44px; line-height: 1.25; padding: 14px 14px 14px 0; border-bottom: 2px solid #ffffff10; }
.k-bars .k-bar-label { font-size: 48px; font-weight: 650; white-space: nowrap; }
.k-bars .k-bar-sub { font-size: 44px; color: var(--muted); white-space: nowrap; margin-left: 18px; font-weight: 400; }
.k-bars .k-bar-track { position: absolute; height: 34px; border-radius: 17px; background: var(--border); opacity: .45; }
.k-bars .k-bar-fill { position: absolute; height: 34px; border-radius: 17px; transform-origin: 0 50%; }
.k-bars .k-bar-value { position: absolute; font-size: 52px; font-weight: 750; white-space: nowrap; }
.k-bars .k-bar-line { position: absolute; width: 0; border-left: 4px dashed var(--muted); }
.k-seg { position: absolute; height: 110px; border: 3px solid var(--border); border-radius: 14px; background: var(--card);
  display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
.k-seg .k-seg-label { font-size: 44px; line-height: 1.1; white-space: nowrap; color: var(--muted); }
.k-seg .k-seg-value { font-size: 48px; font-weight: 700; line-height: 1.1; }
.k-node { position: absolute; background: var(--card); border: 3px solid var(--border); border-radius: 18px; padding: 16px 26px;
  font-size: 46px; font-weight: 650; text-align: center; white-space: nowrap; }
.k-node .k-node-sub { display: block; font-size: 44px; font-weight: 400; color: var(--muted); }
.k-packet { position: absolute; left: 0; top: 0; z-index: 5; box-shadow: 0 8px 24px #0008; }
.k-edge-label { position: absolute; font-size: 44px; color: var(--muted); white-space: nowrap; background: var(--bg); padding: 2px 14px; border-radius: 12px; }
.k-node .k-node-icon { margin-right: 14px; }
.k-code .k-kw { color: var(--code-kw); } .k-code .k-ty { color: var(--code-type); } .k-code .k-fn { color: var(--code-fn); }
.k-code .k-str { color: var(--code-str); } .k-code .k-num { color: var(--code-num); } .k-code .k-com { color: var(--code-com); font-style: italic; }
.k-code { background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 22px 30px; }
.k-code .k-code-title { font-size: 44px; font-weight: 700; color: var(--accent); margin-bottom: 10px; }
.k-code .k-cl { font-family: var(--mono); font-size: 44px; line-height: 60px; height: 60px; padding: 0 14px; border-radius: 10px; white-space: pre; }
.k-board { background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 22px 30px; }
.k-board .k-board-title { font-size: 44px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
.k-board .k-br { display: grid; grid-template-columns: auto 1fr; column-gap: 34px; align-items: baseline; margin: 8px 0; }
.k-board .k-br-label { font-size: 44px; font-weight: 650; white-space: nowrap; }
.k-board .k-br-text { font-family: var(--mono); font-size: 46px; white-space: pre; }
.k-board .k-br-result { font-family: var(--mono); font-size: 46px; color: var(--accent); white-space: pre; grid-column: 2; }
.k-steps { display: flex; gap: 22px; }
.k-step { font-size: 44px; font-weight: 650; padding: 12px 26px; border-radius: 999px; border: 3px solid var(--border); background: var(--bg2); color: var(--muted); white-space: nowrap; }
.k-step b { color: var(--accent); margin-right: 12px; }
.k-counter { font-size: 96px; font-weight: 750; letter-spacing: -.02em; white-space: nowrap; }
.k-toast { display: flex; align-items: center; gap: 18px; padding: 10px 34px 10px 12px; border-radius: 999px;
  background: var(--bg2); border: 3px solid var(--tc, var(--accent)); box-shadow: 0 12px 36px #0009;
  white-space: nowrap; transform-origin: 100% 50%; z-index: 20; }
.k-toast .k-toast-icon { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 48px; line-height: 1; background: color-mix(in srgb, var(--tc, var(--accent)) 22%, transparent); }
.k-toast .k-toast-text { font-size: 44px; font-weight: 700; color: var(--tc, var(--accent)); }
.k-toast .k-ring { width: 64px; height: 64px; margin-left: 6px; }
.k-toast .k-ring circle { fill: none; stroke-width: 7; }
.k-recap { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: flex; align-items: center; justify-content: center; z-index: 15; }
.k-recap .k-recap-box { min-width: 1100px; max-width: 1600px; background: var(--card); border: 3px solid var(--border); border-radius: 30px; padding: 44px 60px 50px; }
.k-recap .k-recap-title { font-size: 44px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }
.k-recap .k-recap-line { font-size: 56px; font-weight: 600; line-height: 1.3; margin-top: 18px; display: flex; }
.k-recap .k-recap-line b { color: var(--accent); margin-right: 22px; flex: none; }
`;
  if (!document.getElementById("stage-kit-css")) {
    const st = document.createElement("style");
    st.id = "stage-kit-css";
    st.textContent = CSS;
    document.head.append(st);
  }

  const TONE = { accent: "var(--accent)", good: "var(--good)", bad: "var(--bad)", warn: "var(--warn)", violet: "var(--violet)", pink: "var(--pink)", cyan: "var(--cyan)", muted: "var(--muted)", ink: "var(--ink)", faint: "var(--faint)" };
  const tone = (name) => (name ? TONE[name] || name : "");
  const T = (spec) => (spec == null ? null : time(spec));
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  function mk(parent, tag, cls, html, style) {
    const d = document.createElement(tag || "div");
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    if (style) d.style.cssText = style;
    parent.append(d);
    return d;
  }

  // The fixed set of toast kinds: icon, default text, tone. Keep one meaning per kind all video long.
  const TOASTS = {
    idea:     { icon: "💡", text: "Key idea",        tone: "accent" },
    tricky:   { icon: "🤔", text: "The tricky part",  tone: "warn" },
    remember: { icon: "🧠", text: "Remember",        tone: "violet" },
    careful:  { icon: "⚠️", text: "Be careful",      tone: "warn" },
    mistake:  { icon: "🚫", text: "Common mistake",  tone: "bad" },
    surprise: { icon: "😮", text: "Surprise",        tone: "violet" },
    remark:   { icon: "💬", text: "Note",            tone: "muted" },
    question: { icon: "💭", text: "Ask yourself",    tone: "accent" },
    tip:      { icon: "🔧", text: "Pro tip",         tone: "accent" },   // not green: green is a verdict colour
  };
  const TOAST_DUR = 3.2;

  /** Builds one toast element; returns { el, draw(t, at, until) } with a pop-in and fade-out drawn from t. */
  function toastEl(parent, kind, text) {
    const k = TOASTS[kind];
    if (!k) throw new Error(`toast kind ${JSON.stringify(kind)} is not one of ${Object.keys(TOASTS).join(", ")}`);
    const el = mk(parent, "div", "k-toast k-abs", `<span class="k-toast-icon">${k.icon}</span><span class="k-toast-text">${esc(text || k.text)}</span>`);
    el.style.setProperty("--tc", tone(k.tone));
    return {
      el,
      draw(t, at, until) {
        const v = within(t, at - 0.05, until, 0.3);
        const pop = prog(t, at - 0.05, 0.42, (p) => p);
        const s = pop < 1 ? lerp(0.6, 1, ease.out(pop)) + Math.sin(pop * Math.PI) * 0.06 : 1;
        show(el, v, 0, `scale(${s.toFixed(4)})`);
      },
    };
  }

  // Syntax highlighting for K.code: a small tokenizer per language, enough to colour a lesson's excerpt.
  const KW = {
    csharp: new Set(("abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in init int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref required return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile when where while with yield get set").split(" ")),
    python: new Set(("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield").split(" ")),
    javascript: new Set(("async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield").split(" ")),
    nix: new Set(("let in with import inherit rec if then else assert or true false null").split(" ")),
    dockerfile: new Set(("FROM RUN COPY ADD CMD ENTRYPOINT ENV ARG WORKDIR EXPOSE USER LABEL VOLUME").split(" ")),
    sql: new Set(("select from where insert into values update set delete create table alter drop index on conflict do and or not null is as join left right inner outer group by order having limit returning primary key references begin commit rollback excluded case when then else end").split(" ")),
  };
  const TOKEN = /(\/\/.*$|--.*$|#.*$)|(@?\$?"(?:[^"\\]|\\.)*"(?:u8)?|'(?:[^'\\]|\\.)*')|(\b\d[\d_]*(?:\.\d+)?[fFdDmMlLuU]*\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
  const HASH_COMMENTS = new Set(["yaml", "bash", "python", "nix", "dockerfile"]);
  function highlight(line, lang) {
    if (!lang || lang === "plain") return esc(line);
    const kw = KW[lang] || KW.csharp;
    let out = "", last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(line))) {
      const [tok, com, str, num, id] = m;
      if (com && ((com.startsWith("//") && (lang === "csharp" || lang === "javascript")) || (com.startsWith("--") && lang === "sql") || (com.startsWith("#") && HASH_COMMENTS.has(lang)))) {
        out += esc(line.slice(last, m.index)) + `<span class="k-com">${esc(com)}</span>`; last = m.index + tok.length; break;
      }
      if (com) { TOKEN.lastIndex = m.index + 1; continue; }        // "--" or "#" that is not a comment here
      let cls = null;
      if (str) cls = "k-str";
      else if (num) cls = "k-num";
      else if (id) {
        const next = line.slice(m.index + id.length).match(/^\s*(\(|<)/);
        if (kw.has(lang === "sql" ? id.toLowerCase() : id)) cls = "k-kw";
        else if ((lang === "csharp" || lang === "javascript") && next && next[1] === "(" && /^[A-Z]/.test(id)) cls = "k-fn";
        else if (lang === "python" && next && next[1] === "(") cls = "k-fn";
        else if ((lang === "csharp" || lang === "javascript") && /^[A-Z]/.test(id)) cls = "k-ty";
      }
      out += esc(line.slice(last, m.index)) + (cls ? `<span class="${cls}">${esc(tok)}</span>` : esc(tok));
      last = m.index + tok.length;
    }
    return out + esc(line.slice(last));
  }

  /** Visibility 0..1 for a component that appears at `at` and leaves at `until`. */
  const vis = (t, at, until, fade = 0.35) => within(t, at == null ? -Infinity : at - 0.05, until == null ? Infinity : until, fade);

  /** One kit bound to one root element. Components register themselves; render(t) draws them all. */
  function kitFor(root) {
    const parts = [];
    const add = (c) => (parts.push(c), c);
    const host = (o) => (o && o.in ? o.in.el : root);
    const place = (el, o) => {
      el.classList.add("k-abs");
      if (o.x != null) el.style.left = `${o.x}px`;
      if (o.y != null) el.style.top = `${o.y}px`;
      if (o.w != null) el.style.width = `${o.w}px`;
      if (o.align) el.style.textAlign = o.align;
    };

    // Inside K.scene(id, fn), components default to that scene: they appear when it starts (unless
    // given `at`) and leave when it ends (unless given `until`), so a module's scenes never pile up.
    let sceneCtx = null;
    const T0 = (spec) => (spec == null ? null : time(spec));
    const T = (spec, which) => {
      if (spec != null) return T0(spec);
      if (!sceneCtx) return null;
      return which === "until" ? sceneCtx.until : which === "at" ? sceneCtx.at : null;
    };
    const K = {
      root,
      /** Components made inside fn belong to scene id: default at = its start, until = its end. */
      scene(id, fn) {
        const s = Stage.scene(id);
        const prev = sceneCtx;
        sceneCtx = { at: s.sentences[0] ? s.sentences[0].start : s.start, until: s.end };
        try { fn(); } finally { sceneCtx = prev; }
      },
      t: time,
      word: Stage.word,
      /** A container that fades as one: pass it to other components as { in: group }. */
      group(o = {}) {
        const el = mk(root, "div", "k-abs", null, "left:0;top:0;width:1920px;height:1080px");
        const at = T(o.at, "at"), until = T(o.until, "until");
        return add({ el, render(t) { const p = vis(t, at, until, o.fade ?? 0.4); el.style.opacity = p; el.style.visibility = p <= 0.001 ? "hidden" : "visible"; } });
      },

      /** Free text. size: title | big | text | small | mono | label. */
      text(html, o = {}) {
        const el = mk(host(o), "div", `k-${o.size || "text"}`, html);
        place(el, o);
        const at = T(o.at, "at"), until = T(o.until, "until"), toneAt = T(o.toneAt);
        return add({ el, render(t) {
          show(el, vis(t, at, until), o.rise ?? 16);
          el.style.color = o.tone && (toneAt == null || t >= toneAt) ? tone(o.tone) : "";
        } });
      },

      /** The module's heading, top left: K.heading("Title", { sub: "muted note", at, subAt, until }). */
      heading(text, o = {}) {
        const el = mk(host(o), "div", "k-heading", `${text}${o.sub ? `<span class="k-sub">${o.sub}</span>` : ""}`);
        place(el, { x: 60, y: 130, ...o });
        const at = T(o.at, "at"), until = T(o.until, "until"), subAt = T(o.subAt);
        const sub = el.querySelector(".k-sub");
        return add({ el, render(t) {
          show(el, vis(t, at, until), 16);
          if (sub) sub.style.opacity = subAt == null ? 1 : prog(t, subAt - 0.1, 0.4);
        } });
      },

      /**
       * Lines that arrive with the words. items: string or { html, at, note, noteAt, tone, toneAt, strikeAt,
       * bullet, mono }. Options: x, y, w, gap, dim (earlier lines fade to 55% as new ones arrive), until.
       */
      lines(items, o = {}) {
        const box = mk(host(o), "div", "k-lines");
        place(box, o);
        box.style.gap = `${o.gap ?? 18}px`;
        const rows = items.map((it) => {
          const d = typeof it === "string" ? { html: it } : it;
          const line = mk(box, "div", `k-line${d.mono ? " k-mono-line" : ""}`);
          const body = mk(line, "span", "k-rel", `${d.bullet ? `<span class="k-bullet">${d.bullet}</span>` : ""}${d.html}`);
          const strike = d.strikeAt != null ? mk(body, "span", "k-strike") : null;
          const note = d.note ? mk(line, "span", "k-note", d.note) : null;
          if (o.size) line.style.fontSize = { big: "64px", text: "48px", small: "44px" }[o.size] || o.size;
          return { d, line, body, note, strike, at: T(d.at ?? o.at, "at"), noteAt: T(d.noteAt), toneAt: T(d.toneAt), strikeAt: T(d.strikeAt), until: T(d.until ?? o.until, "until") };
        });
        return add({ el: box, render(t) {
          rows.forEach((r, i) => {
            show(r.line, vis(t, r.at, r.until), 14);
            if (o.dim) {
              const next = rows[i + 1];
              const dimP = next && next.at != null ? prog(t, next.at, 0.4) : 0;
              r.line.style.opacity = Number(r.line.style.opacity) * lerp(1, 0.55, dimP);
            }
            if (r.note) r.note.style.opacity = r.noteAt == null ? 1 : prog(t, r.noteAt - 0.1, 0.4);
            r.body.style.color = r.d.tone && (r.toneAt == null || t >= r.toneAt) ? tone(r.d.tone) : "";
            if (r.strike) r.strike.style.transform = `scaleX(${prog(t, r.strikeAt, 0.4)})`;
          });
        } });
      },

      /** A row of chips: items { text, at, tone, toneAt, until }. Options: x, y, w (wraps), gap, until. */
      chips(items, o = {}) {
        const box = mk(host(o), "div", "k-chips");
        place(box, o);
        if (o.gap != null) box.style.gap = `${o.gap}px`;
        const cs = items.map((it) => {
          const d = typeof it === "string" ? { text: it } : it;
          const el = mk(box, "div", "chip", esc(d.text));
          return { d, el, at: T(d.at ?? o.at, "at"), toneAt: T(d.toneAt), until: T(d.until ?? o.until, "until") };
        });
        return add({ el: box, render(t) {
          cs.forEach((c) => {
            show(c.el, vis(t, c.at, c.until), 10);
            const on = c.d.tone && (c.toneAt == null || t >= c.toneAt);
            c.el.className = `chip${on ? " " + c.d.tone : ""}`;
          });
        } });
      },

      /**
       * A table: { cols: ["Pressure", "Move", "Price"], widths: [1, 1, 1], rows: [{ cells, at, tone, toneAt }],
       * headerAt, focus } . focus highlights the newest row while it is being spoken.
       */
      table(o = {}) {
        const box = mk(host(o), "div", "k-table");
        place(box, o);
        box.style.gridTemplateColumns = (o.widths || o.cols.map(() => 1)).map((f) => `${f}fr`).join(" ");
        const heads = o.cols.map((c) => mk(box, "div", "k-th", c));
        const rows = o.rows.map((r) => ({ r, at: T(r.at), toneAt: T(r.toneAt), until: T(r.until), cells: r.cells.map((c) => mk(box, "div", "k-td", c)) }));
        const at = T(o.at), until = T(o.until, "until"), headerAt = T(o.headerAt ?? o.at);
        return add({ el: box, render(t) {
          // The card appears at `at`, else with its header (`headerAt`), else with its first row.
          show(box, vis(t, at ?? headerAt ?? (rows[0] && rows[0].at), until), 16);
          heads.forEach((h) => (h.style.opacity = headerAt == null ? 1 : prog(t, headerAt - 0.1, 0.4)));
          rows.forEach((row, i) => {
            const p = vis(t, row.at, row.until);
            const next = rows[i + 1];
            const current = o.focus && row.at != null && t >= row.at && (!next || next.at == null || t < next.at);
            row.cells.forEach((c, k) => {
              c.style.opacity = p;
              c.style.color = row.r.tone && (row.toneAt == null || t >= row.toneAt) ? tone(row.r.tone) : "";
              c.style.fontWeight = k === 0 && current ? "650" : "";
              c.style.background = current ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "";
            });
          });
        } });
      },

      /**
       * Horizontal bars on one scale: { max, line: { value, label }, labelW, rows: [{ label, sub, value, at,
       * steps: [{ value, at }], tone, toneAt, format }] }. A bar grows to value at `at`, then moves to each
       * step's value at its time; its number counts along. line draws a dashed capacity marker.
       */
      bars(o = {}) {
        const box = mk(host(o), "div", "k-bars k-abs", null, `left:${o.x ?? 60}px;top:${o.y ?? 250}px;width:${o.w ?? 1760}px`);
        const labelH = 62, barGap = o.gap ?? 150, trackX = 0, trackW = (o.w ?? 1760) - (o.valueW ?? 260);
        const scale = (v) => (v / o.max) * trackW;
        const at = T(o.at), until = T(o.until, "until");
        const lineLabel = o.line && o.line.label ? mk(box, "div", "k-bar-sub k-abs", o.line.label) : null;
        const rows = o.rows.map((r, i) => {
          const top = i * barGap;
          const label = mk(box, "div", "k-bar-label k-abs", `${r.label}${r.sub ? `<span class="k-bar-sub">${r.sub}</span>` : ""}`, `left:0;top:${top}px`);
          const track = mk(box, "div", "k-bar-track", null, `left:${trackX}px;top:${top + labelH + 8}px;width:${trackW}px`);
          const fill = mk(box, "div", "k-bar-fill", null, `left:${trackX}px;top:${top + labelH + 8}px;width:${trackW}px`);
          const value = mk(box, "div", "k-bar-value", "", `top:${top + labelH - 8}px`);
          // The capacity marker is a short dashed tick across each bar, clear of the labels.
          const tick = o.line ? mk(box, "div", "k-bar-line", null, `left:${trackX + scale(o.line.value) - 2}px;top:${top + labelH - 4}px;height:62px`) : null;
          const steps = [{ value: r.value, at: T(r.at) }, ...(r.steps || []).map((s) => ({ value: s.value, at: T(s.at) }))];
          return { r, label, track, fill, value, tick, steps, at: T(r.at), toneAt: T(r.toneAt), until: T(r.until ?? o.until, "until") };
        });
        if (lineLabel) lineLabel.style.cssText += `;left:${trackX + scale(o.line.value) - 20}px;top:-56px;margin:0`;
        const fmt = (r, v) => (r.format ? r.format(v) : `${Math.round(v)}`);
        return add({ el: box, render(t) {
          box.style.opacity = vis(t, at ?? (rows[0] && rows[0].at), until);
          if (lineLabel) lineLabel.style.opacity = rows[0] && rows[0].at != null ? prog(t, rows[0].at - 0.2, 0.4) : 1;
          rows.forEach((row) => {
            const p = vis(t, row.at, row.until);
            for (const e of [row.label, row.track, row.fill, row.value, row.tick]) if (e) e.style.opacity = p;
            let v = 0;
            row.steps.forEach((s, k) => {
              const from = k === 0 ? 0 : row.steps[k - 1].value;
              if (s.at != null && t >= s.at) v = lerp(from, s.value, prog(t, s.at, 0.8, ease.out));
            });
            row.fill.style.transform = `scaleX(${clamp(scale(v) / (trackW || 1), 0, 10)})`;
            row.fill.style.width = `${trackW}px`;
            const colour = row.r.tone && (row.toneAt == null || t >= row.toneAt) ? tone(row.r.tone) : "var(--accent)";
            row.fill.style.background = colour;
            row.value.style.left = `${trackX + scale(v) + 22}px`;
            row.value.textContent = fmt(row.r, v);
            row.value.style.color = row.r.tone && (row.toneAt == null || t >= row.toneAt) ? tone(row.r.tone) : "";
          });
        } });
      },

      /**
       * A stacked timeline, one row: { total, w, segments: [{ label, value, at, tone }], sum: { text, at } }.
       * Segment widths are proportional to value/total; each appears at its time.
       */
      timeline(o = {}) {
        const box = mk(host(o), "div", "k-abs", null, `left:${o.x ?? 60}px;top:${o.y ?? 400}px;width:${o.w ?? 1500}px;height:120px`);
        const at = T(o.at), until = T(o.until, "until");
        let x = 0;
        const segs = o.segments.map((s) => {
          const w = (s.value / o.total) * (o.w ?? 1500);
          const el = mk(box, "div", "k-seg", `${s.label ? `<div class="k-seg-label">${s.label}</div>` : ""}<div class="k-seg-value">${s.show ?? s.value}</div>`, `left:${x}px;width:${Math.max(w - 4, 8)}px`);
          x += w;
          return { s, el, at: T(s.at), toneAt: T(s.toneAt) };
        });
        const sum = o.sum ? mk(box, "div", "k-big k-abs", o.sum.text, `left:${x + 30}px;top:20px;white-space:nowrap`) : null;
        const sumAt = o.sum ? T(o.sum.at) : null;
        return add({ el: box, render(t) {
          box.style.opacity = vis(t, at ?? (segs[0] && segs[0].at), until);
          segs.forEach((g) => {
            const p = vis(t, g.at, null, 0.3);
            g.el.style.opacity = p;
            g.el.style.transform = `scaleX(${lerp(0.6, 1, p)})`;
            g.el.style.transformOrigin = "0 50%";
            const on = g.s.tone && (g.toneAt == null || t >= g.toneAt);
            g.el.style.borderColor = on ? tone(g.s.tone) : "";
            g.el.style.background = on ? `color-mix(in srgb, ${tone(g.s.tone)} 16%, var(--card))` : "";
          });
          if (sum) show(sum, vis(t, sumAt, null), 10);
        } });
      },

      /**
       * Boxes, arrows and moving packets: { nodes: { id: { label, sub, x, y, at, tone, toneAt, dimAt, until } },
       * edges: [{ from, to, at, label, dashed, tone, toneAt, until, arrow }], packets: [{ from, to, at, dur, label,
       * tone, fadeAt (0..1 of the trip, where it fades: a lost reply), until }] }.
       * Edges run between the nearest sides of two boxes, with an arrowhead at `to` (arrow: "end" default, "both",
       * "none"); packets travel centre to centre.
       */
      flow(o = {}) {
        const HEAD_L = 28, HEAD_W = 26, LANE = 40;
        const layer = mk(host(o), "div", "k-abs", null, "left:0;top:0;width:1920px;height:1080px");
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "layer");
        svg.setAttribute("width", "1920"); svg.setAttribute("height", "1080");
        layer.append(svg);
        const nodes = {};
        for (const [id, n] of Object.entries(o.nodes || {})) {
          const el = mk(layer, "div", "k-node", `${n.icon ? `<span class="k-node-icon">${n.icon}</span>` : ""}${n.label}${n.sub ? `<span class="k-node-sub">${n.sub}</span>` : ""}`, `left:${n.x}px;top:${n.y}px`);
          if (n.w) el.style.width = `${n.w}px`;
          nodes[id] = { n, el, at: T(n.at), toneAt: T(n.toneAt), dimAt: T(n.dimAt), until: T(n.until, "until") };
        }
        const box = (id) => { const e = nodes[id].el; return { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; };
        const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
        const edges = (o.edges || []).map((e) => {
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          svg.append(path);
          const label = e.label ? mk(layer, "div", "k-edge-label", e.label) : null;
          const arrow = e.arrow ?? "end";
          const heads = (arrow === "both" ? ["start", "end"] : arrow === "end" ? ["end"] : []).map((end) => {
            const el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            svg.append(el);
            return { end, el };
          });
          return { e, path, label, heads, at: T(e.at), toneAt: T(e.toneAt), until: T(e.until, "until") };
        });
        const packets = (o.packets || []).map((p) => {
          const el = mk(layer, "div", `chip ${p.tone || "accent"} k-packet`, esc(p.label || ""));
          return { p, el, at: T(p.at), dur: p.dur ?? 1, until: T(p.until, "until") };
        });
        const layerAt = T(o.at, "at"), layerUntil = T(o.until, "until");
        let laidOut = false;
        function layout() {
          // Box sizes are only known once the fonts are in, so edges are routed on the first render.
          // Edges joining the same two boxes (either way round, e.g. data one way and demand back) get side-by-side
          // lanes LANE px apart, on a fixed screen axis so opposite directions separate the same way every time.
          const pairs = {};
          for (const ed of edges) (pairs[[ed.e.from, ed.e.to].sort().join("\u0000")] ??= []).push(ed);
          for (const group of Object.values(pairs))
            group.forEach((ed, k) => { ed.lane = (k - (group.length - 1) / 2) * LANE; });
          for (const ed of edges) {
            const a = box(ed.e.from), b = box(ed.e.to), ca = centre(a), cb = centre(b);
            const dx = cb.x - ca.x, dy = cb.y - ca.y;
            let p1, p2;
            if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) {
              p1 = { x: dx > 0 ? a.x + a.w : a.x, y: ca.y + ed.lane };
              p2 = { x: dx > 0 ? b.x : b.x + b.w, y: cb.y + ed.lane };
            } else {
              p1 = { x: ca.x + ed.lane, y: dy > 0 ? a.y + a.h : a.y };
              p2 = { x: cb.x + ed.lane, y: dy > 0 ? b.y : b.y + b.h };
            }
            const curved = Math.abs(dx) * a.h > Math.abs(dy) * a.w;
            // Direction of travel where the line meets each box: along x for the curve, along the line otherwise.
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
            const dirEnd = curved ? { x: Math.sign(p2.x - p1.x), y: 0 } : { x: (p2.x - p1.x) / len, y: (p2.y - p1.y) / len };
            const dirStart = { x: -dirEnd.x, y: -dirEnd.y };
            // Pull the line back from each arrowed end so the head's tip, not the line's cap, touches the box.
            const q1 = { ...p1 }, q2 = { ...p2 };
            for (const hd of ed.heads) {
              const tip = hd.end === "end" ? p2 : p1, u = hd.end === "end" ? dirEnd : dirStart;
              const q = hd.end === "end" ? q2 : q1;
              q.x = tip.x - u.x * HEAD_L; q.y = tip.y - u.y * HEAD_L;
              const bx = tip.x - u.x * HEAD_L, by = tip.y - u.y * HEAD_L, nx = -u.y * HEAD_W / 2, ny = u.x * HEAD_W / 2;
              hd.el.setAttribute("points", `${tip.x},${tip.y} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`);
            }
            const mx = (q1.x + q2.x) / 2;
            const d = curved
              ? `M${q1.x},${q1.y} C${mx},${q1.y} ${mx},${q2.y} ${q2.x},${q2.y}`
              : `M${q1.x},${q1.y} L${q2.x},${q2.y}`;
            ed.path.setAttribute("d", d);
            ed.path.style.fill = "none";
            ed.path.style.strokeWidth = "5";
            ed.path.style.strokeLinecap = "round";
            if (ed.e.dashed) ed.path.style.strokeDasharray = "14 12";
            if (ed.label) {
              const horiz = Math.abs(dx) * a.h > Math.abs(dy) * a.w;
              ed.label.style.left = `${(p1.x + p2.x) / 2}px`;
              ed.label.style.top = `${(p1.y + p2.y) / 2}px`;
              // The label sits on the outside of its lane: above/left of the upper/left lane, below/right of the other.
              ed.label.style.transform = horiz
                ? (ed.lane > 0 ? "translate(-50%, 25%)" : "translate(-50%, -125%)")
                : (ed.lane < 0 ? "translate(calc(-100% - 18px), -50%)" : "translate(18px, -50%)");
            }
            ed.len = ed.path.getTotalLength();
          }
          laidOut = true;
        }
        return add({ el: layer, render(t) {
          if (!laidOut) layout();
          layer.style.opacity = vis(t, layerAt, layerUntil);
          for (const nd of Object.values(nodes)) {
            const p = vis(t, nd.at, nd.until);
            show(nd.el, p, 12);
            const on = nd.n.tone && (nd.toneAt == null || t >= nd.toneAt);
            nd.el.style.borderColor = on ? tone(nd.n.tone) : "";
            nd.el.style.color = on && !nd.n.fill ? tone(nd.n.tone) : "";
            nd.el.style.background = on && nd.n.fill ? `color-mix(in srgb, ${tone(nd.n.tone)} 24%, var(--card))` : "";
            if (nd.dimAt != null) nd.el.style.opacity = p * lerp(1, 0.35, prog(t, nd.dimAt, 0.4));
          }
          for (const ed of edges) {
            const p = vis(t, ed.at, ed.until);
            const drawn = ed.at == null ? 1 : prog(t, ed.at, 0.5);
            ed.path.style.opacity = p;
            if (!ed.e.dashed) { ed.path.style.strokeDasharray = `${ed.len}`; ed.path.style.strokeDashoffset = `${ed.len * (1 - drawn)}`; }
            const on = ed.e.tone && (ed.toneAt == null || t >= ed.toneAt);
            ed.path.style.stroke = on ? tone(ed.e.tone) : "var(--faint)";
            // A head appears once the line has been drawn to it (the start head with the line's first stroke).
            for (const hd of ed.heads) {
              hd.el.style.fill = ed.path.style.stroke;
              hd.el.style.opacity = p * (hd.end === "start" ? clamp(drawn * 8) : clamp((drawn - 0.85) / 0.15));
            }
            if (ed.label) { ed.label.style.opacity = p; ed.label.style.color = on ? tone(ed.e.tone) : ""; }
          }
          for (const pk of packets) {
            // A packet travels between the facing edges of its two boxes, never over their labels.
            const A = box(pk.p.from), B = box(pk.p.to), ca = centre(A), cb = centre(B);
            const w = pk.el.offsetWidth, h = pk.el.offsetHeight, gap = 14;
            const horiz = Math.abs(cb.x - ca.x) * (A.h + B.h) >= Math.abs(cb.y - ca.y) * (A.w + B.w);
            let a, b;
            if (horiz) {
              const dir = cb.x >= ca.x ? 1 : -1;
              a = { x: dir > 0 ? A.x + A.w + gap + w / 2 : A.x - gap - w / 2, y: ca.y };
              b = { x: dir > 0 ? B.x - gap - w / 2 : B.x + B.w + gap + w / 2, y: cb.y };
            } else {
              const dir = cb.y >= ca.y ? 1 : -1;
              a = { x: ca.x, y: dir > 0 ? A.y + A.h + gap + h / 2 : A.y - gap - h / 2 };
              b = { x: cb.x, y: dir > 0 ? B.y - gap - h / 2 : B.y + B.h + gap + h / 2 };
            }
            const f = prog(t, pk.at, pk.dur, ease.inOut);
            const moving = pk.at != null && t >= pk.at && t < pk.at + pk.dur + 0.05 && (pk.until == null || t < pk.until);
            const fadeAt = pk.p.fadeAt ?? 1;
            const fade = f > fadeAt ? 1 - clamp((f - fadeAt) / (1 - fadeAt + 1e-6)) : 1;
            show(pk.el, moving ? fade : 0, 0, `translate(${lerp(a.x, b.x, f) - w / 2}px, ${lerp(a.y, b.y, f) - h / 2 + (pk.p.lift ?? 0)}px)`);
          }
        } });
      },

      /**
       * A code card whose lines glow as they run: { title, lines: [...], glow: [{ line, from, until, tone }] }.
       * `font` (px, default 44) shrinks the lines so verbatim tool output keeps its real indentation.
       * `slide: 0` fades in without the 20 px rise: for a card that replaces an identical-looking one in place.
       */
      code(o = {}) {
        const card = mk(host(o), "div", "k-code");
        place(card, { x: 60, y: 200, ...o });
        if (o.title) mk(card, "div", "k-code-title", o.title);
        const ls = o.lines.map((l) => mk(card, "div", "k-cl", highlight(l, o.lang ?? "csharp")));
        if (o.font) ls.forEach((l) => { l.style.fontSize = `${o.font}px`; l.style.lineHeight = l.style.height = `${Math.round(o.font * 60 / 44)}px`; });
        const glows = (o.glow || []).map((g) => ({ g, from: T(g.from), until: T(g.until, "until") }));
        const at = T(o.at, "at"), until = T(o.until, "until");
        return add({ el: card, render(t) {
          show(card, vis(t, at, until), o.slide ?? 20);
          ls.forEach((l, i) => {
            let p = 0, colour = "var(--accent)";
            for (const gl of glows) if (gl.g.line === i) { const q = within(t, gl.from, gl.until ?? Infinity, 0.25); if (q > p) { p = q; colour = tone(gl.g.tone) || colour; } }
            l.style.background = p > 0 ? `color-mix(in srgb, ${colour} ${Math.round(p * 22)}%, transparent)` : "";
          });
        } });
      },

      /**
       * A whiteboard of worked lines, typed as they are said: { title, rows: [{ label, text, at, dur, result,
       * resultAt }] }. `text` types across dur seconds (default 1.2); `result` appears under it at resultAt.
       */
      board(o = {}) {
        const card = mk(host(o), "div", "k-board");
        place(card, { x: 60, y: 200, w: 1800, ...o });
        if (o.title) mk(card, "div", "k-board-title", o.title);
        const rows = o.rows.map((r) => {
          const row = mk(card, "div", "k-br");
          const label = mk(row, "div", "k-br-label", r.label || "");
          const text = mk(row, "div", "k-br-text", "");
          const result = r.result ? mk(row, "div", "k-br-result", esc(r.result)) : null;
          return { r, row, label, text, result, at: T(r.at), resultAt: T(r.resultAt), dimAt: T(r.dimAt) };
        });
        const at = T(o.at ?? (o.rows[0] && o.rows[0].at)), until = T(o.until, "until");
        return add({ el: card, render(t) {
          show(card, vis(t, at, until), 16);
          rows.forEach((r) => {
            const p = r.at == null ? 1 : prog(t, r.at - 0.1, 0.3);
            r.label.style.opacity = p;
            r.text.textContent = typed(r.r.text, r.at == null ? 1 : prog(t, r.at, r.r.dur ?? 1.2, ease.linear));
            if (r.result) r.result.style.opacity = r.resultAt == null ? p : prog(t, r.resultAt - 0.1, 0.4);
            r.row.style.opacity = r.dimAt == null ? 1 : lerp(1, 0.45, prog(t, r.dimAt, 0.4));
          });
        } });
      },

      /** Numbered steps across the top: K.steps(["Find", "Move", "Price"], { ats: [t1, t2, t3] }). */
      steps(labels, o = {}) {
        const box = mk(host(o), "div", "k-steps");
        place(box, { x: 60, y: 140, ...o });
        const els = labels.map((l, i) => mk(box, "div", "k-step", `<b>${i + 1}</b>${l}`));
        const ats = (o.ats || []).map(T);
        const at = T(o.at ?? ats[0]), until = T(o.until, "until");
        return add({ el: box, render(t) {
          show(box, vis(t, at, until), 12);
          els.forEach((e, i) => {
            const reached = ats[i] != null && t >= ats[i];
            const current = reached && (i === els.length - 1 || ats[i + 1] == null || t < ats[i + 1]);
            e.style.borderColor = current ? "var(--accent)" : "";
            e.style.background = current ? "var(--accent-dim)" : "";
            e.style.color = reached ? "var(--ink)" : "";
            e.style.opacity = reached ? 1 : 0.55;
          });
        } });
      },

      /** A number that counts up: { from, to, at, dur, format: (v) => string, tone, toneAt }. */
      counter(o = {}) {
        const el = mk(host(o), "div", `k-${o.size || "counter"}`);
        place(el, o);
        const at = T(o.at, "at"), until = T(o.until, "until"), toneAt = T(o.toneAt);
        const fmt = o.format || ((v) => Math.round(v).toLocaleString("en-US"));
        return add({ el, render(t) {
          show(el, vis(t, at, until), 10);
          el.textContent = fmt(lerp(o.from ?? 0, o.to, prog(t, at, o.dur ?? 1.2, ease.inOut)));
          el.style.color = o.tone && (toneAt == null || t >= toneAt) ? tone(o.tone) : "";
        } });
      },

      /** A pop-up badge on a flagged moment: K.toast("tricky", { at: "g1-x|the tricky part", text?, x, y }).
       *  Default place is the top-right of the content area; it leaves after `dur` s (3.2) or at `until`. */
      toast(kind, o = {}) {
        const tt = toastEl(host(o), kind, o.text);
        tt.el.style.right = `${o.right ?? 60}px`;
        if (o.x != null) { tt.el.style.left = `${o.x}px`; tt.el.style.right = ""; }
        tt.el.style.top = `${o.y ?? 130}px`;
        const at = T(o.at, "at"), until = T(o.until, "until");
        return add({ el: tt.el, render: (t) => tt.draw(t, at, Math.min(until ?? Infinity, at + (o.dur ?? TOAST_DUR))) });
      },

      /** Anything else: K.custom(el => ..., t => ...) keeps a hand-made piece in the same render pass. */
      custom(build, render) { const el = build(root); return add({ el, render: (t) => render(t, el) }); },

      render(t) { for (const c of parts) c.render(t); },
    };
    return K;
  }

  /** The frame's breathing room for a long video: a "pause and think" countdown during every [think]
   *  silence (top right, where toasts go), and each scene's "recap" as a full "So far" card, one line
   *  arriving with each sentence, held through the scene's quiet end. */
  function frameBreaks(root) {
    const items = [];
    for (const s of Stage.timing.scenes) {
      for (const b of s.breaks || []) {
        if (b.kind !== "think") continue;
        const tt = toastEl(root, "question", "Pause and think");
        tt.el.style.right = "60px";
        tt.el.style.top = "14px";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 64 64");
        svg.classList.add("k-ring");
        svg.innerHTML = `<circle cx="32" cy="32" r="26" stroke="var(--border)"/><circle cx="32" cy="32" r="26" stroke="var(--accent)" transform="rotate(-90 32 32)" stroke-dasharray="163.4" stroke-linecap="round"/>`;
        tt.el.append(svg);
        const arc = svg.lastChild;
        items.push({ render(t) {
          tt.draw(t, b.start - 0.1, b.end + 0.3);
          arc.setAttribute("stroke-dashoffset", (163.4 * clamp((t - b.start) / (b.end - b.start))).toFixed(2));
        } });
      }
      if (s.recap && s.recap.length) {
        const card = mk(root, "div", "k-recap");
        const box = mk(card, "div", "k-recap-box");
        mk(box, "div", "k-recap-title", "So far");
        const sent = s.sentences;
        const lines = s.recap.map((text, i) => {
          const el = mk(box, "div", "k-recap-line", `<b>✓</b>${esc(text)}`);
          const cue = sent.length ? sent[Math.min(i, sent.length - 1)].start : s.start;
          return { el, at: cue - 0.15 };
        });
        const from = sent.length ? sent[0].start - 0.4 : s.start;
        items.push({ render(t) {
          const v = within(t, from, s.end - 0.05, 0.4);
          show(card, v, 0, `scale(${lerp(0.97, 1, v).toFixed(4)})`);
          for (const l of lines) show(l.el, prog(t, l.at, 0.35), 14);
        } });
      }
    }
    return { count: items.length, render(t) { for (const x of items) x.render(t); } };
  }

  /** The frame's toasts for a long video: every scene's "toasts" in the timing, in the band above the
   *  content (top right). A toast leaves after its dur, or when the next one arrives. */
  function frameToasts(root) {
    const list = [];
    for (const s of Stage.timing.scenes) {
      for (const d of s.toasts || []) {
        const spec = d.at == null ? s.id : /^#\d+$/.test(d.at) ? s.id + d.at : `${s.id}|${d.at}`;
        list.push({ d, at: time(spec) });
      }
    }
    list.sort((a, b) => a.at - b.at);
    const items = list.map((x, i) => {
      const tt = toastEl(root, x.d.kind, x.d.text);
      tt.el.style.right = "60px";
      tt.el.style.top = "14px";
      const next = list[i + 1] ? list[i + 1].at - 0.1 : Infinity;
      return { tt, at: x.at, until: Math.min(next, x.at + (x.d.dur ?? TOAST_DUR)) };
    });
    return { count: items.length, render(t) { for (const x of items) x.tt.draw(t, x.at, x.until); } };
  }

  window.Kit = {
    TOASTS,
    frameToasts,
    frameBreaks,
    kitFor,
    /** A long-video module: Kit.module("g1", (K) => { ...components... }). */
    module(key, fn) {
      let K = null;
      (window.CH ??= {})[key] = {
        build(root) { K = kitFor(root); fn(K); },
        render(t) { K && K.render(t); },
      };
    },
    /** A one-off clip: Kit.clip((K) => { ... }) builds into #stage and starts Stage.play. */
    clip(fn) {
      const K = kitFor(document.getElementById("stage"));
      fn(K);
      Stage.play((t) => K.render(t));
    },
  };
})();
