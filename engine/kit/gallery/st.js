// K.steps and K.counter.
Kit.module("st", (K) => {
  K.steps(["Find what runs out", "Pick the cheapest move", "Say the price"], { ats: ["st-demo|find", "st-demo|move", "st-demo|price"] });
  K.counter({ x: 60, y: 420, from: 0, to: 3000000, at: "st-demo|counter", dur: 1.6, format: (v) => `× ${Math.round(v).toLocaleString("en-US")}` });
});
