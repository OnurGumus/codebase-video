// K.table with a focused current row; then a table whose cells wait for their own words.
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

  // Cells with their own times: a row arrives on its name, each number on its own word.
  K.scene("tb-cells", () => {
    const S = "tb-cells";
    K.table({
      x: 60, y: 250, w: 1500, cols: ["Plan", "Requests", "Price"], widths: [1, 1, 1], headerAt: S + "|table cell",
      rows: [
        { cells: ["Small", { html: "1,000", at: S + "|one thousand" }, { text: "$5", at: S + "|five dollars", tone: "good" }], at: S + "|small plan" },
        { cells: ["Large", { html: "10,000", at: S + "|ten thousand" }, { text: "$40", at: S + "|forty dollars", tone: "warn", toneAt: S + "|forty dollars$" }], at: S + "|large plan" },
      ],
    });
  });
});
