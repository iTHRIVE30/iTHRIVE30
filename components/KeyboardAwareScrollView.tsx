import { forwardRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

/**
 * The app's scrolling screen container. Use this instead of a bare `ScrollView` on any
 * screen that takes typing.
 *
 * THE PROBLEM IT SOLVES: a text field near the bottom of a screen sits behind the keyboard,
 * so you cannot see what you are typing. It happened on Day 3 of the challenges, in the
 * third box, and the same hole existed on Today, My Journey, Progress, Wins and Settings -
 * none of them had any keyboard handling at all.
 *
 * WHY NOT KeyboardAvoidingView: on a normal screen Android already resizes the window
 * (`adjustResize`), so wrapping in a KAV double-compensates and the layout jumps. Expo's
 * own guidance is to pass no behavior on Android for exactly that reason. iOS does not
 * resize, so it needs something - and `automaticallyAdjustKeyboardInsets` is that
 * something: the ScrollView adds its own bottom inset and scrolls the focused field into
 * view, with no wrapper and no layout jump.
 *
 * A MODAL IS THE EXCEPTION. Android does NOT apply `adjustResize` inside a `Modal`, so a
 * sheet with inputs gets no avoidance from the platform at all and does need a
 * KeyboardAvoidingView. That case is handled where it occurs, in challenges.tsx - don't
 * reach for this component there.
 *
 * `contentContainerStyle` passed in is merged over the defaults, so a caller can still set
 * its own padding; the generous default `paddingBottom` is what gives the last field room
 * to scroll clear of the keyboard.
 */
const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAwareScrollView({ contentContainerStyle, ...props }, ref) {
    return (
      <ScrollView
        ref={ref}
        // iOS: insets the scroll view by the keyboard and scrolls the focused input up.
        // Android: a no-op, which is correct - the window has already resized.
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        // Taps on buttons land first time while the keyboard is up, rather than being
        // swallowed by the dismiss.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[{ padding: 20, paddingBottom: 120 }, contentContainerStyle]}
        {...props}
      />
    );
  }
);

export default KeyboardAwareScrollView;
