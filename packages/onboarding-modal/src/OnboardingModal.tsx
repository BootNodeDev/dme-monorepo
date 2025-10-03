import { useState } from "react";
import QRCode from "react-qr-code";

type OnboardingModalProps = {
  bot: string;
  address: string;
};

export function OnboardingModal({ bot, address }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const telegramUrl = `https://t.me/${bot}?start=${address}`;

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsOpen(false)}>Close</button>
            <h2>Connect to DMe</h2>
            <div>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                Open Telegram Bot
              </a>
            </div>
            <div>
              <QRCode value={telegramUrl} size={150} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
