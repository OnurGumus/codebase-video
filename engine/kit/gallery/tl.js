// K.timeline: proportional segments and a total.
Kit.module("tl", (K) => {
  K.heading("A timeline", { at: "tl-demo" });
  K.timeline({
    x: 60, y: 400, w: 1400, total: 128,
    segments: [
      { label: "lookup", value: 30, at: "tl-demo|thirty" },
      { label: "handshake", value: 90, at: "tl-demo|ninety", tone: "violet", toneAt: "tl-demo|ninety" },
      { label: "", value: 8, show: "8", at: "tl-demo|eight", tone: "accent", toneAt: "tl-demo|eight" },
    ],
    sum: { text: "308 ms", at: "tl-demo|in all" },
  });
});
