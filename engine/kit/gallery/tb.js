// K.table with a focused current row.
Kit.module("tb", (K) => {
  K.heading("A table", { at: "tb-demo" });
  K.table({
    x: 60, y: 250, w: 1500, cols: ["Box", "Its job", "Its price"], widths: [1, 1.4, 1.4], focus: true, headerAt: "tb-demo|table",
    rows: [
      { cells: ["Cache", "keeps hot data in memory", "stale reads"], at: "tb-demo|the cache" },
      { cells: ["Load balancer", "spreads requests", "one more hop"], at: "tb-demo|load balancer" },
      { cells: ["Queue", "holds slow work", "a job can run twice"], at: "tb-demo|the queue", tone: "warn", toneAt: "tb-demo|the queue" },
    ],
    until: "br-demo",
  });
});
