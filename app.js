(() => {
  "use strict";
  const DATA = window.DRIVE_DATA;
  const app = document.querySelector("#app");
  const nav = document.querySelector(".bottom-nav");
  const state = load();
  let route = "home";
  let activeExam = null;
  let examIndex = 0;
  let examAnswers = {};
  let learnCategory = "all";
  let searchText = "";
  let reveal = new Set();

  function load() {
    try {
      return JSON.parse(localStorage.getItem("driveTheoryState")) || { learned: [], mistakes: [], results: [] };
    } catch { return { learned: [], mistakes: [], results: [] }; }
  }
  function save() { localStorage.setItem("driveTheoryState", JSON.stringify(state)); }
  const esc = value => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const cat = key => DATA.categories[key] || [key, "•"];
  const badge = key => `<span class="badge">${cat(key)[1]} ${esc(cat(key)[0])}</span>`;
  const allQuestions = () => Object.values(DATA.exams).flat();
  const questionById = id => allQuestions().find(q => q.id === id);
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const resultPassed = r => r.points <= 10 && !r.doubleFive;

  function go(next) {
    activeExam = null; route = next;
    [...nav.querySelectorAll("button")].forEach(b => b.classList.toggle("active", b.dataset.route === route));
    render(); window.scrollTo({ top: 0, behavior: "instant" });
  }

  nav.addEventListener("click", e => {
    const button = e.target.closest("button[data-route]");
    if (button) go(button.dataset.route);
  });

  function render() {
    if (activeExam) return renderExam();
    ({ home: renderHome, learn: renderLearn, formulas: renderFormulas, exams: renderExams, mistakes: renderMistakes }[route] || renderHome)();
  }

  function renderHome() {
    const passed = new Set(state.results.filter(resultPassed).map(r => r.exam)).size;
    const pct = Math.round(state.learned.length / DATA.cards.length * 100);
    const latest = state.results[0];
    app.innerHTML = `
      <section class="panel hero"><span class="label">THEORY MODE · KLASSE B</span><h2>Финальная подготовка</h2><div class="muted">5 экзаменов · формулы · персональное повторение</div><button class="primary" id="start">▶ НАЧАТЬ ПРОБНЫЙ ЭКЗАМЕН</button></section>
      <section class="stats"><div class="stat"><strong>${pct}%</strong><small>изучено</small></div><div class="stat"><strong>${passed}/5</strong><small>экзаменов</small></div><div class="stat"><strong>${state.mistakes.length}</strong><small>на повтор</small></div></section>
      <section class="panel" style="margin-top:14px"><span class="label danger">⚠ ТВОЯ ГЛАВНАЯ ЛОВУШКА</span><h3>Первый верный ответ — ещё не конец.</h3><p class="muted">Перед «Далее» спроси: «Здесь может быть ещё один правильный вариант?»</p></section>
      <section class="panel install"><span class="label">УСТАНОВКА НА IPHONE</span><h3>Работает как приложение</h3><p class="muted">Safari → кнопка «Поделиться» → «На экран Домой». После первого открытия доступно офлайн.</p></section>
      <section class="panel"><span class="label">8 СТРОК ПЕРЕД ЭКЗАМЕНОМ</span><ol class="eight"><li>Помеха справа → пропускаю справа.</li><li>Налево → пропускаю встречных прямо/направо.</li><li>Не вижу дорогу → не обгоняю.</li><li>Скрыт за грузовиком ≠ исчез.</li><li>Груз: 0,5 вперёд / 1,5 назад / 3 до 100 км.</li><li>Реакция ×3 / торможение квадрат / экстренное ÷2.</li><li>Права + Teil I; Teil II дома.</li><li>Перед «Далее»: проверить все варианты.</li></ol></section>
      ${latest ? `<section class="panel"><span class="label">ПОСЛЕДНИЙ РЕЗУЛЬТАТ</span><h3 class="${resultPassed(latest)?"green":"danger"}">${resultPassed(latest)?"СДАН":"НЕ СДАН"} · ${latest.correct}/30</h3><div class="muted">Партия ${latest.exam} · ${latest.points} штрафных баллов</div></section>` : ""}`;
    document.querySelector("#start").onclick = () => startExam(1);
  }

  function renderLearn() {
    const filtered = DATA.cards.filter(c => (learnCategory === "all" || c.category === learnCategory) && (!searchText || `${c.title} ${c.fact}`.toLowerCase().includes(searchText.toLowerCase())));
    app.innerHTML = `<input class="search" id="search" type="search" placeholder="Знак, расстояние, правило…" value="${esc(searchText)}"><div class="chips"><button class="chip ${learnCategory==="all"?"active":""}" data-cat="all">Все</button>${Object.entries(DATA.categories).map(([key,value])=>`<button class="chip ${learnCategory===key?"active":""}" data-cat="${key}">${value[1]} ${esc(value[0])}</button>`).join("")}</div><div id="cards">${filtered.map(cardHTML).join("")}</div>`;
    app.querySelector("#search").oninput = e => { searchText = e.target.value; renderLearn(); app.querySelector("#search").focus(); };
    app.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { learnCategory = b.dataset.cat; renderLearn(); });
    app.querySelectorAll("[data-learn]").forEach(b => b.onclick = () => {
      const id = b.dataset.learn; state.learned = state.learned.includes(id) ? state.learned.filter(x=>x!==id) : [...state.learned,id]; save(); renderLearn();
    });
  }
  function cardHTML(c) { const done = state.learned.includes(c.id); return `<section class="panel study"><div class="card-head">${badge(c.category)}<button class="done" data-learn="${c.id}">${done?"●":"○"}</button></div><h3>${esc(c.title)}</h3><div>${esc(c.fact)}</div><div class="memory">🧠 ${esc(c.memory)}</div></section>`; }

  function renderFormulas() {
    app.innerHTML = `<section class="panel"><div class="question-top"><span class="label">СКОРОСТЬ</span><div class="speed"><strong id="speedText">80</strong> <span class="muted">км/ч</span></div></div><input class="slider" id="speed" type="range" min="10" max="130" step="10" value="80"><div class="results"><div><small class="muted">РЕАКЦИЯ</small><strong id="reaction"></strong></div><div><small class="muted">ТОРМОЗ</small><strong id="braking"></strong></div><div><small class="muted">СТОП</small><strong id="stopping"></strong></div></div></section><div id="formulaRows"></div><section class="panel"><span class="label">ЧИСЛА, КОТОРЫЕ НЕЛЬЗЯ ПУТАТЬ</span><div class="numbers" style="margin-top:14px"><strong>5 м</strong><span>перекрёсток</span><strong>8 м</strong><span>вело справа перед перекрёстком</span><strong>10 м</strong><span>не закрыть знак/светофор</span><strong>15 м</strong><span>остановка автобуса</span><strong>1,5 / 2 м</strong><span>велосипед: город / вне</span><strong>50 / 50</strong><span>видимость / скорость</span><strong>2,5 / 0,5 м</strong><span>груз: высота / вперёд</span><strong>1,5 / 3 м</strong><span>груз сзади / до 100 км</span><strong>2,55 / 4 м</strong><span>ширина / высота</span><strong>3 500 кг</strong><span>Klasse B — категория B</span></div></section>`;
    const input = app.querySelector("#speed"); input.oninput = updateFormula; updateFormula();
  }
  function updateFormula() {
    const v = Number(app.querySelector("#speed").value), reaction=v/10*3, braking=(v/10)**2, emergency=braking/2;
    app.querySelector("#speedText").textContent=v; app.querySelector("#reaction").textContent=`${reaction.toFixed(1)} м`; app.querySelector("#braking").textContent=`${braking.toFixed(1)} м`; app.querySelector("#stopping").textContent=`${(reaction+braking).toFixed(1)} м`;
    app.querySelector("#formulaRows").innerHTML=[["×3","Путь реакции","(V ÷ 10) × 3",reaction],["x²","Обычный тормозной путь","(V ÷ 10)²",braking],["÷2","Экстренное торможение","обычный ÷ 2",emergency],["+","Остановочный путь","реакция + торможение",reaction+braking]].map(x=>`<section class="panel formula"><div class="formula-tag">${x[0]}</div><div><strong>${x[1]}</strong><div class="muted">${x[2]}</div></div><div class="formula-value">${x[3].toFixed(1)} м</div></section>`).join("");
  }

  function renderExams() {
    app.innerHTML = `<section class="panel"><span class="label">РЕЖИМ КАК НА ЭКЗАМЕНЕ</span><h2>5 × 30 вопросов</h2><p class="muted">Сдано при ≤10 штрафных баллах, кроме двух ошибок по 5 баллов.</p></section>${[1,2,3,4,5].map(n=>{const results=state.results.filter(r=>r.exam===n);const best=results.sort((a,b)=>a.points-b.points)[0];return `<section class="panel exam-row" data-exam="${n}"><div class="exam-no">${n}</div><div><h3>ПАРТИЯ ${n}</h3><div class="muted">${["","Ядро + твои ошибки","Знаки · документы · техника","Скрытые опасности · массы","Расстояния · Autobahn","Финальная проверка"][n]}</div></div>${best?`<div class="arrow ${resultPassed(best)?"green":"danger"}">${resultPassed(best)?"✓":"✕"}<br><small>${best.points} б.</small></div>`:`<div class="arrow">›</div>`}</section>`}).join("")}`;
    app.querySelectorAll("[data-exam]").forEach(row=>row.onclick=()=>startExam(Number(row.dataset.exam)));
  }

  function startExam(number) { activeExam=number; examIndex=0; examAnswers={}; nav.classList.add("hidden"); renderExam(); window.scrollTo(0,0); }
  function renderExam() {
    const questions=DATA.exams[activeExam], q=questions[examIndex], current=examAnswers[q.id]||[];
    app.innerHTML=`<section class="panel question"><div class="question-top"><span class="label">${esc(q.section)}</span><strong class="muted">${q.points} балл.</strong></div><div class="progress"><i style="width:${(examIndex+1)/30*100}%"></i></div><div class="question-top"><strong>ВОПРОС ${examIndex+1}/30</strong><span class="muted">Отвечено ${Object.values(examAnswers).filter(a=>a.length).length}</span></div><div style="margin-top:18px">${badge(q.category)}</div><h2>${esc(q.prompt)}</h2><small class="muted">Может быть несколько правильных ответов.</small><div style="margin-top:14px">${q.answers.map((a,i)=>`<button class="option ${current.includes(i)?"selected":""}" data-answer="${i}"><span class="box">${current.includes(i)?"✓":""}</span><span>${esc(a)}</span></button>`).join("")}</div></section><div class="controls"><button class="secondary" id="back">‹</button><button class="primary" id="next">${examIndex<29?"ДАЛЕЕ":"ЗАВЕРШИТЬ"}</button><button class="secondary" id="exit">✕</button></div>`;
    app.querySelectorAll("[data-answer]").forEach(button=>button.onclick=()=>{const i=Number(button.dataset.answer);const set=new Set(examAnswers[q.id]||[]);set.has(i)?set.delete(i):set.add(i);examAnswers[q.id]=[...set];renderExam();});
    app.querySelector("#back").onclick=()=>{if(examIndex>0){examIndex--;renderExam();window.scrollTo(0,0)}};
    app.querySelector("#back").disabled=examIndex===0;
    app.querySelector("#next").onclick=()=>{if(examIndex<29){examIndex++;renderExam();window.scrollTo(0,0)}else finishExam()};
    app.querySelector("#exit").onclick=()=>{if(confirm("Выйти? Текущие ответы не сохранятся.")){nav.classList.remove("hidden");go("exams")}};
  }
  function finishExam() {
    const questions=DATA.exams[activeExam];let points=0,correct=0,fives=0;const wrong=[];
    for(const q of questions){const chosen=examAnswers[q.id]||[];if(same(chosen,q.correct))correct++;else{points+=q.points;wrong.push(q.id);if(q.points===5)fives++;}}
    const result={id:crypto.randomUUID(),exam:activeExam,date:new Date().toISOString(),points,correct,wrong,doubleFive:fives>=2};state.results.unshift(result);
    const wrongSet=new Set(wrong);state.mistakes=[...new Set([...state.mistakes.filter(id=>!questions.some(q=>q.id===id&&!wrongSet.has(id))),...wrong])];save();renderResult(result);
  }
  function renderResult(result) {
    const passed=resultPassed(result);const wrong=result.wrong.map(questionById).filter(Boolean);
    app.innerHTML=`<section class="panel result-hero"><div class="result-icon ${passed?"green":"danger"}">${passed?"✓":"✕"}</div><h1>${passed?"ЭКЗАМЕН СДАН":"НЕ СДАН"}</h1><div class="muted">${result.correct}/30 · ${result.points} штрафных баллов</div>${result.doubleFive?`<p class="danger"><strong>Две ошибки по 5 баллов — провал.</strong></p>`:""}</section>${wrong.map(q=>`<section class="panel wrong"><div class="question-top"><span class="label danger">ВОПРОС ${q.number}</span><strong class="danger">−${q.points}</strong></div><h3>${esc(q.prompt)}</h3><div class="correct">✅ ${q.correct.map(i=>esc(q.answers[i])).join(" · ")}</div><p class="muted">${esc(q.explanation)}</p><div class="memory">🧠 ${esc(q.memory)}</div></section>`).join("")}<button class="primary" id="done">ГОТОВО</button>`;
    app.querySelector("#done").onclick=()=>{activeExam=null;nav.classList.remove("hidden");go("exams")};
  }

  function renderMistakes() {
    const mistakes=state.mistakes.map(questionById).filter(Boolean);
    app.innerHTML=`<section class="panel"><span class="label">ИЗ ТВОИХ ПОСЛЕДНИХ ТЕСТОВ</span><h2>Главный паттерн</h2><p class="muted">Ты часто знаешь правило, но пропускаешь второй правильный вариант: HU — техосмотр, документы, медленная машина, STOP и скрытые участники.</p><div class="memory">✓ Перед «Далее» проверить все 3 ответа</div></section>${mistakes.length?mistakes.map(q=>`<section class="panel"><div class="card-head">${badge(q.category)}<small class="muted">Партия ${q.exam} · №${q.number}</small></div><h3>${esc(q.prompt)}</h3><button class="reveal" data-reveal="${q.id}">${reveal.has(q.id)?"Скрыть":"Показать ответ"}</button>${reveal.has(q.id)?`<p class="green"><strong>✅ ${q.correct.map(i=>esc(q.answers[i])).join(" · ")}</strong></p><p class="muted">${esc(q.explanation)}</p><div class="memory">🧠 ${esc(q.memory)}</div>`:""}</section>`).join(""):`<section class="panel" style="text-align:center;padding:45px 20px"><div class="result-icon green">✓</div><h2>Ошибок пока нет</h2><p class="muted">Пройди экзамен — неверные ответы появятся здесь.</p></section>`}${(state.results.length||state.learned.length)?`<button class="secondary" id="reset" style="width:100%;color:var(--red)">Сбросить весь прогресс</button>`:""}`;
    app.querySelectorAll("[data-reveal]").forEach(b=>b.onclick=()=>{reveal.has(b.dataset.reveal)?reveal.delete(b.dataset.reveal):reveal.add(b.dataset.reveal);renderMistakes();});
    const reset=app.querySelector("#reset");if(reset)reset.onclick=()=>{if(confirm("Удалить результаты и изученные карточки?")){state.learned=[];state.mistakes=[];state.results=[];save();renderMistakes();}};
  }

  if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
  render();
})();
