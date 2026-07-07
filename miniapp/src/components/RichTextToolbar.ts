export function RichTextToolbar(): string {
  const tools = [
    ['bold', 'B'],
    ['italic', 'I'],
    ['underline', 'U'],
    ['strike', 'S'],
    ['code', '{}'],
    ['quote', '❝'],
    ['spoiler', 'Spoiler'],
    ['divider', '—']
  ];

  return `
    <div class="toolbar" aria-label="Formatting toolbar">
      ${tools.map(([action, label]) => `<button type="button" data-format="${action}">${label}</button>`).join('')}
    </div>
  `;
}
