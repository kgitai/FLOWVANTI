import { useEffect } from "react";
import "./app.css";
import FlowUi from "./FlowUi.jsx";
import { bootFlow } from "./flow.js";

export default function App() {
  useEffect(() => {
    bootFlow().then(() => {
      if (window.__flowResyncProjects) window.__flowResyncProjects();
    });
  }, []);

  return (
    <div id="flow-root">
      <FlowUi />
    </div>
  );
}
