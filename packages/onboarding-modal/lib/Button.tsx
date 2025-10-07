import { useState } from "react";
import { Modal, type ModalProps } from "./Modal";

export type MyButtonProps = {
  modal: ModalProps;
  children?: React.ReactNode;
};

export function Button({ children, modal }: MyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className="dme-modal__button--reset dme-modal__trigger"
        onClick={() => setIsModalOpen(true)}
      >
        {children ?? <span>DMe</span>}
      </button>
      {isModalOpen && <Modal {...modal} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
