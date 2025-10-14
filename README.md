# DMe Monorepo

This monorepo contains the source code for the DMe framework. It provides a solid foundation to easily build and deploy a Telegram bot notification system. It comes with an optimized message queue and dispatching system to ensure reliable delivery of notifications, a ready-to-use user onboarding component for React dApps that allows users to subscribe with a single click or QR scan, and a predefined set of commands for users to manage their subscribed wallets.

It is designed for anyone to clone or fork and use it as a starting point to build their own Telegram notification system, without worrying about the complexities of the underlying messaging system.

## Index

- [Features](#features)
- [Getting Started](#getting-started)
- [Example](#example)
- [Project Structure](#project-structure)
- [Onboarding Modal Component](#onboarding-modal-component)
- [Database](#database)

## Features

| Feature | Description |
|---------|-------------|
| Optimized Notifications | Reliable Telegram delivery out of the box. No complex setup required. |
| From Pull to Push | Trigger relevant, contextual messages based on wallet activity. Keep your users informed in real-time without them having to check your dashboard. |
| Telegram Bot | Prebuilt bot with wallet linkage and user controls. No need to build your own interface. |
| Telegram Mini App (Coming Soon) | Richer Telegram UI via a lightweight, integrated Telegram Mini App. |
| Onboarding Component | React component for instant onboarding. Users click a link or scan a QR. No wallet connection needed. |
| Zero Installs | No apps, no browser extensions. Everything runs through Telegram. |
| Easy Deployment | Runs as a single-node service. Self-host or deploy in your cloud infra. |
| White Label | Customize components with your own branding and front-end logic. |
| Data Flexibility | Compatible with SQLite, Postgres, MySQL, or MongoDB. Use your preferred stack. You own your user's data, eliminating exposure to third-party risks. |
| Built for Simplicity | Deliver what drives user engagement, retention, and re-activation. DMe handles delivery logic; you focus on wallet signals. |
| Attribution Dashboard (Coming Soon) | Track delivery, opens, and basic interaction metrics to measure messaging impact. |
| Open Source | This framework is **fully open source**. You can inspect, extend, and contribute to its codebase. It’s actively maintained and open to community feedback and contributions. |

## Getting Started

To set up a Telegram notification system using the **DMe** framework, follow these steps:

### 1. Create a Telegram Bot

Talk to [@BotFather](https://t.me/BotFather) on Telegram to create a new bot and obtain your **bot token**.

### 2. Fork the Repository

Clone the **DMe** monorepo to your local machine:

```bash
git clone git@github.com:BootNodeDev/dme-monorepo.git && cd dme-monorepo
```

### 3. Install Node.js

Install Node.js version 22.19.0. We recommend using [nvm](https://github.com/nvm-sh/nvm) for Node.js version management:

```bash
nvm install 22.19.0
nvm use 22.19.0
```

### 4. Install pnpm

Install pnpm package manager:

```bash
npm install -g pnpm
```

### 5. Install Dependencies

Install the required dependencies using **pnpm**:

```bash
pnpm install
```

### 6. Navigate to the Server Package

```bash
cd packages/server
```

### 7. Set Up Environment Variables

Copy the example environment file and update it with your bot token:

```bash
cp .env.example .env
```

Fill in the `BOT_TOKEN` value with the token you received from BotFather.
Other environment variables are optional and include sensible defaults for getting started.

The cleanup feature is configured via `CLEANUP_CRON` (default: daily at midnight) and `CLEANUP_CUTOFF` (default: 1 week retention).

### 8. Run the Server

Start the development server with:

```bash
pnpm dev
```

### 9. Start the Bot

Replace `{botname}` in the link below with your bot's username (without the `@` symbol) and open it in your browser:

```
https://t.me/{botname}?start=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

For example, if your bot name is `@MyBot`, use:

```
https://t.me/MyBot?start=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

Click **Start** in Telegram to begin the conversation with your bot.
You should receive a welcome message and a test message every 10 seconds from the `SampleJob`, confirming that everything is working correctly.

To customize behavior, open `packages/server/src/index.ts` and **comment out or remove** the `SampleJob`.
You can then create your own jobs to send custom notifications to users.

## Example

You can checkout to the `example/uniswap` branch to see a working example of the DMe framework used to notify Uniswap liquidity providers about their position status.

![DMe Demo](https://github.com/user-attachments/assets/a01fad30-c92e-4a40-b75c-0dbde4cb4f1b)

The example extends the base framework by adding three jobs that periodically make requests to the **revert.finance** API to fetch subscribed user position data and send notifications based on certain conditions:

### 1. Out-of-Range Position Alerts

This job checks if any of the user's Uniswap V3 liquidity positions are out of range (i.e., the current price is outside the position's tick range). If a position is found to be out of range, the user receives a notification alerting them of this status along with a link to the Uniswap interface to manage their position.

### 2. Fee Collection Reminders

This job monitors the fees accrued in the user's Uniswap V3 liquidity positions. If the fees exceed a predefined threshold, the user is notified with a reminder to collect their earnings, along with a link to the Uniswap interface for easy access.

### 3. Summary

Sends a summary of the total values of the user's liquidity positions along with PnL information.

The example also demonstrates how commands can be customized—for instance, obtaining position data of a user that just subscribed to the bot and sending a welcome message with a summary of their current positions.

> **Note:** The example is provided for educational purposes and may require further customization to fit specific use cases or production environments.

## Project Structure

The monorepo is organized into the following packages:

* `packages/server`: The main server application that runs the Telegram bot and handles user interactions, message dispatching, and job scheduling.
* `packages/onboarding-modal`: A React component that provides a user-friendly onboarding experience for linking Telegram accounts with their wallet addresses.

The server package is built with TypeScript and uses the [grammy](https://grammy.dev/) framework for Telegram bot interactions, [Prisma](https://www.prisma.io/) for database management, and [node-cron](https://www.npmjs.com/package/node-cron) for scheduling jobs.

The file structure is organized as follows:

```
packages/
├── server/                    # Main server application
│   └── src/
│       ├── prisma/            # Prisma schema and migrations
│       ├── scripts/           # Utility scripts. Includes a script to run integration tests
│       └── src/
│           ├── handlers/      # Telegram bot command handlers. Includes /start, /add, /remove, /list base commands
│           ├── jobs/          # Scheduled jobs for sending notifications. Includes the dispatch job in charge of sending messages from the queue, cleanup job for old messages, and a sample job
│           ├── services/      # Services used to abstract database and Telegram API interactions.
│           └── tests/         # Utility functions for testing
└── onboarding-modal/          # React component for user onboarding
    ├── lib/                   # Components and styles that will be exported into the package
    └── src/                   # Example usage of the component
```

You can do whatever you want with the code in this monorepo. The current structure is just a suggestion to help you get started with a solid foundation for building your own Telegram notification system. Given that it is focused on solving user onboarding and message queue and dispatch for you.

Imagine that you want to send alerts to your users when their Aave positions are at risk of liquidation. You could rely on the existing onboarding and message dispatching system, and just add a new job that periodically checks your users' Aave positions using the [Aave API](https://github.com/aave/aave-utilities). When a position is at risk (because the health factor is under 1.5, for example), you can use the `MessageService` to send a notification to the user, leveraging all the built-in features like rate limiting, retries, and markdown formatting.

In this case, you would add an `aave.ts` service to the **services** folder and a new `health.ts` job to the **jobs** folder that uses the Aave service to fetch user positions and build the message to be sent with the `MessageService.create` method, then instantiate them in the `index.ts` file.

## Onboarding Modal Component

The framework includes a React component that can be integrated into your React dApp to facilitate user onboarding. This component consists of a button that, when clicked, opens a modal dialog. The modal displays a QR code that the user can scan with their phone to easily start a conversation with the Telegram bot and link their wallet address for notifications in a single action. The modal also provides a link as an alternative to open Telegram directly in the browser.

### 1. Install the Component

```bash
pnpm install dme-onboarding-modal
```

### 2. Import Styles in Your Main App File

```tsx
import "dme-onboarding-modal/lib/index.css";
```

### 3. Use the Component in Your React App

```tsx
import { OnboardingModal } from "dme-onboarding-modal";

function Navbar() {
  return (
    <nav>
      <OnboardingModal
        botUsername="MyBot"
        walletAddress="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
      />
    </nav>
  );
}
```

The wallet address can be obtained from your dApp’s Web3 provider, such as **MetaMask** or **WalletConnect**.

## Database

The framework uses **SQLite** as the default database, which is file-based and requires no additional setup. The database file is created automatically in the `packages/server/prisma` directory.

If you want to use another database, update the `DATABASE_URL` in the `.env` file accordingly and modify the Prisma schema in `packages/server/prisma/schema.prisma` to match your database provider.

For example, to use **PostgreSQL**, update the provider in the schema file to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

And set the `DATABASE_URL` to something like this:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

Keep in mind that the migration files included with the framework are tailored for SQLite, so you may need to delete them and create new migrations for your chosen database.

For more details about supported databases and handling migrations, check the [Prisma documentation](https://www.prisma.io/docs/).
