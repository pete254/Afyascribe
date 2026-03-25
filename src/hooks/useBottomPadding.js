// src/hooks/useBottomPadding.js
// Returns the correct bottom padding to clear Android nav buttons / iPhone home bar
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Usage:
 *   const bottomPadding = useBottomPadding();
 *
 *   // On FlatList:
 *   contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
 *
 *   // On ScrollView:
 *   contentContainerStyle={{ paddingBottom: bottomPadding }}
 *
 *   // On a fixed bottom button:
 *   style={{ marginBottom: bottomPadding }}
 */
export function useBottomPadding(extra = 24) {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8) + extra;
}

/**
 * Returns raw insets in case you need full control
 */
export function useInsets() {
  return useSafeAreaInsets();
}