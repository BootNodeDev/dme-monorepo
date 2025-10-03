import { OnboardingModal } from "./OnboardingModal";

function App() {
  return (
    <>
      <OnboardingModal 
        bot={import.meta.env.VITE_TELEGRAM_BOT_USERNAME}
        address={import.meta.env.VITE_WALLET_ADDRESS}
      />
    </>
  );
}

export default App;
