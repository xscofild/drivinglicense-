/**
 * DriveTheory B Telegram Coach • Nov–Dec 2026
 * Backend: Google Apps Script + private Google Sheets + private Drive folder.
 * No token or personal data in the public GitHub repo.
 * Sheet: https://docs.google.com/spreadsheets/d/12ymu4hUvVTWbc0akJ9UPyDOansg31K7nc6qqeA6qLWI
 * Manual setup: BOT_TOKEN and CHAT_ID in Script Properties; run setupBackend;
 * deploy as Web app; save WEB_APP_URL in Script Properties; run activateWebhook.
 */
const CFG = Object.freeze({
  SHEET_ID: '12ymu4hUvVTWbc0akJ9UPyDOansg31K7nc6qqeA6qLWI',
  TZ: 'Europe/Berlin',
  BOT_NAME: 'DriveTheory B Coach',
  REVIEW_STEPS: [3, 4, 7, 14, 30],
  TOPICS: {
    danger: 'Опасные ситуации',
    environment: 'Экология',
    signs: 'Дорожные знаки',
    priority: 'Приоритет',
    numbers: 'Формулы и числа',
    technology: 'Техника и системы помощи',
    driver: 'Водитель и документы',
    other: 'Другое'
  }
});

function props_() { return PropertiesService.getScriptProperties(); }
function p_(key) { return props_().getProperty(key); }
function today_() { return Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd'); }
function datePlus_(dateIso, days) {
  const d = new Date(dateIso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}
function sheet_(name) {
  const sh = SpreadsheetApp.openById(CFG.SHEET_ID).getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}
function esc_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
function api_(method, payload) {
  const token = p_('BOT_TOKEN');
  if (!token) throw new Error('BOT_TOKEN is not configured');
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method:'post', contentType:'application/json',
    payload:JSON.stringify(payload || {}), muteHttpExceptions:true
  });
  const response = JSON.parse(res.getContentText());
  if (!response.ok) throw new Error('Telegram ' + method + ': ' + response.description);
  return response.result;
}
function send_(text, buttons) {
  const msg = {chat_id:p_('CHAT_ID'), text:text, parse_mode:'HTML', disable_web_page_preview:true};
  if (buttons && buttons.length) msg.reply_markup = {inline_keyboard:buttons};
  return api_('sendMessage', msg);
}
function btn_(label, data) { return {text:label, callback_data:data}; }
function menu_() {
  return [[btn_('📅 Сегодня','today'), btn_('📊 Прогресс','progress')],
          [btn_('🧠 Повторение','review'), btn_('📸 Ошибки','errors')],
          [btn_('📋 План','plan'), btn_('❓ Помощь','help')]];
}
function currentPlan_() {
  const rows = sheet_('Plan').getDataRange().getValues();
  return rows.slice(1).map((r,i)=>({row:i+2,date:String(r[0]), day:Number(r[1]),phase:String(r[2]),school:String(r[3]), special:String(r[4]),focus:String(r[5]),schoolDone:r[6]===true || String(r[6]).toLowerCase()==='true',specialDone:r[7]===true || String(r[7]).toLowerCase()==='true',schoolCorrect:r[8],specialCorrect:r[9],schoolPoints:r[10],specialPoints:r[11]})).filter(x=>x.date);
}
function planFor_(date) { return currentPlan_().find(d=>d.date===date) || null; }
function todayButtons_(d) {
  return [[btn_('🔵 Результат школы','result|school|'+d.date)],
          [btn_('⚫ Результат Special Topics','result|special|'+d.date)],
          [btn_('📸 Добавить ошибку','add_error'),btn_('🧠 Повторить','review')],
          [btn_('📊 Прогресс','progress')]];
}
function sendToday_() {
  const d=planFor_(today_());
  if (!d) { send_('📅 План занятий на сегодня не предусмотрен.\nЭкзамен: 14–18 декабря 2026.',menu_()); return; }
  send_('🚗 <b>DriveTheory B • День '+d.day+'/21</b>\n📅 '+esc_(d.date)+' • '+esc_(d.phase)+'\n\n'+
    '🔵 <b>Школа — 30 вопросов</b>\n'+esc_(d.school)+(d.schoolDone?' ✅':' ⬜')+'\n\n'+
    '⚫ <b>Special Topics — 30 вопросов</b>\n'+esc_(d.special)+(d.specialDone?' ✅':' ⬜')+'\n\n'+
    '🎯 <b>Фокус:</b> '+esc_(d.focus)+'\n\n'+
    '📸 Присылай скриншоты неправильных ответов прямо сюда.\n'+
    '⚠️ Проверяй каждый вариант ответа.',todayButtons_(d));
}
function sendPlan_() {
  const all=currentPlan_(),today=today_(),idx=all.findIndex(x=>x.date>=today);
  if(idx<0){send_('📅 Подготовка по плану завершена. Экзамен: 14–18 декабря 2026.',menu_());return;}
  send_('📋 <b>Ближайшие занятия</b>\n\n'+all.slice(idx,idx+4).map(d=>
    '<b>'+d.day+'/21 • '+esc_(d.date)+'</b>\n🔵 '+esc_(d.school)+'\n⚫ '+esc_(d.special)).join('\n\n'),menu_());
}
function results_() {const r=sheet_('Results').getDataRange().getValues();return r.slice(1).filter(x=>x[1]);}
function mistakes_() {const r=sheet_('Mistakes').getDataRange().getValues();return r.slice(1).map((v,i)=>({row:i+2,id:String(v[0]),created:String(v[1]),topic:String(v[2]),question:String(v[3]),answer:String(v[4]),photo:String(v[5]),url:String(v[6]),stage:Number(v[7])||0,due:String(v[8]),status:String(v[9]),last:String(v[10]),wrong:Number(v[11])||0})).filter(x=>x.id);}
function due_(){return mistakes_().filter(x=>x.status!=='closed'&&x.due<=today_());}
function sendProgress_() {
  const plan=currentPlan_(),allMistakes=mistakes_(),attempts=results_();
  const both=plan.filter(d=>d.schoolDone&&d.specialDone).length;
  const school=plan.filter(d=>d.schoolDone).length;
  const special=plan.filter(d=>d.specialDone).length;
  const mock=plan.filter(d=>d.day>=15&&d.schoolDone).map(d=>d.schoolPoints).filter(v=>v!==''&&v!==null);
  const topicCount={}; allMistakes.forEach(m=>{const key=CFG.TOPICS[m.topic]||CFG.TOPICS.other;topicCount[key]=(topicCount[key]||0)+1;});
  const topics=Object.entries(topicCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([x,n])=>'• '+esc_(x)+' — '+n).join('\n');
  send_('📊 <b>Мой прогресс</b>\n\n✅ Полных учебных дней: <b>'+both+'/21</b>\n'+
    '🔵 Школа: '+school+'/21\n⚫ Special Topics: '+special+'/21\n'+
    '🧪 Записано попыток: '+attempts.length+'\n📸 Ошибок: '+allMistakes.length+'\n'+
    '🧠 На повтор сегодня: '+due_().length+'\n'+
    (topics?'\n<b>Частые слабые темы:</b>\n'+topics+'\n':'')+
    (mock.length?'\n<b>Последние пробные экзамены (штрафные баллы):</b> '+esc_(mock.slice(-5).join(', ')):'')+
    '\n\nОриентир: пять тренировочных экзаменов подряд с максимум 5 штрафными баллами. Это наш ориентир, не правило DEKRA.',menu_());
}
function setPending_(type,data){props_().setProperty('PENDING_'+p_('CHAT_ID'),JSON.stringify({type:type,data:data}));}
function pending_(){try{return JSON.parse(p_('PENDING_'+p_('CHAT_ID'))||'null');}catch(_){return null;}}
function clearPending_(){props_().deleteProperty('PENDING_'+p_('CHAT_ID'));}
function askResult_(which,date) {
  const d=planFor_(date);
  if(!d){send_('Этого дня нет в плане.',menu_());return;}
  setPending_('result',{which:which,date:date});
  send_((which==='school'?'🔵 Школьное приложение':'⚫ Special Topics')+' • '+esc_(date)+'\n\n'+
    'Напиши <b>правильных из 30</b> и <b>штрафные баллы</b> через пробел.\n'+
    'Например: <code>27 5</code>\n'+
    'Если штрафные баллы не показаны — просто: <code>27</code>\n\n'+
    'Для отмены: /cancel');
}
function saveResult_(which,date,correct,points) {
  const d=planFor_(date);
  if(!d) throw new Error('Invalid plan date');
  if(correct<0||correct>30||!Number.isInteger(correct)) throw new Error('Wrong correct count');
  if(points!==''&&(points<0||points>150||!Number.isInteger(points))) throw new Error('Wrong penalty points');
  const sh=sheet_('Results'),rows=sh.getDataRange().getValues();
  const index=rows.findIndex((r,i)=>i>0&&String(r[1])===date&&String(r[3])===which);
  const record=[new Date(),date,d.day,which,correct,points,'',d.day>=15?'Пробный экзамен':'Тематическая тренировка','Telegram'];
  if(index>=0) sh.getRange(index+1,1,1,record.length).setValues([record]);
  else sh.appendRow(record);
  const col=which==='school'?7:8;
  sheet_('Plan').getRange(d.row,col).setValue(true);
  sheet_('Plan').getRange(d.row,which==='school'?9:10).setValue(correct);
  sheet_('Plan').getRange(d.row,which==='school'?11:12).setValue(points);
  send_('✅ <b>Результат сохранён</b>\n'+(which==='school'?'🔵 Школа':'⚫ Special Topics')+': '+correct+'/30'+
    (points!==''?' • '+points+' штрафных баллов':'')+'\n📅 '+date+
    '\n\nЕсли были ошибки — отправь их скриншоты.');
}
function askPhoto_(){send_('📸 Просто отправь сюда скриншот неправильного ответа из любого из двух приложений.\n\nМожно добавить подпись с пояснением. После загрузки выбери тему.\n🔒 Фото сохранится в закрытой папке твоего Google Drive.');}
function savePhoto_(msg) {
  const photos=msg.photo||[]; const photo=photos[photos.length-1]; if(!photo) return;
  const details=api_('getFile',{file_id:photo.file_id});
  const token=p_('BOT_TOKEN');
  const blob=UrlFetchApp.fetch('https://api.telegram.org/file/bot'+token+'/'+details.file_path).getBlob();
  const folderId=p_('PHOTO_FOLDER_ID');
  if(!folderId)throw new Error('PHOTO_FOLDER_ID is missing; run setupBackend');
  const filename=today_()+'_'+Utilities.getUuid()+'.jpg';
  const file=DriveApp.getFolderById(folderId).createFile(blob.setName(filename));
  const id='e'+new Date().getTime().toString(36)+Math.floor(Math.random()*10000).toString(36);
  const caption=(msg.caption||'').slice(0,500);
  sheet_('Mistakes').appendRow([id,today_(),'other',caption,'',photo.file_id,file.getUrl(),0,datePlus_(today_(),3),'active','','0']);
  const buttons=Object.entries(CFG.TOPICS).map(([key,name])=>[btn_(name,'topic|'+id+'|'+key)]);
  send_('📸 <b>Ошибка сохранена</b>!\n'+(caption?'Подпись: '+esc_(caption)+'\n':'')+'Выбери тему:',buttons);
}
function setTopic_(id,topic){
  if(!CFG.TOPICS[topic])return;
  const m=mistakes_().find(x=>x.id===id);
  if(!m){send_('Ошибка не найдена.');return;}
  sheet_('Mistakes').getRange(m.row,3).setValue(topic);
  send_('✅ Тема сохранена: <b>'+esc_(CFG.TOPICS[topic])+'</b>\n🧠 Бот напомнит об этой ошибке через 3 дня.',menu_());
}
function sendErrors_() {
  const all=mistakes_();
  if(!all.length){send_('📸 Ошибок пока нет. Пришли скриншот любого неправильного ответа.',menu_());return;}
  send_('📸 <b>Последние ошибки</b>\n\n'+all.slice(-6).reverse().map(m=>
    '• '+esc_(CFG.TOPICS[m.topic]||CFG.TOPICS.other)+' • '+esc_(m.created)+
    '\n  Повтор: '+esc_(m.due)+(m.question?'\n  '+esc_(m.question.slice(0,100)):'')).join('\n\n')+
    '\n\nНа повтор сейчас: <b>'+due_().length+'</b>',menu_());
}
function sendReview_(){
  const items=due_();
  if(!items.length){send_('🧠 На сегодня ошибок для повторения нет. Молодец! ✅',menu_());return;}
  const m=items[0];
  const cap='🧠 <b>Повторение ошибки</b>\nТема: '+esc_(CFG.TOPICS[m.topic]||CFG.TOPICS.other)+'\n'+
    (m.question?'Твоя заметка: '+esc_(m.question.slice(0,650))+'\n':'')+
    (m.answer?'Объяснение: '+esc_(m.answer.slice(0,600))+'\n':'')+
    '\nПосмотри на скриншот. Ты теперь знаешь правильный ответ?\nОсталось: '+items.length;
  const safeCaption=cap.slice(0,980);
  const buttons=[[btn_('✅ Знаю','review|'+m.id+'|yes'),btn_('❌ Не знаю','review|'+m.id+'|no')]];
  if(m.photo) {
    api_('sendPhoto',{chat_id:p_('CHAT_ID'),photo:m.photo,caption:safeCaption,parse_mode:'HTML',reply_markup:{inline_keyboard:buttons}});
  } else send_(cap,buttons);
}
function saveReview_(id,known){
  const m=mistakes_().find(x=>x.id===id);
  if(!m){send_('Эта ошибка не найдена.',menu_());return;}
  const stage=known?Math.min(m.stage+1,CFG.REVIEW_STEPS.length):0;
  const due=datePlus_(today_(),known?CFG.REVIEW_STEPS[Math.min(stage,CFG.REVIEW_STEPS.length-1)]:1);
  const cells=sheet_('Mistakes');
  cells.getRange(m.row,8).setValue(stage);
  cells.getRange(m.row,9).setValue(due);
  cells.getRange(m.row,11).setValue(today_());
  if(!known)cells.getRange(m.row,12).setValue(m.wrong+1);
  sheet_('Reviews').appendRow([new Date(),id,CFG.TOPICS[m.topic]||CFG.TOPICS.other,known?'know':'not_known',due]);
  send_((known?'✅ Записал: знаешь':'❌ Записал: нужно повторить')+'\nСледующее повторение: '+due);
  if(due_().some(x=>x.id!==id))sendReview_();
}
function help_(){send_('🚗 <b>Команды DriveTheory B Coach</b>\n'+
  '/today — задания на сегодня\n/progress — статистика\n/review — повторить старые ошибки\n/errors — журнал ошибок\n/plan — ближайшие дни\n/cancel — отменить ввод результата\n\n'+
  '📸 Чтобы сохранить ошибку, отправь скриншот, затем выбери тему.\n'+
  '✅ Для результата нажми кнопку под ежедневным заданием и введи: <code>27 5</code>.\n'+
  '⚠️ Бот не читает результаты экзаменационных приложений автоматически и не распознаёт правильные ответы на фото.',menu_());}
function handleText_(msg) {
  const txt=(msg.text||'').trim();
  if(txt==='/start'||txt==='/help'){clearPending_();help_();return;}
  if(txt==='/cancel'){clearPending_();send_('Ввод отменён.',menu_());return;}
  if(txt==='/today'){sendToday_();return;}
  if(txt==='/plan'){sendPlan_();return;}
  if(txt==='/progress'){sendProgress_();return;}
  if(txt==='/review'){sendReview_();return;}
  if(txt==='/errors'){sendErrors_();return;}
  const waiting=pending_();
  if(waiting&&waiting.type==='result') {
    const match=txt.match(/^([0-9]{1,2})(?:\s+([0-9]{1,3}))?$/);
    if(!match){send_('Нужен результат в формате <code>27 5</code> или <code>27</code>. Для отмены: /cancel');return;}
    const correct=Number(match[1]),points=match[2]===undefined?'':Number(match[2]);
    if(correct>30||(points!==''&&points>150)){send_('Проверь цифры: правильных 0–30, штрафные баллы 0–150.');return;}
    clearPending_();saveResult_(waiting.data.which,waiting.data.date,correct,points);return;
  }
  send_('Не понял команду. Нажми кнопку ниже или отправь /help.',menu_());
}
function handleCallback_(cb) {
  api_('answerCallbackQuery',{callback_query_id:cb.id});
  const x=String(cb.data||'').split('|');
  switch(x[0]){
    case 'today':sendToday_();break;
    case 'progress':sendProgress_();break;
    case 'plan':sendPlan_();break;
    case 'review':if(x.length===3)saveReview_(x[1],x[2]==='yes');else sendReview_();break;
    case 'errors':sendErrors_();break;
    case 'help':help_();break;
    case 'result':if(x.length===3&&['school','special'].indexOf(x[1])>=0)askResult_(x[1],x[2]);break;
    case 'add_error':askPhoto_();break;
    case 'topic':if(x.length===3)setTopic_(x[1],x[2]);break;
    default:help_();
  }
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))return HtmlService.createHtmlOutput('busy');
  try{
    if(!p_('WEBHOOK_KEY')||!e||!e.parameter||e.parameter.key!==p_('WEBHOOK_KEY'))
      return HtmlService.createHtmlOutput('forbidden');
    const u=JSON.parse(e.postData.contents);
    const last=Number(p_('LAST_UPDATE_ID')||'-1');
    if(u.update_id<=last)return HtmlService.createHtmlOutput('ok');
    const cb=u.callback_query; const msg=u.message;
    const chatId=cb&&cb.message&&cb.message.chat?String(cb.message.chat.id):(msg&&msg.chat?String(msg.chat.id):'');
    const sender=cb&&cb.from?String(cb.from.id):(msg&&msg.from?String(msg.from.id):'');
    // Private single-user bot: never accept updates from another Telegram account.
    if(chatId===p_('CHAT_ID')&&sender===p_('CHAT_ID')){
      if(cb)handleCallback_(cb);
      else if(msg&&msg.photo&&msg.photo.length)savePhoto_(msg);
      else if(msg&&msg.text)handleText_(msg);
    }
    props_().setProperty('LAST_UPDATE_ID',String(u.update_id));
    return HtmlService.createHtmlOutput('ok');
  } catch(err) {
    console.error('DriveTheory bot: '+err.message);
    throw err; // Telegram retries failed webhook requests
  } finally{lock.releaseLock();}
}
function doGet() {return HtmlService.createHtmlOutput('DriveTheory B Coach online');}

/** Run once after adding BOT_TOKEN and CHAT_ID under Project Settings → Script properties. */
function setupBackend(){
  if(!p_('BOT_TOKEN')||!p_('CHAT_ID'))throw new Error('Add BOT_TOKEN and CHAT_ID in Script Properties first');
  if(!p_('WEBHOOK_KEY'))props_().setProperty('WEBHOOK_KEY',Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''));
  if(!p_('PHOTO_FOLDER_ID')){
    const f=DriveApp.createFolder('DriveTheory Bot — Private Mistake Screenshots 2026');
    props_().setProperty('PHOTO_FOLDER_ID',f.getId());
  }
  const handlers=['dailyTask','eveningNudge'];
  ScriptApp.getProjectTriggers().forEach(t=>{if(handlers.indexOf(t.getHandlerFunction())>=0)ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('dailyTask').timeBased().everyDays(1).atHour(8).nearMinute(0).inTimezone(CFG.TZ).create();
  ScriptApp.newTrigger('eveningNudge').timeBased().everyDays(1).atHour(20).nearMinute(0).inTimezone(CFG.TZ).create();
  api_('setMyCommands',{commands:[
    {command:'today',description:'Задания на сегодня'},
    {command:'progress',description:'Мой прогресс'},
    {command:'review',description:'Повторить ошибки'},
    {command:'errors',description:'Мои ошибки'},
    {command:'plan',description:'Ближайшие дни'},
    {command:'cancel',description:'Отмена ввода'}]});
  send_('✅ DriveTheory B Coach: база и расписание настроены.\nПосле публикации веб-приложения выполни activateWebhook.');
  console.log('Backend setup done; now deploy Web App and set WEB_APP_URL.');
}
/** Run after deploying Web app as Me / Anyone, then setting WEB_APP_URL in Script Properties. */
function activateWebhook(){
  const web=p_('WEB_APP_URL');
  if(!web||web.indexOf('https://script.google.com/macros/s/')!==0||web.indexOf('/exec')<0)
    throw new Error('Set WEB_APP_URL to deployed Apps Script /exec URL');
  if(!p_('WEBHOOK_KEY'))throw new Error('Run setupBackend first');
  const url=web+'?key='+encodeURIComponent(p_('WEBHOOK_KEY'));
  api_('setWebhook',{url:url,max_connections:1,allowed_updates:['message','callback_query'],drop_pending_updates:true});
  const info=api_('getWebhookInfo',{});
  console.log('Webhook installed: '+info.url.slice(0,55)+'..., pending_updates='+info.pending_update_count);
  send_('🚀 <b>Интерактивный бот подключён!</b>\nНапиши /today или нажми кнопку ниже.',menu_());
}
function checkWebhook(){
  const x=api_('getWebhookInfo',{});
  console.log(JSON.stringify({configured:!!x.url,pending:x.pending_update_count,last_error_date:x.last_error_date,last_error_message:x.last_error_message}));
  return x;
}
/** Apps Script trigger, approximately 08:00 Berlin; do not call from GitHub Actions. */
function dailyTask(){
  if(planFor_(today_()))sendToday_();
}
function eveningNudge(){
  const d=planFor_(today_());
  if(!d||d.schoolDone&&d.specialDone)return;
  send_('🌙 <b>Проверка за сегодня</b>\n'+
    (!d.schoolDone?'🔵 Школьная тренировка ещё не отмечена\n':'')+
    (!d.specialDone?'⚫ Special Topics ещё не отмечен\n':'')+
    '\nЕсли уже решил — нажми кнопку и запиши результат.',todayButtons_(d));
}
