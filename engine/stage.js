// Timeline runtime for lesson animations. A clip page loads build/timing.js (written by
// narrate.py), then this file, then its own script, which ends with Stage.play(render).
//
// render(t) must draw the whole frame from t alone: the renderer seeks to arbitrary times,
// in parallel pages, out of order. So no CSS transitions or animations, no timers, no
// Date.now(), no requestAnimationFrame, and no state carried from one call to the next.
//
// Timing comes from the narration, not from constants: Stage.cue("scene", i) is the moment
// sentence i of that scene starts being spoken, so a re-voiced line moves its visuals with it.
(function () {
  const T = window.TIMING;
  if (!T) throw new Error("build/timing.js is missing - run: ./build.sh <clip> narrate");
  const byId = Object.fromEntries(T.scenes.map((s) => [s.id, s]));

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    linear: (p) => p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    in: (p) => p * p * p,
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  };

  function scene(id) {
    const s = byId[id];
    if (!s) throw new Error(`no scene "${id}" in script.json (have: ${Object.keys(byId).join(", ")})`);
    return s;
  }

  /** Start of sentence i in scene id; i may be negative to count from the end. */
  function cue(id, i = 0) {
    const s = scene(id).sentences;
    const k = i < 0 ? s.length + i : i;
    if (!s[k]) throw new Error(`scene "${id}" has ${s.length} sentence(s), asked for ${i}`);
    return s[k].start;
  }

  /** Start of part k of sentence i: a {fr:...} phrase or the narration around it. */
  function part(id, i, k = 0) {
    const s = scene(id).sentences.at(i);
    const p = s && s.parts && s.parts.at(k);
    if (!p) throw new Error(`scene "${id}" sentence ${i} has no part ${k}`);
    return p.start;
  }

  // ── Word timing ──────────────────────────────────────────────────────────────────────────
  // Kokoro gives no word timestamps, so a word's time is interpolated inside its sentence (or inside its
  // voice part, which is timed exactly) by characters of what is HEARD: "86,400" is read "eighty-six
  // thousand four hundred", so it is found and weighted as spoken. Punctuation adds a little, because the
  // voice pauses there.
  const PAUSE = { ",": 4, ";": 6, ":": 6, "—": 6, "–": 6, ".": 8, "?": 8, "!": 8 };
  const weight = (text, upto) => { let w = 0; for (let k = 0; k < upto; k++) w += 1 + (PAUSE[text[k]] || 0); return w; };
  const heardOf = (u) => u.spoken ?? u.text ?? "";

  /**
   * When a phrase is spoken, in seconds.
   *   word("g1-signals", "five signals")             first occurrence anywhere in the scene
   *   word("g1-signals", "thirty", { sentence: 1 })  only in sentence 1
   *   word(id, "the", { nth: 2 })                    the second occurrence
   *   word(id, "gigabits", { end: true })            when the phrase finishes
   * Matching is case-insensitive, on the spoken text first and the caption text second. Throws when the
   * phrase is not there, so a re-worded line fails loudly instead of drifting.
   */
  function word(id, needle, { sentence = null, nth = 1, end = false } = {}) {
    const sc = scene(id);
    const want = String(needle).toLowerCase();
    const picked = sentence == null ? sc.sentences : [sc.sentences.at(sentence)].filter(Boolean);
    for (const field of ["spoken", "text"]) {
      let count = 0;
      for (const s of picked) {
        const units = s.parts && s.parts.length > 1 ? s.parts : [s];
        for (const u of units) {
          const text = (field === "spoken" ? heardOf(u) : u.text || "");
          const low = text.toLowerCase();
          for (let at = low.indexOf(want); at >= 0; at = low.indexOf(want, at + 1)) {
            if (++count < nth) continue;
            const idx = end ? at + want.length : at;
            const total = weight(text, text.length) || 1;
            return lerp(u.start, u.end, weight(text, idx) / total);
          }
        }
      }
    }
    throw new Error(`"${needle}" is not spoken in scene "${id}"${sentence == null ? "" : ` sentence ${sentence}`}`);
  }

  /**
   * A time from a compact spec, for the kit and for modules:
   *   12.5              seconds
   *   "g1-vague"        the scene's first sentence
   *   "g1-vague#2"      sentence 2
   *   "g1-vague|drive"  the word "drive" (| and nth: "g1-vague|the|2"; end of phrase: "g1-vague|drive$")
   *   ["g1-vague|drive", 0.3]   plus an offset in seconds
   */
  function time(spec) {
    if (typeof spec === "number") return spec;
    if (Array.isArray(spec)) return time(spec[0]) + (spec[1] || 0);
    const s = String(spec);
    if (s.includes("|")) {
      const [id, phrase, n] = s.split("|");
      const end = phrase.endsWith("$");
      return word(id, end ? phrase.slice(0, -1) : phrase, { nth: n ? Number(n) : 1, end });
    }
    const [id, i] = s.split("#");
    return cue(id, i ? Number(i) : 0);
  }

  /** Eased 0..1 progress of a move that starts at t0 and lasts dur seconds. */
  const prog = (t, t0, dur = 0.6, e = ease.inOut) => e(clamp((t - t0) / dur));

  /** 0..1 visibility: fades in at t0, out at t1 (t1 omitted = stays). */
  function within(t, t0, t1 = Infinity, fade = 0.35) {
    const up = clamp((t - t0) / fade);
    const down = t1 === Infinity ? 1 : clamp((t1 - t) / fade);
    return Math.min(up, down);
  }

  const $ = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`no element ${sel}`);
    return el;
  };

  /** Set opacity plus an optional rise: show(el, p) fades in; show(el, p, 24) also slides up 24px. */
  function show(el, p, rise = 0, extra = "") {
    el.style.opacity = p;
    el.style.visibility = p <= 0.001 ? "hidden" : "visible";
    el.style.transform = `translateY(${(1 - p) * rise}px) ${extra}`.trim();
  }

  /** Reveal an SVG path by length: draw(path, p). */
  function draw(path, p) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len * (1 - clamp(p))}`;
  }

  /** Characters of text typed out by p. */
  const typed = (text, p) => text.slice(0, Math.round(text.length * clamp(p)));

  /** Burned-in captions from the narration. Silent clips need them; narrated ones may opt in. */
  let captionsOn = !T.voiced;
  function captions(t) {
    let box = document.getElementById("captions");
    if (!box) {
      box = document.createElement("div");
      box.id = "captions";
      document.getElementById("stage").append(box);
    }
    let text = "";
    if (captionsOn) {
      for (const s of T.scenes) for (const c of s.sentences) if (t >= c.start && t < c.end + 0.25) text = c.text;
    }
    if (box.dataset.text !== text) {
      box.dataset.text = text;
      box.innerHTML = "";
      if (text) { const span = document.createElement("span"); span.textContent = text; box.append(span); }
    }
  }

  function play(render) {
    const frame = (t) => { render(t); captions(t); };
    window.DURATION = T.duration;
    window.render = frame;
    window.ready = document.fonts.ready.then(() => { frame(0); return true; });

    // ?preview plays the clip in real time with its narration, for a look before rendering.
    // ?t=12.5 freezes on one moment.
    const q = new URLSearchParams(location.search);
    if (q.has("t")) window.ready.then(() => frame(Number(q.get("t"))));
    if (q.has("preview")) {
      window.ready.then(() => {
        const audio = new Audio("build/narration.wav");
        const start = () => {
          audio.play().catch(() => {});
          const t0 = performance.now();
          const tick = () => {
            const t = T.voiced ? audio.currentTime : (performance.now() - t0) / 1000;
            frame(Math.min(t, T.duration));
            if (t < T.duration) requestAnimationFrame(tick);
          };
          tick();
        };
        document.body.addEventListener("click", start, { once: true });
        document.title = "click to play - " + document.title;
      });
    }
  }

  window.Stage = {
    timing: T, scene, cue, part, word, time, prog, within, lerp, clamp, ease, $, show, draw, typed, play,
    captions: (on) => { captionsOn = on; },
  };
})();
