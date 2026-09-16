(() => {
  const portal = document.querySelector('.puzzlePortal');
  const grid = portal?.querySelector('.portalGrid');
  const layout = document.querySelector('.layout');
  const content = document.getElementById('content');
  const back = document.querySelector('.portalBack');
  const top = document.querySelector('.top');
  if (!portal || !grid || !layout || !content || !back || !top) return;

  const BEST_KEY = 'nb_best';
  let secret = [];
  let tries = [];
  let finished = false;
  let historyVisible = true;
  let best = null;
  try { best = Number(localStorage.getItem(BEST_KEY)) || null; } catch (_) {}

  function setTop(subtitle) {
    const h1 = top.querySelector('h1');
    const sub = top.querySelector('.sub');
    if (h1) h1.textContent = 'Puzzle Lab';
    if (sub) sub.textContent = subtitle;
  }

  function makeSecret() {
    const digits = [0,1,2,3,4,5,6,7,8,9];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 3);
  }

  function judge(guess) {
    let strikes = 0;
    let balls = 0;
    guess.forEach((n, i) => {
      if (secret[i] === n) strikes++;
      else if (secret.includes(n)) balls++;
    });
    return { strikes, balls };
  }

  function addPortalCard() {
    if (grid.querySelector('[data-game="number-baseball"]')) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'portalCard';
    card.dataset.game = 'number-baseball';
    card.innerHTML = `<span class="portalIcon">⚾</span><h3>숫자야구</h3><p>서로 다른 숫자 3개를 추리합니다.</p><span class="portalGo"><span>시작하기</span><span>›</span></span>`;
    card.addEventListener('click', enterGame);
    grid.appendChild(card);
  }

  function enterGame() {
    portal.classList.add('portal-hidden');
    layout.classList.remove('portal-hidden');
    layout.classList.add('number-baseball-mode');
    back.classList.add('visible');
    setTop('스트라이크와 볼 단서로 숫자 3개를 맞혀보세요.');
    newGame();
  }

  function newGame() {
    secret = makeSecret();
    tries = [];
    finished = false;
    renderShell();
  }

  function resetBestRecord() {
    if (!best) return;
    if (!window.confirm('숫자야구 최고 기록을 초기화할까요?')) return;
    best = null;
    try { localStorage.removeItem(BEST_KEY); } catch (_) {}
    updateStats();
  }

  function renderShell() {
    content.className = 'numberBaseballContent';
    content.innerHTML = `
      <div class="nbRule"><strong>규칙</strong><span>자리까지 맞으면 스트라이크, 숫자만 맞으면 볼입니다.</span></div>
      <div class="nbTopbar">
        <div class="nbStats"><span class="nbStat" id="nbTryStat">시도 0회</span><span class="nbStat" id="nbBestStat">최고 ${best ?? '-'}회</span></div>
        <div class="nbTopActions"><button type="button" class="nbResetRecord" id="nbResetRecord">기록 초기화</button><button type="button" class="nbNew" id="nbNew">새 게임</button></div>
      </div>
      <div class="nbLayout">
        <section class="nbPlay">
          <div class="nbGuessRow">
            <input id="nbInput" class="nbInput" type="text" readonly maxlength="3" placeholder="숫자 3자리" aria-label="선택한 숫자 3자리" tabindex="-1">
            <button type="button" class="nbSubmit" id="nbSubmit">확인</button>
          </div>
          <div class="nbKeypad" aria-label="숫자 키패드">
            ${[1,2,3,4,5,6,7,8,9,0].map((n) => `<button type="button" class="nbKey" data-number="${n}">${n}</button>`).join('')}
            <button type="button" class="nbKey nbKeyWide" id="nbBackspace">지우기</button>
            <button type="button" class="nbKey nbKeyWide" id="nbClear">전체 지우기</button>
          </div>
          <div class="nbResult hidden" id="nbResult" aria-live="polite"></div>
        </section>
        <aside class="nbSide">
          <button type="button" class="nbToggle ${historyVisible ? 'on' : ''}" id="nbHistoryToggle" aria-pressed="${historyVisible}">
            <span><b>기록 보기</b><small>이전 시도의 스트라이크·볼을 보여줘요</small></span><i></i>
          </button>
          <div class="nbLegend"><span><b>S</b> 자리와 숫자 모두 일치</span><span><b>B</b> 숫자만 일치</span><span><b>OUT</b> 같은 숫자 없음</span></div>
        </aside>
      </div>
      <section class="nbHistory ${historyVisible ? '' : 'hidden'}" id="nbHistory"><div class="nbHistoryHead"><strong>시도 기록</strong><span id="nbHistoryCount">0회</span></div><ol id="nbHistoryList"></ol></section>`;

    document.getElementById('nbNew')?.addEventListener('click', newGame);
    document.getElementById('nbResetRecord')?.addEventListener('click', resetBestRecord);
    document.getElementById('nbSubmit')?.addEventListener('click', submitGuess);
    document.getElementById('nbBackspace')?.addEventListener('click', () => editInput((v) => v.slice(0, -1)));
    document.getElementById('nbClear')?.addEventListener('click', () => editInput(() => ''));
    document.getElementById('nbHistoryToggle')?.addEventListener('click', () => {
      historyVisible = !historyVisible;
      renderHistoryVisibility();
    });
    document.querySelectorAll('.nbKey[data-number]').forEach((button) => button.addEventListener('click', () => appendDigit(button.dataset.number)));

    syncKeypad();
    updateStats();
  }

  function renderHistoryVisibility() {
    const toggle = document.getElementById('nbHistoryToggle');
    const history = document.getElementById('nbHistory');
    toggle?.classList.toggle('on', historyVisible);
    toggle?.setAttribute('aria-pressed', String(historyVisible));
    history?.classList.toggle('hidden', !historyVisible);
  }

  function editInput(fn) {
    const input = document.getElementById('nbInput');
    if (!input || finished) return;
    input.value = fn(input.value);
    syncKeypad();
  }

  function appendDigit(digit) {
    const input = document.getElementById('nbInput');
    if (!input || finished || input.value.length >= 3 || input.value.includes(digit)) return;
    input.value += digit;
    syncKeypad();
  }

  function syncKeypad() {
    const input = document.getElementById('nbInput');
    if (!input) return;
    const used = new Set(input.value.split(''));
    document.querySelectorAll('.nbKey[data-number]').forEach((button) => {
      button.disabled = finished || used.has(button.dataset.number);
      button.classList.toggle('used', used.has(button.dataset.number));
    });
    const submit = document.getElementById('nbSubmit');
    if (submit) submit.disabled = finished || input.value.length !== 3;
  }

  function submitGuess() {
    const input = document.getElementById('nbInput');
    if (!input || finished || input.value.length !== 3) return;

    const guessText = input.value;
    const guess = guessText.split('').map(Number);
    const result = judge(guess);
    tries.push({ guess: guessText, ...result });
    input.value = '';
    appendHistory(tries[tries.length - 1]);
    updateStats();

    if (result.strikes === 3) {
      finished = true;
      if (!best || tries.length < best) {
        best = tries.length;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) {}
      }
      setResult(`정답! ${guessText} · ${tries.length}번 만에 맞혔어요 🎉`, 'ok');
      updateStats();
      syncKeypad();
      celebrate();
      document.getElementById('nbBackspace')?.setAttribute('disabled', '');
      document.getElementById('nbClear')?.setAttribute('disabled', '');
      return;
    }

    if (result.strikes === 0 && result.balls === 0) setResult(`${guessText} · OUT`, 'out');
    else setResult(`${guessText} · ${result.strikes}S ${result.balls}B`, '');
    syncKeypad();
  }

  function appendHistory(item) {
    const list = document.getElementById('nbHistoryList');
    if (!list) return;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.guess}</strong><span>${item.strikes ? `<em class="strike">${item.strikes}S</em>` : ''}${item.balls ? `<em class="ball">${item.balls}B</em>` : ''}${!item.strikes && !item.balls ? '<em class="out">OUT</em>' : ''}</span>`;
    list.prepend(li);
    const count = document.getElementById('nbHistoryCount');
    if (count) count.textContent = `${tries.length}회`;
  }

  function setResult(text, tone) {
    const el = document.getElementById('nbResult');
    if (!el) return;
    el.textContent = text;
    el.className = `nbResult${tone ? ` ${tone}` : ''}`;
  }

  function updateStats() {
    const tryEl = document.getElementById('nbTryStat');
    const bestEl = document.getElementById('nbBestStat');
    const resetEl = document.getElementById('nbResetRecord');
    if (tryEl) tryEl.textContent = `시도 ${tries.length}회`;
    if (bestEl) bestEl.textContent = `최고 ${best ?? '-'}회`;
    if (resetEl) resetEl.disabled = !best;
  }

  function celebrate() {
    const old = document.querySelector('.nbCelebration');
    old?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'nbCelebration';
    overlay.innerHTML = `<div class="nbCelebrateCard"><div>⚾🎉</div><strong>정답!</strong><span>${tries.length}번 만에 맞혔습니다.</span><button type="button">계속 보기</button></div><div class="nbConfetti"></div>`;
    const confetti = overlay.querySelector('.nbConfetti');
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', `${Math.random() * 100}vw`);
      p.style.setProperty('--dx', `${-70 + Math.random() * 140}px`);
      p.style.setProperty('--delay', `${Math.random() * .5}s`);
      p.style.setProperty('--dur', `${1.7 + Math.random() * 1.1}s`);
      p.style.setProperty('--hue', `${Math.floor(Math.random() * 360)}`);
      confetti.appendChild(p);
    }
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 220); };
    overlay.querySelector('button')?.addEventListener('click', close);
    setTimeout(close, 4200);
  }

  back.addEventListener('click', () => {
    if (!layout.classList.contains('number-baseball-mode')) return;
    layout.classList.remove('number-baseball-mode');
    content.classList.remove('numberBaseballContent');
    document.querySelector('.nbCelebration')?.remove();
  });

  addPortalCard();
})();
