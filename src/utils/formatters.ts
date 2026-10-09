import { Bookmark, DiarizedTurn, SessionData } from '../types/recorder';

export function formatSeconds(totalSeconds: number): string {
  const floorSec = Math.floor(Math.max(0, totalSeconds));
  const hours = Math.floor(floorSec / 3600);
  const minutes = Math.floor((floorSec % 3600) / 60);
  const seconds = floorSec % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function exportBookmarksCsv(bookmarks: Bookmark[], sessionTitle: string): void {
  const headers = ['Timestamp', 'Category', 'Speaker', 'Note'];
  const rows = bookmarks.map((b) => [
    `"${b.formattedTime}"`,
    `"${b.category}"`,
    `"${b.speakerName || 'Unassigned'}"`,
    `"${b.note.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${slugify(sessionTitle)}_bookmarks.csv`);
}

export function exportTranscriptMarkdown(
  session: SessionData,
  turns: DiarizedTurn[],
  recap?: any
): void {
  let md = `# ${session.campaignName || 'Campaign'} — Session #${session.sessionNumber}: ${
    session.title
  }\n`;
  md += `*Recorded on ${new Date(session.createdAt).toLocaleDateString()} | Duration: ${formatSeconds(
    session.elapsedSeconds
  )}*\n\n`;

  if (recap) {
    md += `## 📜 Session Summary\n${recap.executiveSummary || ''}\n\n`;

    if (recap.narrativeArc && recap.narrativeArc.length > 0) {
      md += `### ⚔️ Narrative Arc\n`;
      recap.narrativeArc.forEach((item: string) => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    }

    if (recap.lootAcquired && recap.lootAcquired.length > 0) {
      md += `### 💎 Loot & Artifacts\n`;
      recap.lootAcquired.forEach((item: string) => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    }

    if (recap.unresolvedHooks && recap.unresolvedHooks.length > 0) {
      md += `### ❓ Unresolved Plot Hooks\n`;
      recap.unresolvedHooks.forEach((item: string) => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    }
  }

  md += `## 🔖 Timestamped Bookmarks\n`;
  if (session.bookmarks.length === 0) {
    md += `*No bookmarks recorded.*\n\n`;
  } else {
    session.bookmarks.forEach((b) => {
      md += `- **[${b.formattedTime}]** \`[${b.category.toUpperCase()}]\` ${
        b.speakerName ? `(${b.speakerName}) ` : ''
      }${b.note}\n`;
    });
    md += `\n`;
  }

  md += `## 🎙️ Diarized Transcript\n`;
  if (turns.length === 0) {
    md += `*No transcript turns available yet.*\n`;
  } else {
    turns.forEach((t) => {
      const timeStr = `[${formatSeconds(t.startTime)} - ${formatSeconds(t.endTime)}]`;
      const oocTag = t.isOutOfCharacter ? ' *(OOC)*' : '';
      md += `**${timeStr} ${t.speakerName} (${t.role}):**${oocTag} ${t.text}\n\n`;
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  downloadBlob(blob, `${slugify(session.title)}_chronicle.md`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
