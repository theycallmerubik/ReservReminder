require('dotenv').config(); // Load environment variables

const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('pg');
const cron = require('node-cron');

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const DATABASE_CONFIG = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

// Initialize bot and database client
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const client = new Client(DATABASE_CONFIG);

client.connect()
  .then(() => console.log('Connected to database'))
  .catch(err => console.error('Database connection error', err.stack));

// Helper function to send Monday admin panel
async function sendMondayPanelToAdmin() {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ تایید ارسال پیام', callback_data: 'confirm_monday' },
          { text: '❌ هنوز به‌روزرسانی نشده', callback_data: 'delay_monday' },
        ],
      ],
    },
  };

  await bot.sendMessage(ADMIN_CHAT_ID, 'سایت رزرو غذا به‌روزرسانی شده است؟', options);
}

// Helper function to send messages to users
async function sendMessageToUsers(messageText) {
    const useroptions = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ رزرو کردم', callback_data: 'snooze' },
            ],
          ],
        },
      };
  try {
    const res = await client.query('SELECT telegram_id FROM users WHERE snooze = FALSE');
    const users = res.rows;

    for (const user of users) {
      await bot.sendMessage(user.telegram_id, messageText, useroptions);
    }
  } catch (err) {
    console.error('Error sending messages to users:', err);
  }
}

// Helper function to send messages to users
async function sendWedMessageToUsers(messageText) {
  try {
    const res = await client.query('SELECT telegram_id FROM users WHERE snooze = FALSE');
    const users = res.rows;

    for (const user of users) {
      await bot.sendMessage(user.telegram_id, messageText);
    }
  } catch (err) {
    console.error('Error sending messages to users:', err);
  }
}

const resetWeeklyData = async () => {
    try {
      const query = 'UPDATE users SET snooze = FALSE';
      await client.query(query);
      console.log('Weekly data reset successfully.');
    } catch (error) {
      console.error('Error resetting weekly data:', error);
    }
  };

// Schedule the weekly reset
cron.schedule('0 0 * * 4', async () => {
    console.log('Running weekly reset...');
    await resetWeeklyData();
  });

// Scheduled Tasks (Cron jobs)

// Every Monday at 4 PM (Tehran time): Send admin panel
cron.schedule('0 16 * * 1', async () => {
  console.log('Sending Monday admin panel...');
  await sendMondayPanelToAdmin();
});

// Every Tuesday at 8 PM (Tehran time): Reminder for users
cron.schedule('0 20 * * 2', async () => {
  console.log('Sending Tuesday reminder...');
  await sendMessageToUsers('رزرو غذای هفته آینده فراموش نشود❗️');
});

// Every Wednesday at 8 PM (Tehran time): Final reminder
cron.schedule('0 20 * * 3', async () => {
  console.log('Sending Wednesday final reminder...');
  await sendWedMessageToUsers('آخرین ساعات برای رزرو هفته آینده ⚠️\nرزرو غذای هفته آینده فراموش نشود❗️');
});

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'کاربر';

  try {
    const res = await client.query('SELECT telegram_id FROM users WHERE telegram_id = $1', [chatId]);
    if (res.rows.length > 0) {
      bot.sendMessage(chatId, 'شما قبلاً در ربات ثبت‌نام شده‌اید. 😊');
    } else {
      await client.query('INSERT INTO users (telegram_id, snooze) VALUES ($1, FALSE)', [chatId]);
      bot.sendMessage(chatId, `سلام ${name}!\n\n شما در لیست یادآوری رزرو غذا ثبت شدید. ✅🥗\n\nنوتیف ربات را فعال کنید تا از اطلاع رسانی ها جا نمانید. 🛎 😊\n\nاز دستور /help برای دریافت اطلاعات ربات استفاده کنید.`);
    }
  } catch (err) {
    console.error('Error registering user:', err);
    bot.sendMessage(chatId, 'مشکلی در ثبت‌نام پیش آمد. لطفاً دوباره تلاش کنید.');
  }
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
      bot.sendMessage(chatId, 'این ربات سه بار در هفته رزرو غذای هفته آینده را به شما یادآوری میکند.👌\nروز اضافه شدن لیست غذا های هفته بعد (معمولا دوشنبه ها)📌\nشب های سه شنبه و چهار شنبه🌌\n\nبرای هر یادآور یک دکمه تعریف شده که اگر از آن استفاده کنید بدین معناست که شما غذای هفته آتی را رزرو کردید و دیگر نیازی به یادآوری ندارید، پس یادآور دیگری در آن هفته دریافت نمیکنید.🥘👍\n\n📩Programmed by @Ru_Bic V3.0');
    });

// Handle callback queries for inline buttons
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;

  try {
    if (callbackQuery.data === 'confirm_monday') {
      await bot.editMessageText('پیام دوشنبه ارسال شد. ✅', {
        chat_id: chatId,
        message_id: message.message_id,
      });
      await sendMessageToUsers('لیست غذا های هفته بعد در سامانه به روز رسانی شده ✅\nرزرو غذای هفته آینده فراموش نشود ❗️');
    }

    if (callbackQuery.data === 'delay_monday') {
      await bot.editMessageText('منتظر به‌روزرسانی جدید می مانیم. ⏳', {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: 'ارسال پیام همین حالا', callback_data: 'send_monday_now' }]],
        },
      });
      const retryTimeout = setTimeout(() => sendMondayPanelToAdmin(), 2 * 60 * 60 * 1000); // Reschedule for 2 hours

      // Store the timeout ID to clear it if "Send Now" is clicked
        if (retryQuery.data === 'send_monday_now') {
          clearTimeout(retryTimeout);
          await bot.editMessageText('پیام دوشنبه ارسال شد. ✅', {
            chat_id: chatId,
            message_id: retryQuery.message.message_id,
          });
          await sendMessageToUsers('لیست غذا های هفته بعد در سامانه به روز رسانی شده ✅\nرزرو غذای هفته آینده فراموش نشود ❗️');
        }
    }

    if (callbackQuery.data === 'revert_snooze') {
      await client.query('UPDATE users SET snooze = FALSE WHERE telegram_id = $1', [chatId]);
      await bot.editMessageText('یادآوری‌ها برای این هفته دوباره فعال شد. 😊', {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: '✅ رزرو کردم', callback_data: 'snooze' }]],
        },
      });
    }

    if (callbackQuery.data === 'snooze') {
      await client.query('UPDATE users SET snooze = TRUE WHERE telegram_id = $1', [chatId]);
      await bot.editMessageText('یادآوری‌ها برای این هفته متوقف شد. 😊', {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: 'فعال کردن یادآوری‌ها', callback_data: 'revert_snooze' }]],
        },
      });
    }
  } catch (err) {
    console.error('Error handling callback query:', err);
    bot.sendMessage(chatId, 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
  }
});
