import type { Member } from '../types';

export function exportPDF(
  members: Member[],
  projectName: string
): string {
  // PDF export stubbed for Step 1 rebuild.
  const blob = new Blob([`FabDraw Export: ${projectName}\n${members.length} members`], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}
