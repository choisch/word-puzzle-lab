(() => {
  const $id = (id) => document.getElementById(id);
  const wrap = document.querySelector('.wrap');
  const top = document.querySelector('.top');
  const tabs = document.querySelector('.tabs');
  const layout = document.querySelector('.layout');
  const settings = document.querySelector('.settings');
  const generateButton = $id('generate');
  const randomButton = $id('randomize');
  const checkButton = $id('check');
  const answerButton = $id('answer');
  const difficulty = $id('difficulty');

  if (!wrap || !top || !layout || !settings) return;

  let sudokuState = null;

  const portal = document.createElement('section');
  portal.className = 'puzzlePortal';
  portal.innerHTML = `
    <div class="portalHero">
      <div class="portalEyebrow">PUZZLE LAB</div>
      <h2>어떤 퍼즐을 할까요?</h2>
      <p>낱말부터 숫자까지, 원하는 퍼즐을 골라 바로 시작하세요.</p>
    </div>
    <div class="portalGrid">
      <button class="portalCard" type="button" data-game="crossword">
        <span class="portalIcon">가</span>
        <h3>가로세로 낱말퀴즈</h3>
        <p>힌트를 읽고 서로 교차하는 낱말을 완성합니다.</p>
        <span class="portalGo"><span>시작하기</span><span>›</span></span>
      </button>
      <button class="portalCard" type="button" data-game="wordsearch">
        <span class="portalIcon">찾</span>
        <h3>숨은 낱말 찾기</h3>
        <p>글자판 속에 숨어 있는 낱말을 찾아 선택합니다.</p>
        <span class="portalGo"><span>시작하기</span><span>›</span></span>
      </button>
      <button class="portalCard" type="button" data-game="sudoku">
        <span class="portalIcon">9</span>
        <h3>수도쿠</h3>
        <p>가로·세로·3×3 박스에 1부터 9까지 숫자를 채웁니다.</p>
        <span class="portalGo"><span>시작하기</span><span>›</span></span>
      </button>
    </div>`;

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'portalBack';
  back.textContent = '← 퍼즐 홈';

  top.insertAdjacentElement('afterend', back);
  back.insertAdjacentElement('afterend', portal);
  tabs?.classList.add('portal-tabs-hidden');

  function setTop(title, subtitle) {
    const h1 = top.querySelector('h1');
    const sub = top.querySelector('.sub');
    if (h1) h1.textContent = title;
    if (sub) sub.textContent = subtitle;
  }

  function restoreWordSettings() {
    settings.classList.remove('sudoku-settings');
    generateButton.textContent = '새 퍼즐 만들기';
    if (randomButton) randomButton.hidden = false;
  }

  function showPortal() {
    portal.classList.remove('portal-hidden');
    layout.classList.add('portal-hidden');
    back.classList.remove('visible');
    setTop('Puzzle Lab', '원하는 퍼즐을 골라 바로 시작하세요.');
  }

  function enterWordGame(nextMode) {
    restoreWordSettings();
    portal.classList.add('portal-hidden');
    layout.classList.remove('portal-hidden');
    back.classList.add('visible');
    setTop('Puzzle Lab', nextMode === 'crossword' ? '힌트를 풀어 가로세로 낱말을 완성하세요.' : '글자판 속 숨어 있는 낱말을 찾아보세요.');
    setMode(nextMode);
  }

  function shuffled(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeSolvedGrid() {
    const base = 3;
    const side = 9;
    const pattern = (r, c) => (base * (r % base) + Math.floor(r / base) + c) % side;
    const rBase = [0, 1, 2];
    const rows = shuffled(rBase).flatMap((g) => shuffled(rBase).map((r) => g * base + r));
    const cols = shuffled(rBase).flatMap((g) => shuffled(rBase).map((c) => g * base + c));
    const nums = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    return rows.map((r) => cols.map((c) => nums[pattern(r, c)]));
  }

  function candidateList(board, r, c) {
    if (board[r][c]) return [];
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      if (board[r][i]) used.add(board[r][i]);
      if (board[i][c]) used.add(board[i][c]);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) if (board[rr][cc]) used.add(board[rr][cc]);
    return [1,2,3,4,5,6,7,8,9].filter((n) => !used.has(n));
  }

  function countSolutions(board, limit = 2) {
    let best = null;
    let bestCandidates = null;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        const candidates = candidateList(board, r, c);
        if (!candidates.length) return 0;
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          best = [r, c];
          bestCandidates = candidates;
          if (candidates.length === 1) break;
        }
      }
      if (bestCandidates?.length === 1) break;
    }
    if (!best) return 1;
    let count = 0;
    const [r, c] = best;
    for (const n of bestCandidates) {
      board[r][c] = n;
      count += countSolutions(board, limit - count);
      board[r][c] = 0;
      if (count >= limit) return count;
    }
    return count;
  }

  function makeSudoku(level) {
    const solution = makeSolvedGrid();
    const puzzle = solution.map((row) => [...row]);
    const targetClues = level === 'easy' ? 40 : level === 'hard' ? 27 : 32;
    const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
    let clues = 81;

    for (const index of cells) {
      if (clues <= targetClues) break;
      const r = Math.floor(index / 9);
      const c = index % 9;
      const keep = puzzle[r][c];
      puzzle[r][c] = 0;
      const probe = puzzle.map((row) => [...row]);
      if (countSolutions(probe, 2) === 1) clues--;
      else puzzle[r][c] = keep;
    }

    return {
      solution,
      puzzle,
      current: puzzle.map((row) => [...row]),
      given: puzzle.map((row) => row.map((v) => v !== 0)),
      selected: null,
      revealed: false,
      clues,
    };
  }

  function sudokuDifficultyLabel() {
    return difficulty.value === 'easy' ? '쉬움' : difficulty.value === 'hard' ? '어려움' : '보통';
  }

  function updateSudokuHeader() {
    $id('title').textContent = '수도쿠';
    $id('meta').textContent = `9 × 9 · ${sudokuDifficultyLabel()} · 숫자 논리 퍼즐`;
  }

  function sudokuValueAt(r, c) {
    if (!sudokuState) return 0;
    return sudokuState.revealed ? sudokuState.solution[r][c] : sudokuState.current[r][c];
  }

  function paintSudoku() {
    if (!sudokuState) return;
    const selected = sudokuState.selected;
    const selectedValue = selected ? sudokuValueAt(selected[0], selected[1]) : 0;
    document.querySelectorAll('.sudokuCell').forEach((cell) => {
      const r = +cell.dataset.r;
      const c = +cell.dataset.c;
      const given = sudokuState.given[r][c];
      const value = sudokuValueAt(r, c);
      const isSelected = selected && selected[0] === r && selected[1] === c;
      const related = selected && (selected[0] === r || selected[1] === c || (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)));
      const sameNumber = selectedValue && value === selectedValue && !isSelected;

      cell.textContent = value || '';
      cell.classList.toggle('given', given);
      cell.classList.toggle('user', !given && !!value && !sudokuState.revealed);
      cell.classList.toggle('selected', !!isSelected);
      cell.classList.toggle('related', !!related && !isSelected);
      cell.classList.toggle('same-number', !!sameNumber);
      cell.classList.toggle('reveal', sudokuState.revealed && !given);
      if (!sudokuState.revealed) cell.classList.remove('wrong');
    });
    answerButton.textContent = sudokuState.revealed ? '정답 숨기기' : '정답 보기';
  }

  function setSudokuNumber(value) {
    if (!sudokuState || sudokuState.revealed || !sudokuState.selected) return;
    const [r, c] = sudokuState.selected;
    if (sudokuState.given[r][c]) return;
    sudokuState.current[r][c] = value;
    paintSudoku();
    const status = document.querySelector('.sudokuStatus');
    if (status) { status.className = 'sudokuStatus'; status.textContent = ''; }
  }

  function renderSudoku() {
    const s = sudokuState;
    let cells = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const classes = ['sudokuCell'];
        if (c === 2 || c === 5) classes.push('box-right');
        if (r === 2 || r === 5) classes.push('box-bottom');
        cells += `<button type="button" class="${classes.join(' ')}" data-r="${r}" data-c="${c}" aria-label="${r + 1}행 ${c + 1}열"></button>`;
      }
    }

    $id('content').className = '';
    $id('content').innerHTML = `
      <div class="stats">
        <span class="stat">9 × 9</span>
        <span class="stat">${sudokuDifficultyLabel()}</span>
        <span class="stat">힌트 숫자 ${s.clues}개</span>
      </div>
      <div class="sudokuWrap">
        <div>
          <div class="sudokuBoardShell"><div class="sudokuBoard">${cells}</div></div>
          <div class="sudokuStatus">빈 칸을 누르고 숫자를 선택하세요.</div>
        </div>
        <aside class="sudokuSide">
          <div class="sudokuSideTitle">NUMBER PAD</div>
          <div class="sudokuPad">
            ${[1,2,3,4,5,6,7,8,9].map((n) => `<button type="button" class="sudokuNum" data-number="${n}">${n}</button>`).join('')}
            <button type="button" class="sudokuErase">선택 칸 지우기</button>
          </div>
          <div class="sudokuHelp">각 가로줄, 세로줄, 3×3 박스에 1부터 9까지가 한 번씩 들어가도록 채우세요.</div>
        </aside>
      </div>`;

    document.querySelectorAll('.sudokuCell').forEach((cell) => {
      cell.addEventListener('click', () => {
        sudokuState.selected = [+cell.dataset.r, +cell.dataset.c];
        paintSudoku();
      });
    });
    document.querySelectorAll('.sudokuNum').forEach((button) => button.addEventListener('click', () => setSudokuNumber(+button.dataset.number)));
    document.querySelector('.sudokuErase')?.addEventListener('click', () => setSudokuNumber(0));
    paintSudoku();
  }

  function generateSudoku() {
    sudokuState = makeSudoku(difficulty.value);
    mode = 'sudoku';
    last = { mode: 'sudoku', puzzle: sudokuState };
    revealed = false;
    updateSudokuHeader();
    checkButton.classList.remove('hidden');
    answerButton.textContent = '정답 보기';
    renderSudoku();
  }

  function checkSudoku() {
    if (!sudokuState) return;
    let filled = 0;
    let correct = 0;
    let wrong = 0;
    document.querySelectorAll('.sudokuCell').forEach((cell) => {
      const r = +cell.dataset.r;
      const c = +cell.dataset.c;
      const value = sudokuState.current[r][c];
      cell.classList.remove('wrong');
      if (value) {
        filled++;
        if (value === sudokuState.solution[r][c]) correct++;
        else {
          wrong++;
          if (!sudokuState.given[r][c]) cell.classList.add('wrong');
        }
      }
    });
    const status = document.querySelector('.sudokuStatus');
    if (!status) return;
    if (correct === 81) {
      status.className = 'sudokuStatus ok';
      status.textContent = '완성! 모든 칸이 맞았습니다.';
    } else if (wrong) {
      status.className = 'sudokuStatus bad';
      status.textContent = `틀린 칸 ${wrong}개 · 채운 칸 ${filled}/81`;
    } else {
      status.className = 'sudokuStatus';
      status.textContent = `현재까지 모두 맞습니다 · 채운 칸 ${filled}/81`;
    }
  }

  function toggleSudokuAnswer() {
    if (!sudokuState) return;
    sudokuState.revealed = !sudokuState.revealed;
    revealed = sudokuState.revealed;
    paintSudoku();
    const status = document.querySelector('.sudokuStatus');
    if (status) {
      status.className = 'sudokuStatus';
      status.textContent = sudokuState.revealed ? '정답을 표시하고 있습니다.' : '직접 입력한 상태로 돌아왔습니다.';
    }
  }

  function enterSudoku() {
    portal.classList.add('portal-hidden');
    layout.classList.remove('portal-hidden');
    back.classList.add('visible');
    settings.classList.add('sudoku-settings');
    generateButton.textContent = '새 수도쿠';
    if (randomButton) randomButton.hidden = true;
    setTop('Puzzle Lab', '가로·세로·3×3 박스의 숫자를 완성하세요.');
    generateSudoku();
  }

  portal.querySelectorAll('.portalCard').forEach((card) => {
    card.addEventListener('click', () => {
      const game = card.dataset.game;
      if (game === 'sudoku') enterSudoku();
      else enterWordGame(game);
    });
  });

  back.addEventListener('click', showPortal);

  generateButton.addEventListener('click', (event) => {
    if (mode !== 'sudoku') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    generateSudoku();
  }, true);

  checkButton.addEventListener('click', (event) => {
    if (mode !== 'sudoku') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    checkSudoku();
  }, true);

  answerButton.addEventListener('click', (event) => {
    if (mode !== 'sudoku') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleSudokuAnswer();
  }, true);

  difficulty.addEventListener('change', (event) => {
    if (mode !== 'sudoku') return;
    event.stopImmediatePropagation();
    generateSudoku();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (mode !== 'sudoku' || !sudokuState || sudokuState.revealed) return;
    if (/^[1-9]$/.test(event.key)) setSudokuNumber(+event.key);
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') setSudokuNumber(0);
  });

  showPortal();
})();
