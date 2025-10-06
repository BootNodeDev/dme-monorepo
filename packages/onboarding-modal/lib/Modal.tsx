import QRCode from "react-qr-code";
import "./Modal.css";

export function Modal() {
  return (
    <div className="dme-modal__overlay">
      <div className="dme-modal__content">
        <div className="dme-modal__header">
          <h2 className="dme-modal__title">DMe</h2>
          <button className="dme-modal__button--reset dme-modal__close">
            &times;
          </button>
        </div>
        <div className="dme-modal__body">
          <p className="dme-modal__description">
            Scan the QR code below or click the button to start receiving
            valuable and actionable alerts and notifications on telegram.
          </p>
          <QRCode className="dme-modal__qr" value="https://dme.nandor.me" />
          <button className="dme-modal__button--reset dme-modal__link-button">
            <a className="dme-modal__a--reset" href="https://dme.nandor.me">
              Open DMe
            </a>
          </button>
        </div>
      </div>
    </div>
  );
}
