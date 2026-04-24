// Type declarations for static audio/image assets resolved by Metro bundler.
declare module '*.mp3' {
  const source: number;
  export default source;
}

declare module '*.wav' {
  const source: number;
  export default source;
}

declare module '*.m4a' {
  const source: number;
  export default source;
}
