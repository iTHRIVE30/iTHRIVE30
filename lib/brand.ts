// The iTHRIVE30 logo lockups, in one place.
//
// All three lockups are drawn on the same 2000x2000 canvas with the gold mark in an
// identical position - only the tagline line underneath differs. That's what makes the
// loading screen's cross-fade work: the mark holds still while the tagline changes.
//
// Each tagline exists in a white and a black cut. The tagline is the only part that
// changes colour - the mark itself is gold in every variant - so pick by what the logo is
// sitting on, not by app theme.

export type LogoTone = 'onDark' | 'onLight';

/** No tagline. Safe on any background. */
export const LOGO_MARK = require('../assets/images/iTHRIVE30.png');

/** "YOUR NEXT BEST SELF IS HERE" */
export const LOGO_IS_HERE: Record<LogoTone, number> = {
  onDark: require('../assets/images/iTHRIVE30.isHERE.WH.png'),
  onLight: require('../assets/images/iTHRIVE30.isHEREBLK.png'),
};

/** "CHANGE | GROW | EVOLVE" */
export const LOGO_CGE: Record<LogoTone, number> = {
  onDark: require('../assets/images/iTHRIVE30.CGE.WH.png'),
  onLight: require('../assets/images/iTHRIVE30.CGE.BLK.png'),
};

/**
 * The three lockups in the order the loading screen reveals them: mark, then the promise,
 * then the method.
 */
export function logoSequence(tone: LogoTone = 'onDark'): number[] {
  return [LOGO_MARK, LOGO_IS_HERE[tone], LOGO_CGE[tone]];
}
