// Intro: a title and a subtitle, each on its words.
Kit.module("intro", (K) => {
  K.text("Stage kit gallery", { size: "title", x: 0, w: 1920, y: 380, align: "center", at: "intro|gallery" });
  K.text("every piece, as the narrator names it", { size: "big", x: 0, w: 1920, y: 510, align: "center", at: "intro|each piece", tone: "muted" });
});
