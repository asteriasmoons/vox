# Vox

Vox is a TypeScript-first Telegram management project with a Node/Express backend and a Telegram Mini App frontend.

## File tree

```text
Vox/
├── .gitignore
├── README.md
├── shared/
│   └── post.ts
├── backend/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── bot/
│       │   ├── telegramClient.ts
│       │   └── telegramService.ts
│       ├── data/
│       │   ├── channels.json
│       │   ├── drafts.json
│       │   └── posts.json
│       ├── routes/
│       │   ├── channels.ts
│       │   ├── drafts.ts
│       │   └── posts.ts
│       ├── services/
│       │   ├── channelService.ts
│       │   ├── postService.ts
│       │   ├── scheduleService.ts
│       │   └── storageService.ts
│       ├── types/
│       │   └── post.ts
│       └── utils/
│           ├── env.ts
│           └── ids.ts
└── miniapp/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.ts
        ├── router.ts
        ├── vite-env.d.ts
        ├── components/
        │   ├── BottomNav.ts
        │   ├── ButtonBuilder.ts
        │   ├── GlassCard.ts
        │   ├── Header.ts
        │   ├── PostPreview.ts
        │   └── RichTextToolbar.ts
        ├── pages/
        │   ├── ChannelsPage.ts
        │   ├── DashboardPage.ts
        │   ├── DraftsPage.ts
        │   ├── PostEditorPage.ts
        │   └── SettingsPage.ts
        ├── styles/
        │   ├── base.css
        │   ├── components.css
        │   ├── editor.css
        │   └── layout.css
        ├── types/
        │   ├── post.ts
        │   └── telegram.ts
        └── utils/
            ├── api.ts
            ├── dom.ts
            ├── formatting.ts
            └── telegram.ts
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```env
PORT=3000
TELEGRAM_BOT_TOKEN=your_real_bot_token
MINIAPP_ORIGIN=http://localhost:5173
```

Edit `backend/src/data/channels.json` and replace `@your_channel_username` with your real Telegram channel username or numeric channel ID.

Your bot must be added to the Telegram channel as an admin with permission to post messages.

Run the backend:

```bash
npm run dev
```

Build the backend:

```bash
npm run build
npm start
```

## Mini App setup

```bash
cd miniapp
npm install
```

Optional local API config:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Run the Mini App:

```bash
npm run dev
```

Build the Mini App:

```bash
npm run build
```

## Telegram Mini App deployment notes

Telegram Mini Apps must be hosted over HTTPS when connected to BotFather. For local development, use a tunnel such as Cloudflare Tunnel, ngrok, or another HTTPS tunnel, then set that URL in BotFather.

## Payload shape

The editor prepares payloads like this:

```ts
{
  title: string,
  channelId: string,
  text: string,
  parseMode: 'HTML',
  buttons: [
    [
      { text: string, url: string }
    ]
  ],
  status: 'draft' | 'scheduled' | 'posted',
  createdAt: string,
  updatedAt: string
}
```
