# DMe Onboarding Modal Component

A React component for seamless user onboarding to Telegram bot notifications, part of the [DMe Framework](https://github.com/BootNodeDev/dme-monorepo). This component provides a user-friendly interface that allows users to subscribe to wallet notifications with a single click or QR scan, without requiring wallet connection.

## Installation

```bash
npm install dme-onboarding-modal
```

## Usage

### 1. Import the Component and Styles

In your main app file (e.g., `App.tsx` or `index.tsx`), import the component's styles:

```tsx
import "dme-onboarding-modal/lib/index.css";
```

### 2. Use the Component in Your React App

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

### 3. Get the Wallet Address

The wallet address can be obtained from your dApp's Web3 provider, such as **MetaMask** or **WalletConnect**:

```tsx
import { OnboardingModal } from "dme-onboarding-modal";
import { useAccount } from "wagmi"; // or your Web3 library

function Navbar() {
  const { address } = useAccount();

  return (
    <nav>
      {address && (
        <OnboardingModal
          botUsername="MyBot"
          walletAddress={address}
        />
      )}
    </nav>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `botUsername` | `string` | Yes | Your Telegram bot's username (without the `@` symbol) |
| `walletAddress` | `string` | Yes | The Ethereum wallet address to link with the user's Telegram account |

## How It Works

When clicked, the component opens a modal dialog that displays:

1. **QR Code**: Users can scan with their mobile device to instantly open the Telegram bot and link their wallet
2. **Direct Link**: Alternative option to open Telegram directly in the browser

The modal generates a deep link to your Telegram bot with the wallet address as a start parameter, enabling seamless onboarding in a single action.

## Example

```tsx
import { OnboardingModal } from "dme-onboarding-modal";
import "dme-onboarding-modal/lib/index.css";

function App() {
  return (
    <div className="app">
      <header>
        <h1>My DeFi App</h1>
        <OnboardingModal
          botUsername="MyDeFiBot"
          walletAddress="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        />
      </header>
    </div>
  );
}

export default App;
```

## License

MIT

## Part of DMe Framework

This component is part of the [DMe Framework](https://github.com/BootNodeDev/dme-monorepo), a complete solution for building Telegram bot notification systems for Web3 applications.
