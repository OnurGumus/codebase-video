// K.board: typed working with a result line.
Kit.module("wb", (K) => {
  K.board({
    title: "On the whiteboard", x: 60, y: 220, w: 1500,
    rows: [{ label: "feed calls", text: "50M × 10 = 500M/day", at: "wb-demo|fifty million", dur: 2.2, result: "≈ 5.8k/s avg", resultAt: "wb-demo|a day" }],
  });
});
