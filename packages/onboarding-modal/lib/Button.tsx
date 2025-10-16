import { useState, type ButtonHTMLAttributes } from "react";
import { Modal, type ModalProps } from "./Modal";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  modal: Omit<ModalProps, "onClose">;
};

export function Button({ modal, ...rest }: ButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className="dme-onboarding-modal__button"
        onClick={() => setIsModalOpen(true)}
        {...rest}
      />
      {isModalOpen && <Modal onClose={() => setIsModalOpen(false)} {...modal} />}
    </>
  );
}
