(() => {
  let picked = [];
  const baseRenderWordSearch = renderWordSearch;

  function coordOf(cell) {
    return [+cell.dataset.r, +cell.dataset.c];
  }

  function coordKey(coord) {
    return `${coord[0]},${coord[1]}`;
  }

  function sameCoord(a, b) {
    return !!a && !!b && a[0] === b[0] && a[1] === b[1];
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

  function paintPicked() {
    clearPreview();
    clearPickedVisual();
    for (const [r, c] of picked) {
      document.querySelector(`.wsCell[data-r="${r}"][data-c="${c}"]`)?.classList.add("picked");
    }
  }

  function resetPicked() {
    picked = [];
    clearPreview();
    clearPickedVisual();
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

  function markWrongAndReset() {
    for (const [r, c] of picked) {
      document.querySelector(`.wsCell[data-r="${r}"][data-c="${c}"]`)
        ?.classList.add("wrong-pick");
    }
    setTimeout(() => resetPicked(), 420);
  }

  function evaluatePicked() {
    if (!last || last.mode !== "wordsearch" || !picked.length) return;
    const puzzle = last.puzzle;

    const exact = puzzle.placed.find((item) => selectionExactlyMatches(item));
    if (exact) {
      if (exact.found) {
        setWsStatus(`이미 찾은 낱말이에요 · ${exact.word}`, "success");
        resetPicked();
        return;
      }

      exact.found = true;
      const foundCount = puzzle.placed.filter((item) => item.found).length;
      const isComplete = foundCount === puzzle.placed.length;
      resetPicked();
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
      const maxNeeded = Math.min(...possible.map((item) => item.cells.length));
      setWsStatus(`${picked.length}칸 선택 · 이 낱말은 ${maxNeeded}글자입니다. 남은 글자를 계속 클릭하세요.`, "selecting");
      paintPicked();
      return;
    }

    setWsStatus("아니에요. 선택한 칸 조합으로 완성되는 낱말이 없습니다.", "error");
    paintPicked();
    markWrongAndReset();
  }

  function togglePicked(coord) {
    const index = picked.findIndex((x) => sameCoord(x, coord));
    if (index >= 0) picked.splice(index, 1);
    else picked.push(coord);

    if (!picked.length) {
      resetPicked();
      setWsStatus("선택을 취소했습니다. 낱말을 이루는 글자를 하나씩 클릭하세요.");
      return;
    }
    evaluatePicked();
  }

  /* Drag remains a shortcut: every cell in the dragged line is treated as a pick.
     Matching is set-based, so order does not matter. */
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
      pointer = { start, cells: [start], moved: false };
      grid.setPointerCapture?.(event.pointerId);
    });

    grid.addEventListener("pointermove", (event) => {
      if (!pointer) return;
      event.preventDefault();
      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      const end = coordOf(cell);
      const cells = lineCells(pointer.start, end);
      if (!cells.length) return;
      pointer.cells = cells;
      if (!sameCoord(pointer.start, end)) pointer.moved = true;
      clearPickedVisual();
      showPreview(cells);
    });

    grid.addEventListener("pointerup", (event) => {
      if (!pointer) return;
      event.preventDefault();
      const current = pointer;
      pointer = null;

      if (current.moved && current.cells.length >= 2) {
        finishWsSelection(current.cells);
        return;
      }

      clearPreview();
      togglePicked(current.start);
    });

    grid.addEventListener("pointercancel", () => {
      pointer = null;
      clearPreview();
      paintPicked();
    });
  };

  renderWordSearch = function renderWordSearchWithMultiClickCopy(puzzle, show) {
    baseRenderWordSearch(puzzle, show);

    const stat = [...document.querySelectorAll(".stats .stat")]
      .find((el) => el.textContent.includes("드래그") || el.textContent.includes("클릭"));
    if (stat) stat.textContent = "글자마다 클릭";

    const status = document.getElementById("wsStatus");
    if (status && !status.classList.contains("done")) {
      const foundCount = puzzle.placed.filter((item) => item.found).length;
      status.textContent = `찾은 낱말 ${foundCount}/${puzzle.placed.length} · 낱말을 이루는 모든 칸을 하나씩 클릭하세요. 순서는 상관없습니다.`;
    }
  };
})();
