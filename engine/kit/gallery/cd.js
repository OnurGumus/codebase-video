// K.code: lines glow as they run.
Kit.module("cd", (K) => {
  K.code({
    title: "The consume loop", x: 60, y: 220, at: "cd-demo",
    lines: ["var cr = consumer.Consume(ct);", "await HandleOrderAsync(cr.Message.Value, ct);", "consumer.Commit(cr);"],
    glow: [
      { line: 0, from: "cd-demo|read", until: "cd-demo|handle" },
      { line: 1, from: "cd-demo|handle", until: "cd-demo|commit" },
      { line: 2, from: "cd-demo|commit", tone: "good" },
    ],
  });
});
