// Tells TypeScript what require('...') of these file types returns (a Metro
// asset module id, the same mechanism used for images). Add a new block here
// any time metro.config.js gets a new extension added to it.

declare module '*.pdf' {
  const value: number;
  export default value;
}
declare module '*.docx' {
  const value: number;
  export default value;
}
declare module '*.doc' {
  const value: number;
  export default value;
}
declare module '*.pptx' {
  const value: number;
  export default value;
}
declare module '*.xlsx' {
  const value: number;
  export default value;
}
declare module '*.zip' {
  const value: number;
  export default value;
}

// Images (gallery category). Metro treats these as assets by default - they need no
// metro.config.js entry, only this declaration so require() is typed.
declare module '*.jpg' {
  const value: number;
  export default value;
}
declare module '*.jpeg' {
  const value: number;
  export default value;
}
