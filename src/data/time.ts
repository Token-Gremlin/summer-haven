export const DAYLIGHT = [
  { label: 'Afternoon', icon: '☀', time: 0.05, description: 'Long days, open windows' },
  { label: 'Golden hour', icon: '◒', time: 0.38, description: 'Everything turns to honey' },
  { label: 'Sunset', icon: '◓', time: 0.67, description: 'One last light on the rooftops' },
  { label: 'Blue hour', icon: '☽', time: 0.86, description: 'The village lights come on' },
  { label: 'Evening', icon: '✦', time: 1, description: 'Crickets and familiar windows' },
] as const;
export const clampTime = (t: number) => (Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0.08);
export function formatTime(t: number) {
  const minutes = 14 * 60 + Math.round(clampTime(t) * 390);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}
