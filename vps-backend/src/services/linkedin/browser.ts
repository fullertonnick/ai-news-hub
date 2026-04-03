import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../logger';

const log = createLogger('linkedin-browser');

const COOKIES_PATH = process.env.LINKEDIN_COOKIES_PATH || './data/linkedin-cookies.json';

// Randomized delays to mimic human behavior
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise(r => setTimeout(r, ms));
}

export class LinkedInBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async launch(): Promise<void> {
    if (this.browser) return;
    log.info('Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });
    log.info('Browser launched');
  }

  async createContext(): Promise<void> {
    if (!this.browser) await this.launch();

    // Load saved cookies if they exist
    const cookies = this.loadCookies();

    this.context = await this.browser!.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/Chicago',
    });

    if (cookies.length > 0) {
      await this.context.addCookies(cookies);
      log.info(`Loaded ${cookies.length} saved cookies`);
    }

    this.page = await this.context.newPage();

    // Anti-detection: override navigator.webdriver
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      const url = this.page.url();
      return !url.includes('/login') && !url.includes('/authwall');
    } catch {
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!this.page) await this.createContext();
    log.info(`Logging in as ${email}...`);

    await this.page!.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
    await randomDelay(1000, 2000);

    // Type email with human-like speed
    await this.page!.fill('#username', '');
    await this.page!.type('#username', email, { delay: 50 + Math.random() * 80 });
    await randomDelay(500, 1000);

    // Type password
    await this.page!.fill('#password', '');
    await this.page!.type('#password', password, { delay: 40 + Math.random() * 60 });
    await randomDelay(500, 1500);

    // Click sign in
    await this.page!.click('button[type="submit"]');
    await randomDelay(3000, 5000);

    // Check if login succeeded
    const url = this.page!.url();
    if (url.includes('/checkpoint') || url.includes('/challenge')) {
      log.warn('LinkedIn is requesting verification (CAPTCHA/2FA). Manual intervention needed.');
      return false;
    }

    if (url.includes('/feed') || url.includes('/mynetwork')) {
      log.info('Login successful');
      await this.saveCookies();
      return true;
    }

    log.error(`Login failed. Current URL: ${url}`);
    return false;
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  async viewProfile(profileUrl: string): Promise<{ name: string; headline: string; company: string; connectionDegree: string }> {
    if (!this.page) throw new Error('Browser not initialized');
    await randomDelay(2000, 5000);
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await randomDelay(2000, 4000);

    // Scroll down to simulate reading
    await this.page.evaluate(() => window.scrollBy(0, 400));
    await randomDelay(1500, 3000);

    const name = await this.page.$eval('h1', el => el.textContent?.trim() || '').catch(() => '');
    const headline = await this.page.$eval('.text-body-medium', el => el.textContent?.trim() || '').catch(() => '');
    const company = await this.page.$eval('[aria-label*="Current company"]', el => el.textContent?.trim() || '').catch(() => '');
    const degree = await this.page.$eval('.dist-value', el => el.textContent?.trim() || '').catch(() => '');

    log.info(`Viewed profile: ${name} (${headline})`);
    return { name, headline, company, connectionDegree: degree };
  }

  async sendConnectionRequest(profileUrl: string, note?: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await randomDelay(2000, 4000);

    // Look for Connect button
    const connectBtn = await this.page.$('button:has-text("Connect"), button[aria-label*="connect" i]');
    if (!connectBtn) {
      // Try "More" dropdown
      const moreBtn = await this.page.$('button:has-text("More")');
      if (moreBtn) {
        await moreBtn.click();
        await randomDelay(500, 1000);
        const connectInMenu = await this.page.$('div[role="menuitem"]:has-text("Connect")');
        if (connectInMenu) {
          await connectInMenu.click();
        } else {
          log.warn(`No Connect option found for ${profileUrl}`);
          return false;
        }
      } else {
        log.warn(`No Connect button found for ${profileUrl}`);
        return false;
      }
    } else {
      await connectBtn.click();
    }

    await randomDelay(1000, 2000);

    // Add note if provided
    if (note) {
      const addNoteBtn = await this.page.$('button:has-text("Add a note")');
      if (addNoteBtn) {
        await addNoteBtn.click();
        await randomDelay(500, 1000);
        const textarea = await this.page.$('textarea[name="message"]');
        if (textarea) {
          await textarea.type(note, { delay: 30 + Math.random() * 50 });
          await randomDelay(500, 1500);
        }
      }
    }

    // Click Send
    const sendBtn = await this.page.$('button:has-text("Send"), button[aria-label="Send now"]');
    if (sendBtn) {
      await sendBtn.click();
      await randomDelay(1000, 2000);
      log.info(`Connection request sent to ${profileUrl}${note ? ' (with note)' : ''}`);
      return true;
    }

    log.warn(`Could not send connection request to ${profileUrl}`);
    return false;
  }

  async sendMessage(profileUrl: string, message: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await randomDelay(2000, 4000);

    const msgBtn = await this.page.$('button:has-text("Message")');
    if (!msgBtn) {
      log.warn(`No Message button — may not be connected to ${profileUrl}`);
      return false;
    }

    await msgBtn.click();
    await randomDelay(1500, 3000);

    // Type message in the messaging overlay
    const msgBox = await this.page.$('div[role="textbox"][contenteditable="true"]');
    if (!msgBox) {
      log.warn('Message box not found');
      return false;
    }

    await msgBox.click();
    await randomDelay(300, 600);
    await this.page.keyboard.type(message, { delay: 25 + Math.random() * 40 });
    await randomDelay(1000, 2000);

    // Send
    const sendBtn = await this.page.$('button:has-text("Send"), button[type="submit"]');
    if (sendBtn) {
      await sendBtn.click();
      await randomDelay(1000, 2000);
      log.info(`Message sent to ${profileUrl}`);
      return true;
    }

    log.warn(`Could not send message to ${profileUrl}`);
    return false;
  }

  async followProfile(profileUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await randomDelay(2000, 4000);

    const followBtn = await this.page.$('button:has-text("Follow")');
    if (followBtn) {
      await followBtn.click();
      await randomDelay(1000, 2000);
      log.info(`Followed ${profileUrl}`);
      return true;
    }
    log.warn(`No Follow button found for ${profileUrl}`);
    return false;
  }

  async endorseSkill(profileUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(profileUrl + '/details/skills/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await randomDelay(2000, 4000);

    // Find first unendorsed skill
    const endorseBtn = await this.page.$('button[aria-label*="Endorse"]');
    if (endorseBtn) {
      await endorseBtn.click();
      await randomDelay(1000, 2000);
      log.info(`Endorsed a skill on ${profileUrl}`);
      return true;
    }
    log.warn(`No endorsable skills found for ${profileUrl}`);
    return false;
  }

  async likeRecentPost(profileUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(profileUrl + '/recent-activity/all/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await randomDelay(2000, 4000);

    const likeBtn = await this.page.$('button[aria-label*="Like"]:not([aria-pressed="true"])');
    if (likeBtn) {
      await likeBtn.click();
      await randomDelay(1000, 2000);
      log.info(`Liked a post from ${profileUrl}`);
      return true;
    }
    log.warn(`No likeable posts found for ${profileUrl}`);
    return false;
  }

  // ─── Search & Scrape ────────────────────────────────────────────────────────

  async scrapeSearchResults(searchUrl: string, maxResults = 50): Promise<{ profileUrl: string; name: string; headline: string; company: string }[]> {
    if (!this.page) throw new Error('Browser not initialized');
    const results: { profileUrl: string; name: string; headline: string; company: string }[] = [];

    let page = 1;
    while (results.length < maxResults) {
      const url = searchUrl.includes('?') ? `${searchUrl}&page=${page}` : `${searchUrl}?page=${page}`;
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await randomDelay(2000, 4000);

      const items = await this.page.$$eval('.reusable-search__result-container', els =>
        els.map(el => ({
          profileUrl: (el.querySelector('a[href*="/in/"]') as HTMLAnchorElement)?.href?.split('?')[0] || '',
          name: el.querySelector('.entity-result__title-text a span[aria-hidden="true"]')?.textContent?.trim() || '',
          headline: el.querySelector('.entity-result__primary-subtitle')?.textContent?.trim() || '',
          company: el.querySelector('.entity-result__secondary-subtitle')?.textContent?.trim() || '',
        }))
      );

      if (items.length === 0) break;
      results.push(...items.filter(i => i.profileUrl));
      if (items.length < 10) break; // last page
      page++;
      await randomDelay(3000, 6000);
    }

    log.info(`Scraped ${results.length} profiles from search`);
    return results.slice(0, maxResults);
  }

  // ─── Cookie Management ──────────────────────────────────────────────────────

  private async saveCookies(): Promise<void> {
    if (!this.context) return;
    const cookies = await this.context.cookies();
    const dir = path.dirname(COOKIES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    log.info(`Saved ${cookies.length} cookies`);
  }

  private loadCookies(): any[] {
    if (!fs.existsSync(COOKIES_PATH)) return [];
    try {
      return JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.page = null;
    this.context = null;
    this.browser = null;
    log.info('Browser closed');
  }
}

// Singleton
let instance: LinkedInBrowser | null = null;
export function getLinkedInBrowser(): LinkedInBrowser {
  if (!instance) instance = new LinkedInBrowser();
  return instance;
}
