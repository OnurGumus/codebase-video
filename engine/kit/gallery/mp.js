// The shared map (script.json "map"): K.map draws it inside a module; the frame draws it as the chapter's opener
// ("path" on km-why) and around the two scenes that are "inside" the service.
Kit.module("mp", (K) => {
  K.scene("mp-map", () => {
    const S = "mp-map";
    K.heading("The shared map", { sub: "K.map" });
    K.map({ reveal: { client: S + "|a client", service: S + "|a service", cache: S + "|a cache", database: S + "|a database" } });
  });

  // An "inside" scene draws its content as usual: the boundary and its tag are the frame's. The heading stays short,
  // so the row's right end is free for the tag.
  K.scene("mp-inside", () => {
    const S = "mp-inside";
    K.heading("Inside one part", { at: S + "|inside one part" });
    K.flow({
      nodes: {
        handler: { label: "handler", icon: "▶", tone: "accent", x: 260, y: 560, at: S + "|inside one part" },
        rules: { label: "rules", icon: "📦", x: 1100, y: 560, at: S + "|around the scene" },
      },
      edges: [{ from: "handler", to: "rules", label: "checks", at: S + "|around the scene" }],
    });
  });
  K.scene("mp-inside2", () => {
    const S = "mp-inside2";
    K.heading("Still inside");
    K.lines([
      { html: "the boundary stays for the whole visit", at: S + "|boundary stays" },
      { html: "then shrinks back to the box", at: S + "|shrinks back" },
    ], { x: 60, y: 420 });
  });
});
