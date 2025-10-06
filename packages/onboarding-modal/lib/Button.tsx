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
      <button className="button" onClick={() => setIsModalOpen(true)}>
        {text}
      </button>
      {isModalOpen && (
        <Modal {...modal} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
