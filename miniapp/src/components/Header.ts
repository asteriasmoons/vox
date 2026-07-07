export function Header(title: string, subtitle: string): string {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Vox Command</p>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="orb-logo">V</div>
    </header>
  `;
}
