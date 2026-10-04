// K.flow: boxes, arrows drawn on their word, packets travelling, a reply.
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
  });
});
