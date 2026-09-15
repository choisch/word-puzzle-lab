(() => {
  let picked = [];
  const baseRenderWordSearch = renderWordSearch;
  const DRAG_THRESHOLD = 10;

  function coordOf(cell) {
    return [+cell.dataset.r, +cell.dataset.c];
  }

  function coordKey(coord) {
    return `${coord[0]},${coord[1]}`;
  }

  function sameCoord(a, b) {
    return !!a && !!b && a[0] === b[0] && a[1] === b[1];
  }

  function isPicked(coord) {
    return picked.some((x) => sameCoord(x, coord));
  }

  function setWsStatus(message, tone = "") {
    const status = document.getElementById("wsStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `wsStatus${tone ? ` ${tone}` : ""}`;
  }

  function itemKeys(item) {
    return new Set(item.cells.map(coordKey));
  }

  function selectionIsSubsetOf(item) {
    const keys = itemKeys(item);
    return picked.every((coord) => keys.has(coordKey(coord)));
  }

  function selectionExactlyMatches(item) {
    return picked.length === item.cells.length && selectionIsSubsetOf(item);
  }

  function clearPickedVisual() {
    document.querySelectorAll(".wsCell.picked,.wsCell.wrong-pick")
      .forEach((cell) => cell.classList.remove("picked", "wrong-pick"));
  }

  function updateCancelButton() {
    const button = document.getElementById("wsCancelSelection");
    if (!button) return;
    button.hidden = picked.length === 0;
    button.textContent = picked.length ? `선택 취소 (${picked.length})` : "선택 취소";
  }

  function paintPicked(isWrong = false) {
    clearPreview();
    clearPickedVisual();
    for (const [r, c] of picked) {
      const cell = document.querySelector(`.wsCell[data-r="${r}"][data-c="${c}"]`);
      cell?.classList.add("picked");
      if (isWrong) cell?.classList.add("wrong-pick");
    }
    updateCancelButton();
  }

  function resetPicked(message = "선택을 취소했습니다. 낱말을 이루는 글자를 하나씩 클릭하세요.") {
    picked = [];
    clearPreview();
    clearPickedVisual();
    updateCancelButton();
    if (message) setWsStatus(message);
  }

  function pulseFound(item) {
    requestAnimationFrame(() => {
      for (const [r, c] of item.cells) {
        document.querySelector(`.wsCell[data-r="${r}"][data-c="${c}"]`)?.classList.add("just-found");
      }
      [...document.querySelectorAll(".word")]
        .find((el) => el.textContent.trim() === item.word)
        ?.classList.add("just-found");
    });
  }

  function evaluatePicked() {
    if (!last || last.mode !== "wordsearch" || !picked.length) return;
    const puzzle = last.puzzle;

    const exact = puzzle.placed.find((item) => selectionExactlyMatches(item));
    if (exact) {
      if (exact.found) {
        setWsStatus(`이미 찾은 낱말이에요 · ${exact.word}`, "success");
        resetPicked("");
        return;
      }

      exact.found = true;
      const foundCount = puzzle.placed.filter((item) => item.found).length;
      const isComplete = foundCount === puzzle.placed.length;
      picked = [];
      clearPickedVisual();
      renderWordSearch(puzzle, revealed);
      pulseFound(exact);

      if (isComplete) {
        setWsStatus(`완료! 마지막 정답은 “${exact.word}” · 모든 낱말을 찾았습니다.`, "done success");
      } else {
        setWsStatus(`정답! “${exact.word}”을 찾았습니다. · ${foundCount}/${puzzle.placed.length}`, "success");
      }
      return;
    }

    const possible = puzzle.placed.filter((item) => !item.found && item.cells.length > picked.length && selectionIsSubsetOf(item));
    if (possible.length) {
      const minLength = Math.min(...possible.map((item) => item.cells.length));
      setWsStatus(`${picked.length}칸 선택 · ${minLength}글자 낱말 후보가 있습니다. 계속 선택하거나 선택된 칸을 다시 눌러 취소하세요.`, "selecting");
      paintPicked(false);
      return;
    }

    setWsStatus("이 조합은 정답이 아닙니다. 잘못 고른 칸을 다시 누르면 그 칸의 선택이 바로 해제됩니다.", "error");
    paintPicked(true);
  }

  function togglePicked(coord) {
    const index = picked.findIndex((x) => sameCoord(x, coord));
    const cell = document.querySelector(`.wsCell[data-r="${coord[0]}"][data-c="${coord[1]}"]`);

    if (index >= 0) {
      /* Visually remove the selection immediately before any re-evaluation. */
      picked.splice(index, 1);
      cell?.classList.remove("picked", "wrong-pick", "preview", "selected-start");

      if (!picked.length) {
        resetPicked();
        return;
      }

      paintPicked(false);
      setWsStatus(`${picked.length}칸 선택 · 방금 누른 칸의 선택을 취소했습니다.`, "selecting");
      return;
    }

    picked.push(coord);
    evaluatePicked();
  }

  finishWsSelection = function finishWsSelectionAnyOrder(cells) {
    if (!last || last.mode !== "wordsearch" || cells.length < 2) return;
    picked = [];
    const seen = new Set();
    for (const coord of cells) {
      const k = coordKey(coord);
      if (!seen.has(k)) {
        seen.add(k);
        picked.push(coord);
      }
    }
    evaluatePicked();
  };

  bindWordSearch = function bindWordSearchMultiClick() {
    const grid = document.querySelector(".wsGrid");
    if (!grid) return;

    picked = [];
    let pointer = null;
    const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest(".wsCell");

    grid.addEventListener("pointerdown", (event) => {
      const cell = event.target.closest(".wsCell");
      if (!cell) return;
      event.preventDefault();
      const start = coordOf(cell);
      pointer = {
        start,
        cells: [start],
        x: event.clientX,
        y: event.clientY,
        dragged: false,
        startedOnPicked: isPicked(start),
      };
      grid.setPointerCapture?.(event.pointerId);
    });

    grid.addEventListener("pointermove", (event) => {
      if (!pointer) return;
      event.preventDefault();

      const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
      if (distance < DRAG_THRESHOLD) return;

      /* A gesture that starts on an already selected cell stays a cancel tap.
         This makes border cancellation reliable on touch screens. */
      if (pointer.startedOnPicked) return;

      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      const end = coordOf(cell);
      const cells = lineCells(pointer.start, end);
      if (!cells.length || cells.length < 2) return;

      pointer.cells = cells;
      pointer.dragged = true;
      clearPickedVisual();
      showPreview(cells);
    });

    grid.addEventListener("pointerup", (event) => {
      if (!pointer) return;
      event.preventDefault();
      const current = pointer;
      pointer = null;

      /* Tapping an already selected cell always cancels that exact border/selection. */
      if (current.startedOnPicked) {
        clearPreview();
        togglePicked(current.start);
        return;
      }

      if (current.dragged && current.cells.length >= 2) {
        finishWsSelection(current.cells);
        return;
      }

      clearPreview();
      togglePicked(current.start);
    });

    grid.addEventListener("pointercancel", () => {
      pointer = null;
      clearPreview();
      paintPicked(false);
    });
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && last?.mode === "wordsearch" && picked.length) {
      event.preventDefault();
      resetPicked();
    }
  });

  renderWordSearch = function renderWordSearchWithMultiClickCopy(puzzle, show) {
    baseRenderWordSearch(puzzle, show);

    const stat = [...document.querySelectorAll(".stats .stat")]
      .find((el) => el.textContent.includes("드래그") || el.textContent.includes("클릭"));
    if (stat) stat.textContent = "글자마다 클릭";

    const status = document.getElementById("wsStatus");
    if (status) {
      const cancelButton = document.createElement("button");
      cancelButton.id = "wsCancelSelection";
      cancelButton.type = "button";
      cancelButton.className = "wsCancelSelection";
      cancelButton.hidden = true;
      cancelButton.textContent = "선택 취소";
      cancelButton.addEventListener("click", () => resetPicked());
      status.insertAdjacentElement("afterend", cancelButton);

      if (!status.classList.contains("done")) {
        const foundCount = puzzle.placed.filter((item) => item.found).length;
        status.textContent = `찾은 낱말 ${foundCount}/${puzzle.placed.length} · 낱말을 이루는 모든 칸을 하나씩 클릭하세요. 선택된 칸은 다시 누르면 해제됩니다.`;
      }
    }
  };
})();
