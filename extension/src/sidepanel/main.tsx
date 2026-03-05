import React from "react";
import ReactDOM from "react-dom/client";
import { CartifyApp } from "../shared/CartifyApp";
import "../popup/popup.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CartifyApp mode="sidepanel" />
  </React.StrictMode>
);
