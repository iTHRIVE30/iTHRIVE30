import { KeyboardAvoidingView, Modal, Platform, StyleSheet, type ModalProps } from 'react-native';
import type { ReactNode } from 'react';

/**
 * A Modal whose contents get out of the keyboard's way. Use this for ANY modal containing
 * a text field.
 *
 * WHY THIS EXISTS AS A COMPONENT: Android does not apply `adjustResize` inside a Modal. A
 * plain `<Modal>` with a TextInput therefore gets no keyboard avoidance whatsoever from the
 * platform, and the field sits behind the keyboard with nothing to push it up. It is not a
 * styling mistake and it is not obvious from reading the JSX, which is why it has now been
 * found twice - once on a challenge day, once on Acknowledge Yourself. Reaching for this
 * instead of `Modal` is the fix that stays fixed.
 *
 * Note the asymmetry with `KeyboardAwareScrollView`: on a NORMAL screen Android already
 * resizes the window, so a KeyboardAvoidingView there double-compensates and the layout
 * jumps. Inside a Modal it is required. Same app, opposite answers - hence two components.
 *
 * `behavior`: 'padding' on iOS and 'height' on Android both shrink the available space, so
 * a sheet sized with a percentage `maxHeight` resolves against what is left and its own
 * ScrollView takes over.
 */
export default function KeyboardAwareModal({
  children,
  backdropStyle,
  ...modalProps
}: ModalProps & {
  children: ReactNode;
  /** Style for the full-screen container behind the sheet - usually the scrim. */
  backdropStyle?: object;
}) {
  return (
    <Modal transparent {...modalProps}>
      <KeyboardAvoidingView
        style={[styles.fill, backdropStyle]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {children}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
