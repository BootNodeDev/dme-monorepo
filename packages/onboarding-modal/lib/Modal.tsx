import QRCode from "react-qr-code";

export type ModalProps = {
  bot: string;
  address: string;
  title: string;
  description: string;
  cta: string;
  onClose: () => void;
};

export function Modal({ bot, address, title, description, cta, onClose }: ModalProps) {
  const link = `https://t.me/${bot}?start=${address}`;

  return (
    <div className="dme-onboarding-modal__overlay" onClick={onClose}>
      <div className="dme-onboarding-modal__modal" onClick={(e) => e.stopPropagation()}>
        <header className="dme-onboarding-modal__header">
          <h2 className="dme-onboarding-modal__title">{title}</h2>
          <button className="dme-onboarding-modal__close-button" onClick={onClose}>
            &times;
          </button>
        </header>

        <main className="dme-onboarding-modal__main">
          <p className="dme-onboarding-modal__description">{description}</p>
          <QRCode className="dme-onboarding-modal__qr-code" value={link} />
          <a
            className="dme-onboarding-modal__cta"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {cta}
          </a>
        </main>

        <footer className="dme-onboarding-modal__footer">
          Powered by{" "}
          <a
            className="dme-onboarding-modal__footer-link"
            href="https://github.com/BootNodeDev/dme-monorepo"
            target="_blank"
            rel="noopener noreferrer"
          >
            BootNode
          </a>
        </footer>
      </div>
    </div>
  );
}
