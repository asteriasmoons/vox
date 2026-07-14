import { Router } from 'express';
import { getDrafts, getPosts, getScheduledPosts } from '../services/postService.js';
import type { AnalyticsSnapshot, PostPayload } from '../types/post.js';

export const analyticsRouter = Router();

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function computeWeeklyChart(posts: PostPayload[]): AnalyticsSnapshot['weeklyChart'] {
  const counts = new Map<number, number>();
  for (let i = 0; i < 7; i++) counts.set(i, 0);

  for (const post of posts) {
    const day = new Date(post.createdAt).getDay();
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return dayNames.map((name, i) => ({ day: name, count: counts.get(i) ?? 0 }));
}

function computeMonthlyChart(posts: PostPayload[]): AnalyticsSnapshot['monthlyChart'] {
  const counts = new Map<number, number>();
  for (let i = 0; i < 12; i++) counts.set(i, 0);

  for (const post of posts) {
    const month = new Date(post.createdAt).getMonth();
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return monthNames.map((name, i) => ({ month: name, count: counts.get(i) ?? 0 }));
}

function computeHeatmap(posts: PostPayload[]): AnalyticsSnapshot['heatmap'] {
  const map = new Map<string, number>();

  for (const post of posts) {
    const d = new Date(post.createdAt);
    const key = `${d.getDay()}-${d.getHours()}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const result: AnalyticsSnapshot['heatmap'] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = map.get(`${day}-${hour}`) ?? 0;
      if (count > 0) result.push({ day, hour, count });
    }
  }

  return result;
}

function computeStreak(posts: PostPayload[]): number {
  if (posts.length === 0) return 0;

  const dates = [...new Set(posts.map((p) => new Date(p.createdAt).toISOString().slice(0, 10)))].sort().reverse();
  let streak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) streak++;
    else break;
  }

  return streak;
}

function findBestDay(posts: PostPayload[]): string {
  if (posts.length === 0) return dayNames[0];
  const counts = new Map<number, number>();
  for (const post of posts) {
    const day = new Date(post.createdAt).getDay();
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  for (const [day, count] of counts) {
    if (count > bestCount) { best = day; bestCount = count; }
  }
  return dayNames[best];
}

function findBestHour(posts: PostPayload[]): number {
  if (posts.length === 0) return 12;
  const counts = new Map<number, number>();
  for (const post of posts) {
    const hour = new Date(post.createdAt).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  let best = 12;
  let bestCount = 0;
  for (const [hour, count] of counts) {
    if (count > bestCount) { best = hour; bestCount = count; }
  }
  return best;
}

analyticsRouter.get('/', async (_request, response, next) => {
  try {
    const [posts, drafts, scheduled] = await Promise.all([
      getPosts(),
      getDrafts(),
      getScheduledPosts()
    ]);

    const totalPosts = posts.length;
    const totalDrafts = drafts.length;
    const totalScheduled = scheduled.length;
    const totalPublished = posts.filter((p) => p.status === 'posted').length;

    // Mock engagement metrics with seeded random based on post count
    const seed = totalPosts + totalDrafts + 1;
    const totalViews = totalPublished * (150 + (seed * 37) % 350);
    const averageViews = totalPublished > 0 ? Math.round(totalViews / totalPublished) : 0;
    const buttonClicks = Math.round(totalViews * (0.02 + ((seed * 13) % 8) / 100));
    const engagement = totalViews > 0 ? Math.round((buttonClicks / totalViews) * 10000) / 100 : 0;

    const allPosts = [...posts, ...scheduled];
    const publishingStreak = computeStreak(posts);
    const bestDay = findBestDay(allPosts);
    const bestHour = findBestHour(allPosts);
    const weeklyChart = computeWeeklyChart(allPosts);
    const monthlyChart = computeMonthlyChart(allPosts);
    const heatmap = computeHeatmap(allPosts);

    const snapshot: AnalyticsSnapshot = {
      totalPosts,
      totalDrafts,
      totalScheduled,
      totalPublished,
      totalViews,
      averageViews,
      buttonClicks,
      engagement,
      publishingStreak,
      bestDay,
      bestHour,
      weeklyChart,
      monthlyChart,
      heatmap
    };

    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});
