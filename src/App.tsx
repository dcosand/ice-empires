import { useReducer } from "react";
import { gameReducer } from "./engine/gameReducer";
import { createInitialState } from "./engine/initialState";
import { LandingScreen } from "./components/LandingScreen";
import { ClubSelectScreen } from "./components/ClubSelectScreen";
import { FoundingScreen } from "./components/FoundingScreen";
import { FoundingMap } from "./components/FoundingMap";
import { Dashboard } from "./components/Dashboard";
import { BackgroundMusic } from "./components/BackgroundMusic";

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  return (
    <>
      {/* Mounted once so music persists across every screen. */}
      <BackgroundMusic />
      {renderScreen()}
    </>
  );

  function renderScreen() {
    if (state.phase === "landing") {
      return <LandingScreen dispatch={dispatch} />;
    }
    if (state.phase === "clubSelect") {
      return <ClubSelectScreen dispatch={dispatch} />;
    }
    if (state.phase === "founding") {
      return <FoundingScreen state={state} dispatch={dispatch} />;
    }
    if (state.phase === "foundingMap") {
      return <FoundingMap state={state} dispatch={dispatch} />;
    }
    return <Dashboard state={state} dispatch={dispatch} />;
  }
}
