export function formatNurseNames(
  nurses: { first_name: string; last_name: string }[],
): string | null {
  const names = nurses.map(nurse => `${nurse.first_name} ${nurse.last_name}`.trim()).filter(Boolean);
  return names.length > 0 ? names.join(', ') : null;
}
