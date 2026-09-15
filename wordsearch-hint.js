(() => {
  let hintOpen = false;
  let puzzleRef = null;

  function currentPuzzle() {
    try {
      return last?.mode === "wordsearch" ? last.puzzle : null;
    } catch (_) {
      return null;
    }
  }

  function enhanceWordList() {
    const side = document.querySelector(".wordSide");
    if (!side || side.dataset.hintEnhanced === "1") return;

    const puzzle = currentPuzzle();
    if (puzzle && puzzle !== puzzleRef) {
      puzzleRef = puzzle;
      hintOpen = false;
    }

    side.dataset.hintEnhanced = "1";

    /* Remove the older tiny toggle UI if it exists. */
    side.querySelectorAll(".wsWordListHeader,#wsWordListHiddenNote").forEach((el) => el.remove());
    side.querySelectorAll(":scope > h3").forEach((el) => el.remove());

    const header = document.createElement("button");
    header.type = "button";
    header.className = "wsHintCardHeader";
    header.setAttribute("aria-label", "찾을 낱말 힌트 열기");

    const title = document.createElement("span");
    title.className = "wsHintCardTitle";
    title.textContent = "찾을 낱말";

    const action = document.createElement("span");
    action.className = "wsHintCardAction";

    header.append(title, action);
    side.prepend(header);

    const apply = () => {
      side.classList.toggle("words-hidden", !hintOpen);
      header.setAttribute("aria-expanded", String(hintOpen));
      header.setAttribute("aria-label", hintOpen ? "찾을 낱말 힌트 닫기" : "찾을 낱말 힌트 보기");
      action.textContent = hintOpen ? "힌트 닫기 ⌄" : "힌트 보기 ›";
    };

    header.addEventListener("click", () => {
      hintOpen = !hintOpen;
      apply();
    });

    apply();
  }

  const observer = new MutationObserver(() => enhanceWordList());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceWordList();
})();
