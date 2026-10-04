// K.heading, K.lines (a note, a strike), K.chips (tones).
Kit.module("tx", (K) => {
  K.heading("A heading", { sub: "with a muted note", at: "tx-demo|heading", subAt: "tx-demo|sits at" });
  K.lines([
    { html: "first this one", at: "tx-demo|first this one", bullet: "1" },
    { html: "then a second", note: "a note under it", at: "tx-demo|a second", noteAt: "tx-demo|with a note", bullet: "2" },
    { html: "a third that gets struck out", at: "tx-demo|a third", strikeAt: "tx-demo|struck out", tone: "bad", toneAt: "tx-demo|struck out", bullet: "3" },
  ], { x: 60, y: 260, dim: true });
  K.chips([
    { text: "accent", at: "tx-demo|accent", tone: "accent" },
    { text: "good", at: "tx-demo|good", tone: "good" },
    { text: "bad", at: "tx-demo|bad,", tone: "bad" },
    { text: "warn", at: "tx-demo|warn", tone: "warn" },
  ], { x: 60, y: 720 });
});
