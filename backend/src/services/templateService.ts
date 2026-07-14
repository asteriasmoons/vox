import type { Template, TemplateCategory } from '../types/post.js';
import { createId } from '../utils/ids.js';
import { readJsonFile, writeJsonFile } from './storageService.js';

const fileName = 'templates.json';

function makeStarter(name: string, category: TemplateCategory, text: string, buttons: Template['buttons']): Template {
  const now = new Date().toISOString();
  return {
    id: `builtin_${category}`,
    name,
    category,
    text,
    buttons,
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now
  };
}

function getBuiltInTemplates(): Template[] {
  return [
    makeStarter('Announcement', 'announcement',
      '<b>Important Announcement</b>\n\nWe have some exciting news to share with our community!\n\nStay tuned for more details coming soon. We appreciate your continued support and can\'t wait to share what we\'ve been working on.',
      [[{ text: 'Learn More', url: 'https://example.com' }]]
    ),
    makeStarter('Product Update', 'update',
      '<b>Product Update v2.5</b>\n\nHere\'s what\'s new:\n\n- Redesigned dashboard with improved navigation\n- Dark mode support across all pages\n- Performance improvements up to 40% faster\n\nUpdate now to enjoy these improvements!',
      [[{ text: 'Update Now', url: 'https://example.com/update' }, { text: 'Changelog', url: 'https://example.com/changelog' }]]
    ),
    makeStarter('Patch Notes', 'patch-notes',
      '<b>Patch Notes - v1.4.2</b>\n\n<b>Bug Fixes:</b>\n- Fixed crash on startup for some users\n- Resolved notification delivery delays\n- Fixed layout issues on smaller screens\n\n<b>Improvements:</b>\n- Reduced memory usage by 15%\n- Faster image loading in gallery view',
      [[{ text: 'Download Patch', url: 'https://example.com/download' }]]
    ),
    makeStarter('Major Release', 'release',
      '<b>Introducing Version 3.0</b>\n\nAfter months of development, we\'re thrilled to announce our biggest release yet!\n\n<b>Highlights:</b>\n- Completely rebuilt from the ground up\n- New AI-powered features\n- Cross-platform sync\n- Collaborative workspaces\n\nThis is a free upgrade for all existing users.',
      [[{ text: 'Get Started', url: 'https://example.com/v3' }, { text: 'Watch Demo', url: 'https://example.com/demo' }]]
    ),
    makeStarter('Scheduled Maintenance', 'maintenance',
      '<b>Scheduled Maintenance Notice</b>\n\nWe will be performing scheduled maintenance on <b>Saturday, March 15th</b> from <b>2:00 AM to 6:00 AM UTC</b>.\n\nDuring this time, the service may be temporarily unavailable. We apologize for any inconvenience.\n\nAll data will be preserved and no action is required on your part.',
      [[{ text: 'Status Page', url: 'https://status.example.com' }]]
    ),
    makeStarter('Giveaway', 'giveaway',
      '<b>GIVEAWAY TIME!</b>\n\nWe\'re giving away <b>3 Premium Subscriptions</b> (1 year each) to celebrate reaching 10,000 members!\n\n<b>How to enter:</b>\n1. Be a member of this channel\n2. Share this post with a friend\n3. Comment your favorite feature\n\n<b>Winners announced:</b> Friday at 8 PM UTC\n\nGood luck everyone!',
      [[{ text: 'Enter Giveaway', url: 'https://example.com/giveaway' }]]
    ),
    makeStarter('Contest', 'contest',
      '<b>Creative Contest - Show Us Your Setup!</b>\n\nWe want to see how you use our product in your daily workflow.\n\n<b>Prizes:</b>\n- 1st Place: $500 gift card\n- 2nd Place: $250 gift card\n- 3rd Place: $100 gift card\n\n<b>Rules:</b>\n- Submit by March 30th\n- Original content only\n- Tag us in your submission\n\nMay the best setup win!',
      [[{ text: 'Submit Entry', url: 'https://example.com/contest' }, { text: 'Contest Rules', url: 'https://example.com/rules' }]]
    ),
    makeStarter('News Update', 'news',
      '<b>Weekly News Roundup</b>\n\nHere\'s what happened this week:\n\n<b>Industry News:</b>\n- Major partnership announced with leading tech company\n- New regulations coming into effect next quarter\n\n<b>Community Updates:</b>\n- Community meetup scheduled for next month\n- New tutorial series launching Monday\n\nStay informed and stay ahead!',
      [[{ text: 'Read Full Article', url: 'https://example.com/news' }]]
    ),
    makeStarter('Beta Invitation', 'beta',
      '<b>You\'re Invited to Our Beta Program!</b>\n\nWe\'re looking for early adopters to test our upcoming features before they go live.\n\n<b>What you\'ll get:</b>\n- Early access to new features\n- Direct line to our development team\n- Exclusive beta tester badge\n- Influence the final product\n\n<b>Spots are limited</b> - sign up today!',
      [[{ text: 'Join Beta', url: 'https://example.com/beta' }, { text: 'Learn More', url: 'https://example.com/beta-info' }]]
    ),
    makeStarter('Reminder', 'reminder',
      '<b>Friendly Reminder</b>\n\nDon\'t forget - our live event starts <b>tomorrow at 3:00 PM UTC</b>!\n\nMake sure to:\n- Save the date in your calendar\n- Prepare any questions you\'d like to ask\n- Share with friends who might be interested\n\nWe look forward to seeing you there!',
      [[{ text: 'Add to Calendar', url: 'https://example.com/calendar' }]]
    )
  ];
}

export async function getTemplates(): Promise<Template[]> {
  const templates = await readJsonFile<Template[]>(fileName, []);

  if (templates.length === 0) {
    const starters = getBuiltInTemplates();
    await writeJsonFile(fileName, starters);
    return starters;
  }

  return templates;
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  const templates = await getTemplates();
  return templates.find((item) => item.id === id);
}

export async function saveTemplate(template: Partial<Template>): Promise<Template> {
  const templates = await getTemplates();
  const now = new Date().toISOString();
  const full: Template = {
    id: template.id ?? createId('tmpl'),
    name: template.name ?? 'Untitled Template',
    category: template.category ?? 'custom',
    text: template.text ?? '',
    buttons: template.buttons ?? [],
    isFavorite: template.isFavorite,
    isBuiltIn: template.isBuiltIn,
    createdAt: template.createdAt ?? now,
    updatedAt: now
  };

  const index = templates.findIndex((item) => item.id === full.id);
  if (index >= 0) templates[index] = full;
  else templates.unshift(full);

  await writeJsonFile(fileName, templates);
  return full;
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean; error?: string }> {
  const templates = await getTemplates();
  const target = templates.find((item) => item.id === id);

  if (!target) return { ok: false, error: 'Template not found' };
  if (target.isBuiltIn) return { ok: false, error: 'Cannot delete built-in templates' };

  const filtered = templates.filter((item) => item.id !== id);
  await writeJsonFile(fileName, filtered);
  return { ok: true };
}

export async function getStarterTemplates(): Promise<Template[]> {
  return getBuiltInTemplates();
}
