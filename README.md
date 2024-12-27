# Telegram Reservation Reminder Bot

This project is a **Telegram bot** designed to help users stay updated about food reservations by sending reminders at specific times. The bot features message scheduling, user management, and snooze functionality, making it adaptable for other types of reminders or scheduling tasks.

---

## Features

1. **Scheduled Reminders**: Sends automated reminders for specific days and times:
   - Monday: Reminder when the reservation system is updated.
   - Tuesday: Evening reminder about upcoming reservations.
   - Wednesday: Final reminder before the reservation window closes.
2. **Inline Keyboard**: Includes snooze buttons for users who have already completed their reservations.
3. **Group Notifications**: Sends group reminders in specified Telegram groups.
4. **Database Management**: Tracks users and their snooze preferences in a PostgreSQL database.
5. **Weekly Data Reset**: Resets user snooze statuses every Thursday.
6. **Admin Control**: Admins can control whether reminders are sent through a `/status` endpoint.
7. **Error Handling**: Manages failed message deliveries and removes invalid users from the database.

---

## Getting Started

### Prerequisites

- **Node.js** (v14 or later)
- **PostgreSQL** database
- Telegram Bot Token (from [@BotFather](https://core.telegram.org/bots#botfather))
- Hosting service like [Railway.app](https://railway.app/) or local environment

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/theycallmerubik/ReservReminder.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   ADMIN_CHAT_ID=your_admin_chat_id
   GROUP_CHAT_IDS=group_chat_id_1,group_chat_id_2
   DB_USER=your_postgresql_user
   DB_HOST=your_postgresql_host
   DB_NAME=your_database_name
   DB_PASSWORD=your_database_password
   DB_PORT=your_database_port
   SECRET_KEY=your_secret_key
   PORT=your_port_number
   ```

### Running the Bot

1. Start the bot:
   ```bash
   node bot.js
   ```
2. Access the bot on Telegram and test its features using `/start` and `/help` commands.

---

## Usage

1. **User Registration**: When users send `/start`, they are added to the database and will receive scheduled reminders.
2. **Reminder Scheduling**:
   - Predefined reminders are sent on Monday, Tuesday, and Wednesday.
   - Messages include inline buttons for snoozing future reminders.
3. **Admin Management**:
   - Admins can manually confirm if Monday's reminder should be sent using the `/status` endpoint.
   - The admin API key ensures secure access to this functionality.
4. **Group Notifications**: Groups listed in `GROUP_CHAT_IDS` will receive reminders on Wednesday.

---

## Endpoints

### `GET /`

Returns a message confirming that the bot is running.

### `POST /status`

Allows admins to control whether Monday reminders should be sent based on the reservation system's status.

You can also use other scripts to send POST to the bot. see [This git](https://github.com/theycallmerubik/web-scraping-script) for more information.

- **Headers**:
  - `x-api-key`: Admin secret key for authentication.
- **Body**:
  ```json
  {
    "siteStatus": true
  }
  ```

---

## Database Schema

The bot uses a PostgreSQL database to manage users:

```sql
CREATE TABLE users (
    telegram_id BIGINT PRIMARY KEY,
    snooze BOOLEAN DEFAULT FALSE
);
```

---

## Customization

This bot is designed to be adaptable for other purposes beyond food reservation reminders. You can modify the code to:

- Change reminder messages.
- Add new scheduled tasks.
- Integrate with other APIs for dynamic content.

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) for seamless Telegram bot integration.
- PostgreSQL for reliable database management.

Feel free to contribute to this project by submitting issues or pull requests!

---

## Contact

For questions or suggestions, contact:

- Telegram: @Ru\_bic
- Email: [rubikmanyt@Gmail.com](mailto\:rubikmanyt@Gmail.com)
