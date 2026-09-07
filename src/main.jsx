import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./styles/variables.css";
import "./styles/global.css";
import "./styles/animations.css";
import "./styles/responsive.css";


/* =========================================================
   APP BOOTSTRAP
========================================================= */

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Daily Goal root element was not found."
  );
}


ReactDOM.createRoot(
  rootElement
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);