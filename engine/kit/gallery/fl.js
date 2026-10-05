// K.flow: boxes, arrows drawn on their word, packets travelling, a reply; then edges that choose where they attach.
Kit.module("fl", (K) => {
  K.heading("A flow", { at: "fl-demo" });
  K.flow({
    nodes: {
      client: { label: "client", x: 160, y: 460, at: "fl-demo|boxes" },
      server: { label: "server", sub: "one of many", x: 1280, y: 440, at: "fl-demo|boxes" },
    },
    edges: [{ from: "client", to: "server", at: "fl-demo|arrows" }],
    packets: [
      { from: "client", to: "server", at: "fl-demo|calls", dur: 1.2, label: "request" },
      { from: "server", to: "client", at: "fl-demo|the reply", dur: 1.2, label: "reply", tone: "good", lift: 90 },
    ],
    until: "fl-attach",
  });

  // fromPos / toPos: two pairs of edges leave the bottom side of one box. Without them all four would meet
  // that side at its centre, 40 px apart, and "answers" would sit on "writes".
  K.scene("fl-attach", () => {
    const S = "fl-attach";
    K.flow({
      at: S + "|The service",
      nodes: {
        service: { label: "service", icon: "⚙️", tone: "accent", x: 460, y: 300, w: 1000 },
        cache: { label: "cache", icon: "⚡", tone: "violet", x: 300, y: 700, w: 480, at: S + "|reads the cache" },
        db: { label: "database", icon: "🗄️", tone: "cyan", x: 1140, y: 700, w: 480, at: S + "|writes to the database" },
      },
      edges: [
        // each pair: the edge out, then the edge back with the two positions swapped, so the lanes stay parallel
        { from: "service", to: "cache", label: "reads", fromPos: 0.2, toPos: 0.75, at: S + "|reads the cache" },
        { from: "cache", to: "service", label: "answers", fromPos: 0.75, toPos: 0.2, at: [S + "|reads the cache", 0.5] },
        { from: "service", to: "db", label: "writes", fromPos: 0.8, toPos: 0.25, at: S + "|writes to the database" },
        { from: "db", to: "service", label: "confirms", fromPos: 0.25, toPos: 0.8, at: [S + "|writes to the database", 0.5] },
      ],
      packets: [
        { from: "service", to: "db", fromPos: 0.8, toPos: 0.25, at: [S + "|writes to the database", 0.3], dur: 1.2, label: "row" },
      ],
    });
    K.text("fromPos, toPos: 0 to 1 along a box side", { size: "small", tone: "muted", x: 60, y: 920, at: S + "|where it meets" });
  });
});
