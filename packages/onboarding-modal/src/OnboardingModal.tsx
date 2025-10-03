import { useState } from "react";
import "./OnboardingModal.css";
import telegramLogo from "./assets/telegramLogo.svg";
import QRCode from "react-qr-code";

interface OnboardingModalProps {
  botUsername: string;
  walletAddress: string;
}

export function OnboardingModal({ botUsername, walletAddress }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const telegramUrl = `https://t.me/${botUsername}?start=${walletAddress}`;

  return (
    <div className="onboarding-modal container">
      <button className="button" onClick={() => setIsOpen(true)}>
        <img src={telegramLogo} alt="Telegram Logo" className="telegram-logo" />
        DMe
      </button>
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              ×
            </button>
            <h2>Connect to DMe</h2>
            <div className="modal-content">
              <div className="modal-left">
                <h3>Connect a Wallet</h3>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="telegram-button"
                >
                  <img src={telegramLogo} alt="Telegram" className="telegram-button-icon" />
                  Open Telegram Bot
                </a>
              </div>
              <div className="modal-divider"></div>
              <div className="modal-right">
                <h3>Scan with your phone</h3>
                <div className="qr-code-wrapper">
                  <QRCode
                    value={telegramUrl}
                    size={200}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
