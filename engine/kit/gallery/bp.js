// Breathing room: a [pause] after a key point and a [think] countdown (drawn by the frame).
Kit.module("bp", (K) => {
  K.scene("bp-demo", () => {
    K.heading("Breathing room", { sub: "[pause] and [think]" });
    K.lines([
      { html: "a key point, then a pause", at: "bp-demo|key point" },
      { html: "why does a pause help?", at: "bp-demo|why does a pause", tone: "accent" },
      { html: "time to connect it to what you know", at: "bp-demo|Because" },
    ], { x: 60, y: 300, gap: 24 });
  });
});
