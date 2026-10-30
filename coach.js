/* DriveTheory B • Smart Coach. All personal progress and images stay on this device. */
(() => {
  "use strict";
  const KEY = "driveTheoryCoachV1";
  const DB_NAME = "driveTheoryCoachImages";
  const START = new Date(2026, 9, 30);
  const school = [
    "Обучение по опасностям",
    "Защита окружающей среды",
    "Дорожные знаки",
    "Обучение по опасностям",
    "Защита окружающей среды",
    "Профессиональная пригодность и квалификация водителей",
    "Право преимущественного проезда, приоритет",
    "Обучение по опасностям",
    "Защита окружающей среды",
    "Дорожные знаки",
    "Поведение при дорожном движении",
    "Предписания по эксплуатации транспортных средств",
    "Техника",
    "Защита окружающей среды",
    "Обучение по опасностям",
    "Дорожные знаки",
    "Профессиональная пригодность и квалификация водителей",
    "Право преимущественного проезда, приоритет",
    "Поведение при дорожном движении",
    "Защита окружающей среды"
  ];
  const paid = [
    "Video questions — видеовопросы",
    "Traffic sign — дорожные знаки",
    "Video questions — видеовопросы",
    "Right of way, priority — преимущество проезда",
    "New Questions — новые вопросы",
    "Traffic sign — дорожные знаки",
    "Video questions — видеовопросы",
    "Traffic sign — дорожные знаки",
    "Number questions — числовые вопросы",
    "Video questions — видеовопросы",
    "Right of way, priority — преимущество проезда",
    "Trailers — прицепы",
    "Assistance systems — системы помощи водителю",
    "New Questions — новые вопросы",
    "Video questions — видеовопросы",
    "Traffic sign — дорожные знаки",
    "Rules of thumb — практические формулы",
    "Right of way, priority — преимущество проезда",
    "Trailers — прицепы",
    "Number questions — числовые вопросы",
    "Video questions — видеовопросы",
    "Traffic sign — дорожные знаки",
    "Video questions — видеовопросы",
    "Right of way, priority — преимущество проезда",
    "New Questions — новые вопросы",
    "Trailers — прицепы",
    "Video questions — видеовопросы",
    "Number questions — числовые вопросы",
    "Traffic sign — дорожные знаки",
    "Video questions — видеовопросы"
  ];
  const topics = {
    danger: "Опасные ситуации",
    environment: "Экология",
    signs: "Дорожные знаки",
    priority: "Приоритет проезда",
    behavior: "Поведение на дороге",
    numbers: "Формулы и числа",
    technology: "Техника и помощники",
    documents: "Документы и водитель",
    other: "Другое / уточнить"
  };
  const seeds = [
    {
      id:"example-oversteer", code:"2.7.01-115", topic:"danger", points:3,
      question:"К чему склонен легковой автомобиль с приводом задних колёс, если в повороте дают слишком много газа?",
      wrong:"К недоуправлению", correct:"К заносу сзади (избыточной поворачиваемости).",
      explanation:"Избыток тяги на задних колёсах снижает боковое сцепление: задняя часть может уйти в занос.",
      source:"Ошибка со скриншота 30.10.2026"
    },
    {
      id:"example-cng", code:"2.4.42-104", topic:"signs", points:2,
      question:"На что указывает синий знак с изображением топливной колонки и буквами CNG?",
      wrong:"На заправочную станцию сжиженного газа (LPG)",
      correct:"На газовую заправочную станцию со сжатым природным газом (CNG).",
      explanation:"CNG = Compressed Natural Gas, сжатый природный газ; LPG = сжиженный нефтяной газ.",
      source:"Ошибка со скриншота 30.10.2026"
    }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clean = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const todayISO = () => localISO(new Date());
  const localISO = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const addDays = (iso,days) => {
    const p=iso.split("-").map(Number);
    return localISO(new Date(p[0],p[1]-1,p[2]+days));
  };
  const planDate = i => localISO(new Date(2026,9,30+i));
  const dayIndex = () => Math.max(0,Math.min(29,Math.round((new Date(todayISO()+"T12:00:00")-new Date(2026,9,30,12))/86400000)));
  let selectedDay = dayIndex();
  let reviewId = null;
  let revealed = false;
  let quiz = [];
  let quizAt = 0;
  let quizChoices = [];
  let quizChecked = false;
  let toast = "";
  let coachRoot = null;
  let imageUrls = [];
  let store;
  try { store=JSON.parse(localStorage.getItem(KEY)||"null"); } catch { store=null; }
  if(!store || typeof store!=="object")store={};
  if(!store.records || typeof store.records!=="object")store.records={};
  if(!Array.isArray(store.mistakes))store.mistakes=[];
  if(!Array.isArray(store.quizHistory))store.quizHistory=[];
  if(!store.seeded){
    for(const entry of seeds){
      if(!store.mistakes.some(m=>m.id===entry.id)){
        store.mistakes.push({...clone(entry),created:"2026-10-30",due:"2026-11-02",stage:0,attempts:0,correctReviews:0,wrongReviews:0});
      }
    }
    store.seeded=true;
    persist();
  }
  function persist(){
    try {localStorage.setItem(KEY,JSON.stringify(store));return true;}
    catch(e){ alert("Не удалось сохранить данные. Освободи место в Safari и сделай резервную копию.");return false;}
  }
  function countDone(){
    return Object.values(store.records).filter(r=>r.school?.done&&r.paid?.done).length;
  }
  function dueMistakes(){
    return store.mistakes.filter(m=>(m.due||todayISO())<=todayISO());
  }
  function topTopics(){
    const counts={};
    for(const m of store.mistakes)counts[m.topic]=(counts[m.topic]||0)+1+(m.wrongReviews||0);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  }
  function dateLabel(iso){
    return new Date(iso+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
  }
  function topicSelect(selected){
    return Object.entries(topics).map(([id,name])=>'<option value="'+clean(id)+'" '+(selected===id?"selected":"")+'>'+clean(name)+'</option>').join("");
  }
  function planPanel(){
    const i=dayIndex(),date=planDate(i),r=store.records[date]||{};
    const isAfter=todayISO()>planDate(29);
    return '<section class="panel coach-today"><div class="coach-row"><span class="label">📅 СЕГОДНЯ · ДЕНЬ '+(i+1)+'/30</span><strong class="coach-accent">'+countDone()+'/30 дней</strong></div>'+
      '<h2>'+(isAfter?"План завершён — продолжай повторение":clean(dateLabel(date)))+'</h2>'+
      '<div class="coach-task"><span>🔵 ШКОЛЬНАЯ · 30 ВОПРОСОВ</span><strong>'+clean(i<20?school[i]:"Пробный экзамен — смешанные вопросы")+'</strong><small>'+(r.school?.done?"✅ Выполнено":"Ещё не отмечено")+'</small></div>'+
      '<div class="coach-task"><span>⚫ ПЛАТНАЯ · 30 ВОПРОСОВ</span><strong>'+clean(paid[i])+'</strong><small>'+(r.paid?.done?"✅ Выполнено":"Ещё не отмечено")+'</small></div>'+
      '<button class="primary" id="coach-open-plan">ОТКРЫТЬ МОЙ ПЛАН</button>'+
      '<button class="secondary coach-full" id="coach-open-mistakes">🧠 Повторить ошибки ('+dueMistakes().length+')</button></section>';
  }
  function wireHome(go){
    const plan=document.getElementById("coach-open-plan");
    if(plan)plan.addEventListener("click",()=>go("plan"));
    const mistakes=document.getElementById("coach-open-mistakes");
    if(mistakes)mistakes.addEventListener("click",()=>go("mistakes"));
  }
  function renderPlan(app){
    const day=selectedDay,date=planDate(day),record=store.records[date]||{};
    const isExam=day>=20;
    const titles=[isExam?"Пробный экзамен из всех тем":school[day],paid[day]];
    const paidUnique=paid[day].startsWith("Assistance systems")?14:paid[day].startsWith("Rules of thumb")?15:30;
    const schoolDone=record.school||{},paidDone=record.paid||{};
    const stats=topTopics().slice(0,3).map(([key,n])=>'<span class="coach-pill">'+clean(topics[key])+' · '+n+'</span>').join("");
    app.innerHTML='<section class="panel coach-heading"><span class="label">ПЕРСОНАЛЬНАЯ ПОДГОТОВКА</span><h2>30 дней · 60 вопросов</h2><p class="muted">Одна тема = полный тест из 30 вопросов. С 19 ноября — пробные экзамены.</p><div class="coach-progress"><i style="width:'+(countDone()/30*100)+'%"></i></div><small class="muted">'+countDone()+' из 30 дней выполнено</small></section>'+
      '<section class="panel"><div class="coach-row"><button class="secondary" id="coach-prev" '+(day===0?"disabled":"")+'>‹ Назад</button><div class="coach-center"><b>День '+(day+1)+' / 30</b><small>'+clean(dateLabel(date))+'</small></div><button class="secondary" id="coach-next" '+(day===29?"disabled":"")+'>Вперёд ›</button></div><input class="slider" type="range" min="0" max="29" value="'+day+'" id="coach-day-range" aria-label="Выбрать день"></section>'+
      ['school','paid'].map((kind,index)=>{
        const r=kind==="school"?schoolDone:paidDone;
        return '<section class="panel coach-record"><span class="label">'+(kind==="school"?"🔵 ШКОЛЬНАЯ ПРОГРАММА":"⚫ ПЛАТНАЯ ПРОГРАММА")+'</span>'+
        '<h3>'+clean(titles[index])+'</h3><p class="muted">'+(kind==='paid'&&paidUnique<30?('Здесь только '+paidUnique+' разных вопросов — повтори сложные, чтобы получить 30 ответов.'):'Один тест — 30 вопросов')+'</p>'+
        '<label class="coach-check"><input type="checkbox" id="coach-'+kind+'-done" '+(r.done?"checked":"")+'> Выполнил тест</label>'+
        '<div class="coach-inputs"><label>Верных из 30<input type="number" id="coach-'+kind+'-correct" min="0" max="30" inputmode="numeric" placeholder="например, 27" value="'+clean(r.correct??"")+'"></label>'+
        '<label>Штрафные баллы<input type="number" id="coach-'+kind+'-points" min="0" max="150" inputmode="numeric" placeholder="например, 11" value="'+clean(r.points??"")+'"></label></div></section>';
      }).join("")+
      '<button class="primary" id="coach-save-day">СОХРАНИТЬ РЕЗУЛЬТАТЫ</button>'+
      '<section class="panel"><span class="label">СЛАБЫЕ МЕСТА И ПОВТОРЕНИЕ</span><div class="coach-pills">'+(stats||'<span class="muted">Добавляй ошибки, чтобы увидеть статистику.</span>')+'</div>'+
      '<p class="muted">Через 3–4 дня после ошибки, затем через неделю, приложение снова предложит её повторить.</p>'+
      '<button class="secondary coach-full" id="coach-plan-mistakes">Перейти к ошибкам · '+dueMistakes().length+' на повторение</button></section>'+
      '<section class="panel"><div class="coach-row"><span class="label">РЕЗЕРВНАЯ КОПИЯ</span><span class="muted">Этот iPhone</span></div><p class="muted">Сохраняется локально. Для нового телефона или после очистки Safari экспортируй резервную копию.</p>'+
      '<button class="secondary coach-full" id="coach-export">Скачать копию с фотографиями</button><label class="coach-uploadline">Восстановить из файла<input type="file" id="coach-import" accept="application/json,.json"></label></section>';
    app.querySelector("#coach-prev").onclick=()=>{selectedDay=Math.max(0,selectedDay-1);renderPlan(app)};
    app.querySelector("#coach-next").onclick=()=>{selectedDay=Math.min(29,selectedDay+1);renderPlan(app)};
    app.querySelector("#coach-day-range").oninput=e=>{selectedDay=Number(e.target.value);renderPlan(app)};
    app.querySelector("#coach-save-day").onclick=()=>{
      const rec={};
      for(const type of ["school","paid"]){
        const raw=app.querySelector("#coach-"+type+"-correct").value;
        const rawPoints=app.querySelector("#coach-"+type+"-points").value;
        if(raw!==""&&(Number(raw)<0||Number(raw)>30)){alert("Правильные ответы: от 0 до 30.");return;}
        if(rawPoints!==""&&(Number(rawPoints)<0||Number(rawPoints)>150)){alert("Проверь штрафные баллы.");return;}
        rec[type]={done:app.querySelector("#coach-"+type+"-done").checked,correct:raw===""?null:Number(raw),points:rawPoints===""?null:Number(rawPoints)};
      }
      store.records[date]=rec;persist();renderPlan(app);
    };
    app.querySelector("#coach-plan-mistakes").onclick=()=>document.querySelector('[data-route="mistakes"]').click();
    app.querySelector("#coach-export").onclick=()=>exportBackup();
    app.querySelector("#coach-import").onchange=e=>restoreBackup(e.target.files[0],app);
  }

  /* Screenshots are kept in IndexedDB: do not put personal images in a public GitHub repository. */
  function db(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window))return reject(new Error("IndexedDB unavailable"));
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>request.result.createObjectStore("photos");
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function imagePut(id,file){
    const database=await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction("photos","readwrite");
      tx.objectStore("photos").put(file,id);
      tx.oncomplete=()=>{database.close();resolve();};
      tx.onerror=()=>{database.close();reject(tx.error);};
    });
  }
  async function imageGet(id){
    const database=await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction("photos","readonly");
      const req=tx.objectStore("photos").get(id);
      req.onsuccess=()=>{database.close();resolve(req.result||null);};
      req.onerror=()=>{database.close();reject(req.error);};
    });
  }
  async function imageDelete(id){
    const database=await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction("photos","readwrite");
      tx.objectStore("photos").delete(id);
      tx.oncomplete=()=>{database.close();resolve();};
      tx.onerror=()=>{database.close();reject(tx.error);};
    });
  }
  function imageClear(){
    imageUrls.forEach(url=>URL.revokeObjectURL(url));imageUrls=[];
  }
  async function hydrate(container){
    imageClear();
    for(const img of container.querySelectorAll("img[data-shot]")){
      try {
        const file=await imageGet(img.dataset.shot);
        if(!file || !img.isConnected)continue;
        const url=URL.createObjectURL(file); imageUrls.push(url);img.src=url;
      } catch {}
    }
  }
  function guessTopic(text){
    const x=String(text).toLowerCase();
    if(/cng|lpg|zeichen|знак|дорожн.*знак|указыва(ет|ют).*знак/.test(x))return "signs";
    if(/занос|недоуправ|поворот|опасн|скольз|акваплан|brems|gefah/.test(x))return "danger";
    if(/umwelt|эколог|выхлоп|загрязн|co2|топлив/.test(x))return "environment";
    if(/приоритет|уступ|vorfahrt|преимущ/.test(x))return "priority";
    if(/скорост|метр|расстояни|тормозн.*путь/.test(x))return "numbers";
    if(/двигател|abs|esp|датчик|техник/.test(x))return "technology";
    if(/документ|права|водител/.test(x))return "documents";
    return "other";
  }
  function guessQuestion(text){
    const lines=text.replace(/\r/g,"").split("\n").map(x=>x.trim()).filter(Boolean);
    const raw=lines.join(" ").replace(/\s+/g," ");
    const match=raw.match(/([А-ЯЁA-Z][^?]{10,420}\?)/);
    if(match)return match[1].replace(/^.*?(?=К чему|На что|Почему|Как|Что|Когда|Кто|Где|Сколько|Какие|Какое|Каким)/,"").trim();
    return lines.filter(x=>!(/^(Задание|Закрыть|Баллы|Ваш ответ)/i.test(x))).slice(0,3).join(" ").slice(0,270);
  }
  let ocrScript=null;
  function loadOCR(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(!navigator.onLine)return Promise.reject(new Error("Для первого OCR нужен интернет"));
    if(!ocrScript)ocrScript=new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
      script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error("OCR недоступен"));
      script.onerror=()=>reject(new Error("Не удалось загрузить распознавание"));
      document.head.appendChild(script);
    });
    return ocrScript;
  }
  function defaultMistake(id){
    return {id,created:todayISO(),due:addDays(todayISO(),3),stage:0,attempts:0,correctReviews:0,wrongReviews:0,topic:"other",question:"",wrong:"",correct:"",explanation:"",code:"",points:0,source:"Загруженный скриншот"};
  }
  async function uploadScreens(files){
    const list=[...files].filter(x=>x&&x.type.startsWith("image/"));
    if(!list.length){toast="Выбери фотографии или скриншоты.";mountAgain();return;}
    for(const file of list){
      if(file.size>12*1024*1024){toast="Файл больше 12 МБ — пропущен.";continue;}
      const id=crypto.randomUUID();
      const m=defaultMistake(id);m.question="Скриншот "+file.name;
      try {await imagePut(id,file);m.hasImage=true;}
      catch {toast="Не удалось сохранить фото. Проверь настройки Safari.";continue;}
      store.mistakes.unshift(m);persist();mountAgain();
      try {
        toast="Распознаю текст на устройстве…";
        mountAgain();
        const Tesseract=await loadOCR();
        const worker=await Tesseract.createWorker(["rus","eng"]);
        let result;
        try {result=await worker.recognize(file);} finally {await worker.terminate();}
        const raw=result.data.text||"";
        m.raw=raw.slice(0,5000);
        m.question=guessQuestion(raw)||m.question;
        m.topic=guessTopic(raw);
        const code=raw.match(/\b\d\.\d\.\d{2,3}[-–]\d{2,4}\b/);
        if(code)m.code=code[0];
        toast="Скриншот сохранён. Проверь тему и правильный ответ: OCR не видит цвет галочек.";
      } catch(error) {
        toast="Фото сохранено. OCR недоступен — вопрос и ответ можно заполнить вручную.";
      }
      persist();mountAgain();
    }
  }
  function panelHTML(){
    const due=dueMistakes();
    const top=topTopics().slice(0,4);
    return '<section class="panel coach-today"><span class="label">🧠 МОИ ОШИБКИ ПО СКРИНШОТАМ</span>'+
      '<h2>'+store.mistakes.length+' сохранено · '+due.length+' пора повторить</h2>'+
      '<div class="coach-pills">'+top.map(([key,n])=>'<span class="coach-pill">'+clean(topics[key])+' · '+n+'</span>').join("")+'</div>'+
      '<p class="muted">Добавь скриншот из школьной или платной программы. Фото сохранится на этом iPhone; текст попробуем распознать автоматически.</p>'+
      '<label class="coach-uploadline">📷 Добавить скриншоты<input type="file" id="coach-upload" accept="image/*" multiple></label>'+
      '<button class="primary" id="coach-review" '+(!store.mistakes.length?"disabled":"")+'>ПОВТОРИТЬ ОШИБКИ '+(due.length?"("+due.length+" сегодня)":"(все)")+'</button>'+
      '<button class="secondary coach-full" id="coach-extra">Ещё 5 вопросов по слабым темам</button>'+
      '<p class="coach-footnote">Фото не отправляются на GitHub и не публикуются. OCR выполняется на устройстве; при первой загрузке нужны интернет и языковые файлы. Проверяй правильные ответы вручную.</p>'+
      (toast?'<div class="coach-notice" role="status">'+clean(toast)+'</div>':"")+'</section>'+
      '<div class="coach-list">'+store.mistakes.slice().sort((a,b)=>(a.due||"").localeCompare(b.due||"")).map(m=>mistakeHTML(m)).join("")+'</div>';
  }
  function mistakeHTML(m){
    const due=(m.due||todayISO())<=todayISO();
    return '<section class="panel coach-mistake" data-mistake="'+clean(m.id)+'"><div class="coach-row"><span class="label">'+clean(topics[m.topic]||topics.other)+'</span><span class="'+(due?"coach-accent":"muted")+'">'+(due?"🔁 На повтор":"📅 "+clean(dateLabel(m.due||todayISO())))+'</span></div>'+
      '<h3>'+clean(m.question||"Скриншот ошибки")+'</h3>'+
      '<small class="muted">'+clean(m.code||"Без номера вопроса")+' · '+(m.points||"?")+' балл. · попыток повторения '+(m.attempts||0)+'</small>'+
      '<details class="coach-details"><summary>Посмотреть / исправить карточку</summary>'+
      (m.hasImage?'<img class="coach-screenshot" data-shot="'+clean(m.id)+'" alt="Скриншот ошибки">':"")+
      '<form class="coach-edit" data-id="'+clean(m.id)+'"><label>Тема<select name="topic">'+topicSelect(m.topic)+'</select></label>'+
      '<label>Вопрос<textarea name="question" rows="3">'+clean(m.question||"")+'</textarea></label>'+
      '<label>Мой неправильный ответ<textarea name="wrong" rows="2">'+clean(m.wrong||"")+'</textarea></label>'+
      '<label>Правильный ответ (проверь зелёную галочку)<textarea name="correct" rows="2">'+clean(m.correct||"")+'</textarea></label>'+
      '<label>Почему так? (по желанию)<textarea name="explanation" rows="2">'+clean(m.explanation||"")+'</textarea></label>'+
      '<div class="coach-inputs"><label>Номер вопроса<input name="code" value="'+clean(m.code||"")+'"></label><label>Штрафные баллы<input name="points" inputmode="numeric" type="number" min="0" max="5" value="'+clean(m.points||"")+'"></label></div>'+
      '<button class="primary" type="submit">СОХРАНИТЬ КАРТОЧКУ</button><button class="secondary coach-full" type="button" data-delete="'+clean(m.id)+'">Удалить ошибку</button></form></details></section>';
  }
  function mountAgain(){
    if(!coachRoot || !coachRoot.isConnected)return;
    if(reviewId){renderReview();return;}
    if(quiz.length){renderQuiz();return;}
    coachRoot.innerHTML=panelHTML();
    coachRoot.querySelector("#coach-upload").onchange=e=>uploadScreens(e.target.files);
    coachRoot.querySelector("#coach-review").onclick=()=>{
      const items=dueMistakes();reviewId=(items[0]||store.mistakes[0])?.id||null;revealed=false;renderReview();
    };
    coachRoot.querySelector("#coach-extra").onclick=startExtraQuiz;
    coachRoot.querySelectorAll(".coach-edit").forEach(form=>{
      form.onsubmit=e=>{
        e.preventDefault();
        const m=store.mistakes.find(x=>x.id===form.dataset.id);
        if(!m)return;
        const fields=new FormData(form);
        for(const name of ["topic","question","wrong","correct","explanation","code"])m[name]=String(fields.get(name)||"").trim().slice(0,2000);
        m.points=Math.max(0,Math.min(5,Number(fields.get("points"))||0));
        persist();toast="Карточка сохранена.";mountAgain();
      };
    });
    coachRoot.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Удалить эту ошибку и её скриншот?"))return;
      const id=b.dataset.delete;
      store.mistakes=store.mistakes.filter(m=>m.id!==id);persist();
      try {await imageDelete(id)}catch{}
      toast="Ошибка удалена.";mountAgain();
    });
    hydrate(coachRoot);
  }
  function renderReview(){
    const m=store.mistakes.find(x=>x.id===reviewId);
    if(!m){reviewId=null;mountAgain();return;}
    coachRoot.innerHTML='<section class="panel"><span class="label">ПОВТОРЕНИЕ ОШИБКИ · '+clean(topics[m.topic]||topics.other)+'</span>'+
      '<h2>'+clean(m.question||"Вспомни вопрос по скриншоту")+'</h2>'+
      (!revealed?'<p class="muted">Ответь в уме, прежде чем посмотреть правильный ответ.</p><button class="primary" id="coach-reveal">ПОКАЗАТЬ ОТВЕТ</button>':
      '<div class="coach-answer"><strong>✅ Правильный ответ</strong><p>'+clean(m.correct||"Смотри зелёную отметку на скриншоте и при необходимости заполни правильный ответ в карточке.")+'</p>'+
      (m.wrong?'<p class="muted">❌ Раньше: '+clean(m.wrong)+'</p>':"")+
      (m.explanation?'<p>'+clean(m.explanation)+'</p>':"")+'</div>'+
      (m.hasImage?'<img class="coach-screenshot" data-shot="'+clean(m.id)+'" alt="Скриншот правильного ответа">':"")+
      '<div class="coach-action-row"><button class="secondary" id="coach-again">Не знал</button><button class="primary" id="coach-remembered">Знал ответ</button></div>')+
      '<button class="secondary coach-full" id="coach-review-exit">Вернуться к ошибкам</button></section>';
    if(!revealed)coachRoot.querySelector("#coach-reveal").onclick=()=>{revealed=true;renderReview()};
    else{
      coachRoot.querySelector("#coach-again").onclick=()=>finishReview(false);
      coachRoot.querySelector("#coach-remembered").onclick=()=>finishReview(true);
      hydrate(coachRoot);
    }
    coachRoot.querySelector("#coach-review-exit").onclick=()=>{reviewId=null;revealed=false;mountAgain()};
  }
  function finishReview(remembered){
    const m=store.mistakes.find(x=>x.id===reviewId);
    if(!m)return;
    m.attempts=(m.attempts||0)+1;
    if(remembered){m.stage=Math.min(4,(m.stage||0)+1);m.correctReviews=(m.correctReviews||0)+1;}
    else {m.stage=0;m.wrongReviews=(m.wrongReviews||0)+1;}
    const delays=[3,4,7,14,30];
    m.due=addDays(todayISO(),delays[m.stage]);
    m.lastReviewed=todayISO();persist();
    const next=dueMistakes().find(x=>x.id!==m.id);
    reviewId=next?.id||null;revealed=false;
    toast=remembered?"Отлично. Следующий повтор "+dateLabel(m.due):"Повтор назначен на "+dateLabel(m.due);
    mountAgain();
  }
  function startExtraQuiz(){
    const data=window.DRIVE_DATA;
    const questions=Object.values(data.exams).flat();
    const weak=topTopics().map(x=>x[0]);
    const mapping={danger:["safety","autobahn"],environment:["technology","safety"],signs:["signs"],priority:["priority"],behavior:["safety","autobahn"],numbers:["formulas","distances"],technology:["technology"],documents:["documents"],other:[]};
    let selected=[];
    for(const t of weak){
      const cats=mapping[t]||[];
      selected.push(...questions.filter(q=>cats.includes(q.category)));
    }
    selected=[...new Map(selected.map(q=>[q.id,q])).values()];
    if(!selected.length)selected=questions;
    const shift=Math.floor(Date.now()/86400000)%Math.max(1,selected.length);
    quiz=selected.slice(shift).concat(selected.slice(0,shift)).slice(0,5);
    quizAt=0;quizChoices=[];quizChecked=false;renderQuiz();
  }
  function renderQuiz(){
    const q=quiz[quizAt];
    if(!q){quiz=[];mountAgain();return;}
    const correct=JSON.stringify([...quizChoices].sort())===JSON.stringify([...q.correct].sort());
    coachRoot.innerHTML='<section class="panel"><div class="coach-row"><span class="label">🎯 ДОПОЛНИТЕЛЬНЫЕ ВОПРОСЫ</span><strong>'+ (quizAt+1)+'/5</strong></div>'+
      '<h2>'+clean(q.prompt)+'</h2><small class="muted">Может быть несколько правильных вариантов.</small>'+
      q.answers.map((a,i)=>'<button class="option '+(quizChoices.includes(i)?"selected":"")+'" data-quiz-answer="'+i+'" '+(quizChecked?"disabled":"")+'><span class="box">'+(quizChoices.includes(i)?"✓":"")+'</span>'+clean(a)+'</button>').join("")+
      (quizChecked?'<div class="coach-answer"><strong class="'+(correct?"green":"danger")+'">'+(correct?"✅ Верно":"❌ Неверно")+'</strong><p>'+q.correct.map(i=>"✅ "+clean(q.answers[i])).join("<br>")+'</p><p>'+clean(q.explanation||"")+'</p></div>':"")+
      '<button class="primary" id="coach-quiz-action">'+(quizChecked?(quizAt===4?"ЗАКОНЧИТЬ":"СЛЕДУЮЩИЙ ВОПРОС"):"ПРОВЕРИТЬ")+'</button>'+
      '<button class="secondary coach-full" id="coach-quiz-exit">Выйти из тренировки</button></section>';
    coachRoot.querySelectorAll("[data-quiz-answer]").forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.quizAnswer);
      quizChoices=quizChoices.includes(i)?quizChoices.filter(x=>x!==i):[...quizChoices,i];renderQuiz();
    });
    coachRoot.querySelector("#coach-quiz-action").onclick=()=>{
      if(!quizChecked){quizChecked=true;renderQuiz();return;}
      store.quizHistory.push({date:todayISO(),topic:q.category,correct});persist();
      quizAt++;quizChoices=[];quizChecked=false;renderQuiz();
    };
    coachRoot.querySelector("#coach-quiz-exit").onclick=()=>{quiz=[];mountAgain()};
  }
  function mountMistakes(app){
    coachRoot=document.createElement("div");
    coachRoot.id="coach-root";
    app.prepend(coachRoot);
    toast="";
    reviewId=null;revealed=false;quiz=[];
    mountAgain();
  }
  function readAsDataURL(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  async function exportBackup(){
    const images=[];
    for(const m of store.mistakes){
      if(!m.hasImage)continue;
      try {
        const blob=await imageGet(m.id);
        if(blob)images.push({id:m.id,data:await readAsDataURL(blob)});
      }catch{}
    }
    const data=JSON.stringify({format:"DriveTheoryB-coach-backup-v1",exported:todayISO(),state:store,legacyState:localStorage.getItem("driveTheoryState"),images});
    const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="DriveTheoryB-backup-"+todayISO()+".json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  async function restoreBackup(file,app){
    if(!file)return;
    if(!confirm("Заменить текущую статистику данными из резервной копии?"))return;
    try {
      const backup=JSON.parse(await file.text());
      if(backup.format!=="DriveTheoryB-coach-backup-v1"||!backup.state||!Array.isArray(backup.state.mistakes))throw Error("Неверный формат");
      for(const x of backup.images||[]){
        if(!/^data:image\/(png|jpeg|webp);base64,/.test(x.data||""))continue;
        const response=await fetch(x.data);
        await imagePut(x.id,await response.blob());
      }
      store=backup.state;persist();if(typeof backup.legacyState==="string")localStorage.setItem("driveTheoryState",backup.legacyState);alert("Данные восстановлены.");renderPlan(app);
    }catch(e){alert("Не удалось восстановить: "+e.message)}
  }
  window.DRIVE_COACH={
    todayPanel:planPanel,
    wireHome,
    renderPlan,
    mountMistakes,
    getSummary:()=>({completedDays:countDone(),due:dueMistakes().length,mistakes:store.mistakes.length})
  };
})();