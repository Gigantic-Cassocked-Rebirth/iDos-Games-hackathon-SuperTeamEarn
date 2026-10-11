// Local sandbox: the table without sign-in, for trying the physics and the look. Not part of the build.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { UiKitProvider } from "@idosgames/react/ui";
import { Board } from "../src/modules/asyq/components/Board";
import { OPPONENTS } from "../src/modules/asyq/data/opponents";
import { saqaById } from "../src/modules/asyq/data/saqas";
import { live } from "../src/modules/asyq/game/live";
(window as unknown as { live: typeof live }).live = live;

const params = new URLSearchParams(location.search);
const opp = OPPONENTS[Number(params.get("opp") ?? 0)] ?? OPPONENTS[0];
const saqa = saqaById(params.get("saqa") ?? "bone");

function App() {
  const [result, setResult] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <Board key={key} playerSaqa={saqa} opponent={opp} onFinish={(m) => setResult(`${m.captured.player}:${m.captured.bot}`)} onQuit={() => setKey((k) => k + 1)} />
      {result ? <div id="result" style={{ position: "absolute", top: 80, left: 20, color: "#fff", fontSize: 30 }}>{result}</div> : null}
    </div>
  );
}
createRoot(document.getElementById("app")!).render(<UiKitProvider><App /></UiKitProvider>);
