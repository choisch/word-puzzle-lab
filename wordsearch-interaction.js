(() => {
  let clickStart = null;
  const baseRenderWordSearch = renderWordSearch;

  function coordOf(cell) {
    return [+cell.dataset.r, +cell.dataset.c];
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

  finishWsSelection = function finishWsSelectionWithFeedback(cells) {
    clearPreview();
    if (!last || last.mode !== "wordsearch" || cells.length < 2) return;

    const puzzle = last.puzzle;
    const reversed = [...cells].reverse();
    let hit = null;

    for (const item of puzzle.placed) {
      if (samePath(cells, item.cells) || samePath(reversed, item.cells)) {
        hit = item;
        break;
      }
    }

    if (!hit) {
      setWsStatus("아니에요. 그 방향에는 찾을 낱말이 없습니다.", "error");
      return;
    }

    if (hit.found) {
      setWsStatus(`이미 찾은 낱말이에요 · ${hit.word}`, "success");
      return;
    }

    hit.found = true;
    const foundCount = puzzle.placed.filter((item) => item.found).length;
    const isComplete = foundCount === puzzle.placed.length;

    renderWordSearch(puzzle, revealed);
    pulseFound(hit);

    if (isComplete) {
      setWsStatus(`완료! 마지막 정답은 “${hit.word}” · 모든 낱말을 찾았습니다.`, "done success");
    } else {
      setWsStatus(`정답! “${hit.word}”을 찾았습니다. · ${foundCount}/${puzzle.placed.length}`, "success");
    }
  };

  bindWordSearch = function bindWordSearchClickAndDrag() {
    const grid = document.querySelector(".wsGrid");
    if (!grid) return;

    clickStart = null;
    let pointer = null;

    const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest(".wsCell");

    const showClickStart = () => {
      clearPreview();
      if (!clickStart) return;
      const [r, c] = clickStart;
      const cell = document.querySelector(`.wsCell[data-r="${r}"][data-c="${c}"]`);
      cell?.classList.add("preview", "selected-start");
    };

    const handleClick = (coord) => {
      if (!clickStart) {
        clickStart = coord;
        showClickStart();
        setWsStatus("시작 글자를 선택했습니다. 마지막 글자를 클릭하세요.", "selecting");
        return;
      }

      if (sameCoord(clickStart, coord)) {
        clickStart = null;
        clearPreview();
        setWsStatus("선택을 취소했습니다. 첫 글자를 다시 클릭하세요.");
        return;
      }

      const cells = lineCells(clickStart, coord);
      if (!cells.length) {
        showClickStart();
        setWsStatus("가로, 세로 또는 대각선 방향의 마지막 글자를 선택하세요.", "error");
        return;
      }

      clickStart = null;
      finishWsSelection(cells);
    };

    grid.addEventListener("pointerdown", (event) => {
      const cell = event.target.closest(".wsCell");
      if (!cell) return;

      event.preventDefault();
      const start = coordOf(cell);
      pointer = { start, cells: [start], moved: false };
      showPreview(pointer.cells);
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
      showPreview(cells);
    });

    grid.addEventListener("pointerup", (event) => {
      if (!pointer) return;
      event.preventDefault();

      const current = pointer;
      pointer = null;

      if (current.moved && current.cells.length >= 2) {
        clickStart = null;
        finishWsSelection(current.cells);
        return;
      }

      handleClick(current.start);
    });

    grid.addEventListener("pointercancel", () => {
      pointer = null;
      clearPreview();
      showClickStart();
    });
  };

  renderWordSearch = function renderWordSearchWithInteractionCopy(puzzle, show) {
    baseRenderWordSearch(puzzle, show);

    const stat = [...document.querySelectorAll(".stats .stat")]
      .find((el) => el.textContent.includes("드래그"));
    if (stat) stat.textContent = "클릭 또는 드래그";

    const status = document.getElementById("wsStatus");
    if (status && !status.classList.contains("done")) {
      const foundCount = puzzle.placed.filter((item) => item.found).length;
      status.textContent = `찾은 낱말 ${foundCount}/${puzzle.placed.length} · 첫 글자와 마지막 글자를 클릭하거나 드래그하세요.`;
    }
  };
})();
