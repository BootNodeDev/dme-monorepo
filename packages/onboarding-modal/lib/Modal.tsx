import QRCode from "react-qr-code";
import "./Modal.css";

export type ModalProps = {
  bot: string;
  address: string;
  title?: string;
  description?: string;
  cta?: string;
  onClose?: () => void;
};

export function Modal({
  bot,
  address,
  title,
  description,
  cta,
  onClose,
}: ModalProps) {
  const link = `https://t.me/${bot}?start=${address}`;

  return (
    <div className="dme-modal__overlay" onClick={onClose}>
      <div className="dme-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="dme-modal__header">
          <h2 className="dme-modal__title">{title || "DMe"}</h2>
          <button
            className="dme-modal__button--reset dme-modal__close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="dme-modal__body">
          <p className="dme-modal__description">
            {description ||
              "Scan the QR code below or click the button to start receiving valuable and actionable alerts and notifications on telegram."}
          </p>
          <QRCode className="dme-modal__qr" value={link} />
          <a
            className="dme-modal__a--reset dme-modal__cta"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {cta || "Open Telegram"}
          </a>
        </div>
      </div>
    </div>
  );
}
