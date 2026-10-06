// K.sequence: actors over lifelines, messages drawn top to bottom on their words, a reply, a call to self.
Kit.module("sq", (K) => {
  const S = "sq-demo";
  K.heading("A sequence", { at: S });
  K.sequence({
    at: S + "|time down",
    actors: [
      { id: "client", label: "client", icon: "📱" },
      { id: "service", label: "service", icon: "⚙️", tone: "accent" },
      { id: "db", label: "database", icon: "🗄️", tone: "cyan" },
    ],
    messages: [
      { from: "client", to: "service", label: "request", at: S + "|sends a request" },
      { from: "service", to: "db", label: "query", at: S + "|runs a query" },
      { from: "db", to: "service", label: "rows", reply: true, at: S + "|rows come back" },
      { from: "service", to: "service", label: "check", at: S + "|checks them" },
      { from: "service", to: "client", label: "answer", reply: true, tone: "good", toneAt: S + "|answers", at: S + "|answers" },
    ],
  });
});
