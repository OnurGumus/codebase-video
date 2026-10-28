// K.code: lines glow as they run; notes point at lines; changes add and strike lines.
Kit.module("cd", (K) => {
  K.code({
    title: "The consume loop", x: 60, y: 220, at: "cd-demo", until: "cd-notes",
    lines: ["var cr = consumer.Consume(ct);", "await HandleOrderAsync(cr.Message.Value, ct);", "consumer.Commit(cr);"],
    glow: [
      { line: 0, from: "cd-demo|read", until: "cd-demo|handle" },
      { line: 1, from: "cd-demo|handle", until: "cd-demo|commit" },
      { line: 2, from: "cd-demo|commit", tone: "good" },
    ],
  });

  // notes: one per line, right of the card, each joined to its line by a short wire
  K.scene("cd-notes", () => {
    const S = "cd-notes";
    K.code({
      title: "The consume loop", x: 60, y: 220,
      lines: ["var cr = consumer.Consume(ct);", "await HandleOrderAsync(cr.Message.Value, ct);", "consumer.Commit(cr);"],
      notes: [
        { line: 0, html: "the next message", at: S + "|reads the next message" },
        { line: 2, html: "marks it done", at: S + "|marks it done", tone: "good" },
      ],
    });
  });

  // changes: the new line opens in, the old one is struck through and then closes
  K.scene("cd-diff", () => {
    const S = "cd-diff";
    K.code({
      title: "The consume loop", x: 60, y: 220,
      lines: ["var cr = consumer.Consume(ct);", "await HandleOrderAsync(cr.Message.Value, ct);", "consumer.Commit(cr);", "consumer.StoreOffset(cr);"],
      changes: [
        { line: 2, kind: "del", at: S + "|struck through", until: S + "|the old line goes" },
        { line: 3, kind: "add", at: S + "|opens in" },
      ],
    });
  });
});
