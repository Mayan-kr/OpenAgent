import { createRoot } from "react-dom/client";
import "../sidepanel/styles.css";

function Popup() {
  return (
    <main>
      <header>
        <strong>OpenAgent</strong>
      </header>
      <p>Open the side panel to chat about the current page.</p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Popup />);
