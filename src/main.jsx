import React from "react";
import { createRoot } from "react-dom/client";
import TimePlanPrototype from "./App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode><TimePlanPrototype /></React.StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("No se pudo registrar el modo offline de TimePlan:", error);
    });
  });
}
