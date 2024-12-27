require('dotenv').config(); // Load environment variables

const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('pg');
const cron = require('node-cron');
const express = require('express');
const bodyParser = require('body-parser');

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const groupChatIds = process.env.GROUP_CHAT_IDS.split(',');
const DATABASE_CONFIG = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};
const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(bodyParser.json());
app.use(express.json());

app.head('/', (req, res) => {
  res.sendStatus(200);
});
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.post('/status', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== '${process.env.SECRET_KEY}') {
        return res.status(403).send({ error: 'Unauthorized!' });
    }
  
    const { siteStatus } = req.body;

    if (siteStatus) {
        console.log('The site is updated!');
        sendMessageToUsers().then(() => {
            res.send({ message: 'Monday message sent!' });
        }).catch((error) => {
            res.status(500).send({ error: 'Error sending message: ' + error.message });
        });
    } else {
        console.log('The site is not updated.');
        res.send({ message: 'Site not updated, no message sent.' });
    }
});

app.get('/status', (req, res) => {
    res.status(200).send('This endpoint is for POST requests only.');
});


  // Start server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server is running on port ${PORT}`);

});

// Initialize bot and database client
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const client = new Client(DATABASE_CONFIG);

client.connect()
  .then(() => console.log('Connected to database'))
  .catch(err => console.error('Database connection error', err.stack));

// Helper function to send messages to users
async function sendMessageToUsers(messageText) {
    const userOptions = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ رزرو کردم', callback_data: 'snooze' },
                ],
            ],
        },
    };

    try {
        // Retrieve a list of users
        const res = await client.query('SELECT telegram_id FROM users WHERE snooze = FALSE');
        const users = res.rows;

        // Send the message to all users
        for (const user of users) {
            try {
                await bot.sendMessage(user.telegram_id, messageText, userOptions);
            } catch (sendError) {
                if (sendError.response && sendError.response.statusCode === 400) {
                    console.error(`Removing user ${user.telegram_id} due to error 400`);
                    try {
                        await client.query('DELETE FROM users WHERE telegram_id = $1', [user.telegram_id]);
                        console.log(`User ${user.telegram_id} successfully removed from the database.`);
                    } catch (dbError) {
                        console.error('Error deleting user from database:', dbError);
                    }
                } else {
                    console.error(`Error sending message to user ${user.telegram_id}:`, sendError);
                }
            }
        }
    } catch (err) {
        console.error('Error retrieving users:', err);
    }
}

// Helper function to send WED messages to users
async function sendWedMessageToUsers(messageText) {
    try {
        // Retrieve a list of users
        const res = await client.query('SELECT telegram_id FROM users WHERE snooze = FALSE');
        const users = res.rows;

        // Send the message to all users
        for (const user of users) {
            try {
                await bot.sendMessage(user.telegram_id, messageText);
            } catch (sendError) {
                if (sendError.response && sendError.response.statusCode === 400) {
                    console.error(`Removing user ${user.telegram_id} due to error 400`);
                    try {
                        await client.query('DELETE FROM users WHERE telegram_id = $1', [user.telegram_id]);
                        console.log(`User ${user.telegram_id} successfully removed from the database.`);
                    } catch (dbError) {
                        console.error('Error deleting user from database:', dbError);
                    }
                } else {
                    console.error(`Error sending message to user ${user.telegram_id}:`, sendError);
                }
            }
        }
    } catch (err) {
        console.error('Error retrieving users:', err);
    }
}

// Helper function to reset the user's snooze data in the database
const resetWeeklyData = async () => {
    try {
      const query = 'UPDATE users SET snooze = FALSE';
      await client.query(query);
      console.log('Weekly data reset successfully.');
    } catch (error) {
      console.error('Error resetting weekly data:', error);
    }
};

// ---------------Scheduled Tasks (Cron jobs):----------------

// Every Monday: Reminder for users
/*
cron.schedule('0 22 * * 1', async () => {
    console.log('Sending Monday reminder...');
    await sendMessageToUsers('لیست غذا های هفته بعد در سامانه به روز رسانی شده ✅\nرزرو غذای هفته آینده فراموش نشود ❗️');
  }, {
    timezone: "Asia/Tehran"
});
*/

// Every Tuesday: Reminder for users
cron.schedule('0 22 * * 2', async () => {
    console.log('Sending Tuesday reminder...');
    await sendMessageToUsers('رزرو غذای هفته آینده فراموش نشود❗️');
  }, {
    timezone: "Asia/Tehran"
});

// Every Wednesday: Final reminder
cron.schedule('0 23 * * 3', async () => {
    console.log('Sending Wednesday final reminder...');
    await sendWedMessageToUsers('آخرین ساعات برای رزرو هفته آینده ⚠️\nرزرو غذای هفته آینده فراموش نشود❗️');
  }, {
    timezone: "Asia/Tehran"
});

//weekly messages for groups
cron.schedule('0 22 * * 3', () => {
    groupChatIds.forEach(chatId => {
      const messageText = 'رزرو غذای هفته آینده فراموش نشود❗️'
      bot.sendMessage(chatId, messageText);
    });
  }, {
      timezone: "Asia/Tehran"
});

// Schedule the weekly reset
cron.schedule('0 0 * * 4', async () => {
    console.log('Running weekly reset...');
    await resetWeeklyData();
  }, {
    timezone: "Asia/Tehran"
});

//------------------------------------------------------------

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
        if (callbackQuery.data === 'snooze') {
            const res = await client.query('SELECT snooze FROM users WHERE telegram_id = $1', [chatId]);
            const user = res.rows[0];
        
            if (user && user.snooze === true) {
                await bot.editMessageText(chatId, 'یادآوری‌های شما قبلاً متوقف شده است. 😊', {
                    chat_id: chatId,
                    message_id: message.message_id}
                );
            }
            
            else {
                await client.query('UPDATE users SET snooze = TRUE WHERE telegram_id = $1', [chatId]);
                await bot.editMessageText('یادآوری‌ها برای این هفته متوقف شد. 😊', {
                  chat_id: chatId,
                  message_id: message.message_id,
                  reply_markup: {
                    inline_keyboard: [[{ text: 'فعال کردن یادآوری‌ها', callback_data: 'revert_snooze' }]],
                  },
                });
            }
        }

        if (callbackQuery.data === 'revert_snooze') {
            const res = await client.query('SELECT snooze FROM users WHERE telegram_id = $1', [chatId]);
            const user = res.rows[0];
        
            if (user && user.snooze === false) {
                await bot.editMessageText(chatId, 'یادآوری‌های شما از قبل فعال است. 😊', {
                    chat_id: chatId,
                    message_id: message.message_id}
                );
            }
            
            else {
                await client.query('UPDATE users SET snooze = FALSE WHERE telegram_id = $1', [chatId]);
                await bot.editMessageText('یادآوری‌ها برای این هفته دوباره فعال شد. 😊', {
                  chat_id: chatId,
                  message_id: message.message_id,
                  reply_markup: {
                    inline_keyboard: [[{ text: '✅ رزرو کردم', callback_data: 'snooze' }]],
                  },
                });
            }
        }

    }
    catch (err) {
        console.error('Error handling callback query:', err);
        bot.sendMessage(chatId, 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
    }
});
