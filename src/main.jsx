import React from "react";
import { createRoot } from "react-dom/client";
import TimePlanPrototype from "./App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode><TimePlanPrototype /></React.StrictMode>
);
