// K.bars: grow, a capacity line, a later step, a verdict tone.
Kit.module("br", (K) => {
  K.heading("Bars", { sub: "demand ÷ capacity", at: "br-demo" });
  K.bars({
    x: 60, y: 330, w: 1700, max: 9, line: { value: 1, label: "capacity" }, gap: 200,
    rows: [
      { label: "Database", sub: "20,000 vs 8,000", value: 2.5, at: "br-demo|database", format: (v) => `${v.toFixed(1)}×` },
      { label: "Network", sub: "80 vs 10 Gbps", value: 8, at: "br-demo|the network", tone: "bad", toneAt: "br-demo|eight times",
        steps: [{ value: 1, at: "br-demo|drops back" }], format: (v) => `${v.toFixed(1)}×` },
    ],
  });
});
