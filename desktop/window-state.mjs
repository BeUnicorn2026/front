export const homeWindowState = Object.freeze({
  width: 440,
  height: 820,
  minWidth: 380,
  minHeight: 640,
  maxWidth: 520
});

export function meetingWindowBounds(workArea) {
  const margin = 24;
  const width = Math.min(440, Math.max(380, workArea.width - margin * 2));
  const height = Math.min(820, Math.max(640, workArea.height - margin * 2));
  return {
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + margin,
    width,
    height
  };
}
