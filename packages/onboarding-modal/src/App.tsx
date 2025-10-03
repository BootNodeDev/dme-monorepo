import { OnboardingModal } from "./OnboardingModal";

function App() {
  return (
    <>
      <OnboardingModal 
        botUsername={import.meta.env.VITE_TELEGRAM_BOT_USERNAME}
        walletAddress={import.meta.env.VITE_WALLET_ADDRESS}
      />
    </>
  );
}

export default App;
