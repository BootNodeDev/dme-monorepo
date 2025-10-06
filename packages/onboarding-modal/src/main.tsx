import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Modal } from "../lib/Modal.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Modal bot="some-bot" address="some-address" />
  </StrictMode>
);
