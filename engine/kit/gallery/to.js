// Toasts: nine kinds in the frame (script.json "toasts"), and one placed by a module with its own text.
Kit.module("to", (K) => {
  K.scene("to-kinds", () => {
    K.heading("Toasts", { sub: "one fixed meaning per kind" });
    K.lines([
      "the frame shows them top right, above the content",
      "each one pops up on its phrase",
      "and leaves after about three seconds",
    ], { x: 60, y: 300, gap: 24 });
  });
  K.scene("to-module", () => {
    K.heading("A module's own toast");
    K.text("the content this toast belongs to", { size: "text", x: 60, y: 420 });
    K.toast("idea", { at: "to-module|custom text", text: "Placed by the module", x: 60, y: 300 });
  });
});
