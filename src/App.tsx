import { useReducer } from "react";
import { gameReducer } from "./engine/gameReducer";
import { createInitialState } from "./engine/initialState";
import { LandingScreen } from "./components/LandingScreen";
import { FoundingScreen } from "./components/FoundingScreen";
import { Dashboard } from "./components/Dashboard";

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  if (state.phase === "landing") {
    return <LandingScreen dispatch={dispatch} />;
  }
  if (state.phase === "founding") {
    return <FoundingScreen dispatch={dispatch} />;
  }
  return <Dashboard state={state} dispatch={dispatch} />;
}
