/**
 * Daily Telegram study task. Runs from GitHub Actions (no external dependencies).
 * All dates/times are interpreted in Europe/Berlin.
 * Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as GitHub Actions secrets.
 */
"use strict";
const plan = require("./study-plan.js");
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const testing = process.env.TEST_MODE === "1";
function berlinDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric"
    }).formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type,p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}
async function main() {
  const date = berlinDate();
  const i = testing ? 0 : plan.days.findIndex(day => day.date === date);
  if (i < 0) { console.log("No scheduled lesson for " + date); return; }
  if (!token || !chatId) {
    console.log("Not sent: configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in repository secrets.");
    return;
  }
  const d = plan.days[i];
  const message = [
    `🚗 <b>DriveTheory B • День ${i+1}/${plan.days.length}</b>`,
    `📅 ${esc(d.date)} • ${esc(d.phase)}`,
    "",
    `🔵 <b>Школьное приложение:</b> ${esc(d.school)} — 30 вопросов`,
    `⚫ <b>Special Topics:</b> ${esc(d.paid)} — 30 вопросов`,
    "",
    `🎯 <b>Главный фокус:</b> ${esc(d.focus)}`,
    "📸 Сохрани скриншоты ошибок в Smart Coach и повтори ошибки, назначенные на сегодня.",
    "✅ После выполнения отметь оба теста и штрафные баллы в приложении.",
    "",
    "📁 <a href=\"https://github.com/xscofild/drivinglicense-\">Твой DriveTheory B на GitHub</a>"
  ].join("\n");
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chat_id:chatId,text:message,parse_mode:"HTML",disable_web_page_preview:true})
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Telegram delivery failed: " + response.status + " " + (result.description || ""));
  console.log("Sent lesson day " + (i+1) + " for " + d.date);
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
