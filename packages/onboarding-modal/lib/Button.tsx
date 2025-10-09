import { useState } from "react";
import { Modal, type ModalProps } from "./Modal";
import { Bell } from "./Bell";

export type MyButtonProps = {
  modal: ModalProps;
};

export function Button({ modal }: MyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className="dme-modal__button--reset dme-modal__trigger"
        onClick={() => setIsModalOpen(true)}
      >
        <span>DMe </span>
        <Bell />
      </button>
      {isModalOpen && <Modal {...modal} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
