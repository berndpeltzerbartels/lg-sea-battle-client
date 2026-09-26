// XIS owns the notification and its SSE updates; the game only positions the frame.
export function mountCrewInbox(url) {
  const frame = document.createElement("iframe");
  frame.title = "Besatzungsanfragen";
  frame.src = url;
  frame.style.cssText = "position:fixed;right:16px;bottom:176px;width:min(310px,calc(100vw - 32px));height:190px;border:0;background:transparent;z-index:30;visibility:hidden;pointer-events:none;";
  let observer;
  const narrowScreen = window.matchMedia("(max-width: 600px)");
  const position = () => {
    frame.style.top = narrowScreen.matches ? "80px" : "auto";
    frame.style.bottom = narrowScreen.matches ? "auto" : "176px";
  };
  narrowScreen.addEventListener("change", position);
  position();
  frame.addEventListener("load", () => {
    observer?.disconnect();
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    const update = () => {
      const card = doc.querySelector(".crew-request");
      const visible = Boolean(card && card.getBoundingClientRect().height > 0);
      frame.style.visibility = visible ? "visible" : "hidden";
      frame.style.pointerEvents = visible ? "auto" : "none";
      if (visible) frame.style.height = `${Math.ceil(card.getBoundingClientRect().height) + 2}px`;
      if (!visible && document.activeElement === frame) frame.blur();
    };
    // Mouse decisions must not take keyboard steering away from the game.
    doc.addEventListener("mousedown", event => {
      if (event.target.closest("button")) event.preventDefault();
    });
    observer = new MutationObserver(update);
    observer.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: true });
    update();
  });
  document.body.append(frame);
  return () => {
    observer?.disconnect();
    narrowScreen.removeEventListener("change", position);
    frame.remove();
  };
}
