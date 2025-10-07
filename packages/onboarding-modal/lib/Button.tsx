import { useState } from "react";
import { Modal, type ModalProps } from "./Modal";

export type MyButtonProps = {
  text: string;
  modal: ModalProps;
};

export function Button({ text, modal }: MyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className="dme-modal__button--reset dme-modal__trigger"
        onClick={() => setIsModalOpen(true)}
      >
        {text}
      </button>
      {isModalOpen && <Modal {...modal} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
