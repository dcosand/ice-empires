export type SceneAudioTrack = {
  name: string;
  url: string;
};

export const PRACTICE_SCENE_TRACKS: SceneAudioTrack[] = [
  { name: "Practice 01", url: "/assets/audio/scenes/practice-01.mp3" },
  { name: "Practice 02", url: "/assets/audio/scenes/practice-02.mp3" },
  { name: "Practice 03", url: "/assets/audio/scenes/practice-03.mp3" },
  { name: "Practice 04", url: "/assets/audio/scenes/practice-04.mp3" },
  { name: "Practice 05", url: "/assets/audio/scenes/practice-05.mp3" },
];

// Dedicated bed for the tryout / new-signing flow (distinct from practice
// ambience so tryouts always get their own theme). MP3 for consistency with the
// rest of the music/scene beds (the source was a 30 MB WAVE_FORMAT_EXTENSIBLE
// WAV browsers decoded unreliably, which stalled the first play → silent
// tryouts; the compressed MP3 avoids both problems).
export const TRYOUT_SCENE_TRACK: SceneAudioTrack = {
  name: "Tryouts / New Signing",
  url: "/assets/audio/scenes/tryout-signing.mp3",
};

export function randomPracticeSceneTrack(): SceneAudioTrack {
  return (
    PRACTICE_SCENE_TRACKS[Math.floor(Math.random() * PRACTICE_SCENE_TRACKS.length)] ??
    PRACTICE_SCENE_TRACKS[0]
  );
}
