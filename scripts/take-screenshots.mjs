import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:3099";
const MOBILE_VP = { width: 390, height: 844 };
const DESKTOP_VP = { width: 1440, height: 900 };

const MOBILE_DIR = join(process.cwd(), "screenshots", "mobile-audit");
const DESKTOP_DIR = join(process.cwd(), "screenshots", "desktop-baseline");

mkdirSync(MOBILE_DIR, { recursive: true });
mkdirSync(DESKTOP_DIR, { recursive: true });

const manifest = [];

async function waitForApp(page) {
  // Wait for Next.js to hydrate and data to load
  await page.waitForSelector("header", { timeout: 30000 });
  // Wait a bit for SWR data fetching
  await new Promise((r) => setTimeout(r, 3000));
}

async function screenshot(page, name, dir, viewport) {
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  manifest.push({
    filename: `${name}.png`,
    route: page.url().replace(BASE_URL, "") || "/",
    viewport: `${viewport.width}x${viewport.height}`,
    directory: dir.includes("mobile") ? "mobile-audit" : "desktop-baseline",
  });
  console.log(`  ✓ ${name} (${viewport.width}x${viewport.height})`);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ═══════════════════════════════════════════
    // MOBILE SCREENSHOTS
    // ═══════════════════════════════════════════
    console.log("\n📱 Taking MOBILE screenshots (390x844)...\n");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport(MOBILE_VP);
    await mobilePage.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await waitForApp(mobilePage);

    // 1. Main dashboard - Overview mode (default)
    await screenshot(mobilePage, "dashboard-overview-mobile", MOBILE_DIR, MOBILE_VP);

    // 2. Click "Ranked List" toggle to see ranked list view
    const rankedListBtn = await mobilePage.evaluateHandle(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim() === "Ranked List") return b;
      }
      return null;
    });
    if (rankedListBtn && (await rankedListBtn.evaluate((el) => el !== null))) {
      await rankedListBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
      await screenshot(mobilePage, "dashboard-ranked-list-mobile", MOBILE_DIR, MOBILE_VP);
    }

    // 3. Expand the first weekend card if in ranked list view
    const weekendCards = await mobilePage.$$('[class*="rounded-lg"][class*="border"]');
    if (weekendCards.length > 0) {
      // Click the first card's button to expand
      const firstCardBtn = await weekendCards[0].$("button");
      if (firstCardBtn) {
        await firstCardBtn.click();
        await new Promise((r) => setTimeout(r, 500));
        await screenshot(mobilePage, "weekend-card-expanded-flights-mobile", MOBILE_DIR, MOBILE_VP);

        // Click "Stays" tab
        const tabButtons = await mobilePage.$$('[class*="border-b"] button');
        for (const tb of tabButtons) {
          const text = await mobilePage.evaluate((el) => el.textContent, tb);
          if (text && text.includes("Stays")) {
            await tb.click();
            await new Promise((r) => setTimeout(r, 500));
            await screenshot(mobilePage, "weekend-card-expanded-stays-mobile", MOBILE_DIR, MOBILE_VP);
            break;
          }
        }

        // Click "Costs" tab
        for (const tb of tabButtons) {
          const text = await mobilePage.evaluate((el) => el.textContent, tb);
          if (text && text.includes("Costs")) {
            await tb.click();
            await new Promise((r) => setTimeout(r, 500));
            await screenshot(mobilePage, "weekend-card-expanded-costs-mobile", MOBILE_DIR, MOBILE_VP);
            break;
          }
        }
      }
    }

    // 4. Switch back to Overview mode
    const overviewBtns = await mobilePage.$$("button");
    for (const btn of overviewBtns) {
      const text = await mobilePage.evaluate((el) => el.textContent, btn);
      if (text && text.trim() === "Overview") {
        await btn.click();
        await new Promise((r) => setTimeout(r, 1000));
        break;
      }
    }

    // 5. Mobile filter chips bar
    await screenshot(mobilePage, "mobile-filter-chips", MOBILE_DIR, MOBILE_VP);

    // 6. Open filter sheet (bottom sheet)
    const filterNavBtn = await mobilePage.evaluateHandle(() => {
      const btns = document.querySelectorAll("nav button");
      for (const b of btns) {
        if (b.textContent?.includes("Filters")) return b;
      }
      return null;
    });
    if (filterNavBtn) {
      await filterNavBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await screenshot(mobilePage, "filter-sheet-open-mobile", MOBILE_DIR, MOBILE_VP);

      // Close filter sheet
      const applyBtn = await mobilePage.evaluateHandle(() => {
        const btns = document.querySelectorAll("button");
        for (const b of btns) {
          if (b.textContent?.trim() === "Apply") return b;
        }
        return null;
      });
      if (applyBtn) await applyBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // 7. Open Settings (mobile config)
    const settingsNavBtn = await mobilePage.evaluateHandle(() => {
      const btns = document.querySelectorAll("nav button");
      for (const b of btns) {
        if (b.textContent?.includes("Settings")) return b;
      }
      return null;
    });
    if (settingsNavBtn) {
      await settingsNavBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await screenshot(mobilePage, "settings-panel-mobile", MOBILE_DIR, MOBILE_VP);

      // Close settings
      const closeBtn = await mobilePage.evaluateHandle(() => {
        const btns = document.querySelectorAll('[class*="fixed"] button');
        for (const b of btns) {
          if (b.querySelector("svg") && b.closest('[class*="sticky"]')) return b;
        }
        return null;
      });
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // 8. Open Jobs panel
    const jobsNavBtn = await mobilePage.evaluateHandle(() => {
      const btns = document.querySelectorAll("nav button");
      for (const b of btns) {
        if (b.textContent?.includes("Jobs")) return b;
      }
      return null;
    });
    if (jobsNavBtn) {
      await jobsNavBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await screenshot(mobilePage, "jobs-panel-mobile", MOBILE_DIR, MOBILE_VP);

      // Close jobs
      const closeBtn2 = await mobilePage.evaluateHandle(() => {
        const panels = document.querySelectorAll('[class*="fixed"]');
        for (const p of panels) {
          const btn = p.querySelector('[class*="sticky"] button');
          if (btn) return btn;
        }
        return null;
      });
      if (closeBtn2) await closeBtn2.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // 9. Bottom navigation bar
    await screenshot(mobilePage, "bottom-nav-mobile", MOBILE_DIR, MOBILE_VP);

    // 10. Header / top bar
    await mobilePage.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 300));
    await screenshot(mobilePage, "header-topbar-mobile", MOBILE_DIR, MOBILE_VP);

    // 11. Popular weekends section - click Popular button in overview
    const popularBtn = await mobilePage.evaluateHandle(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Popular")) return b;
      }
      return null;
    });
    if (popularBtn) {
      await popularBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await screenshot(mobilePage, "popular-weekends-mobile", MOBILE_DIR, MOBILE_VP);
    }

    // 12. Loading state (reload page and capture quickly)
    const mobilePage2 = await browser.newPage();
    await mobilePage2.setViewport(MOBILE_VP);
    // Take screenshot before data loads
    mobilePage2.goto(BASE_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 800));
    await screenshot(mobilePage2, "loading-state-mobile", MOBILE_DIR, MOBILE_VP);
    await mobilePage2.close();

    await mobilePage.close();

    // ═══════════════════════════════════════════
    // DESKTOP SCREENSHOTS
    // ═══════════════════════════════════════════
    console.log("\n🖥️  Taking DESKTOP screenshots (1440x900)...\n");
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport(DESKTOP_VP);
    await desktopPage.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await waitForApp(desktopPage);

    // 1. Dashboard overview
    await screenshot(desktopPage, "dashboard-overview-desktop", DESKTOP_DIR, DESKTOP_VP);

    // 2. Ranked list view
    const deskRankedBtn = await desktopPage.evaluateHandle(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim() === "Ranked List") return b;
      }
      return null;
    });
    if (deskRankedBtn) {
      await deskRankedBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
      await screenshot(desktopPage, "dashboard-ranked-list-desktop", DESKTOP_DIR, DESKTOP_VP);
    }

    // 3. Expand first weekend card
    const deskCards = await desktopPage.$$('[class*="rounded-lg"][class*="border"]');
    if (deskCards.length > 0) {
      const firstBtn = await deskCards[0].$("button");
      if (firstBtn) {
        await firstBtn.click();
        await new Promise((r) => setTimeout(r, 500));
        await screenshot(desktopPage, "weekend-card-expanded-flights-desktop", DESKTOP_DIR, DESKTOP_VP);

        // Stays tab
        const deskTabs = await desktopPage.$$('[class*="border-b"] button');
        for (const tb of deskTabs) {
          const text = await desktopPage.evaluate((el) => el.textContent, tb);
          if (text && text.includes("Stays")) {
            await tb.click();
            await new Promise((r) => setTimeout(r, 500));
            await screenshot(desktopPage, "weekend-card-expanded-stays-desktop", DESKTOP_DIR, DESKTOP_VP);
            break;
          }
        }

        // Costs tab
        for (const tb of deskTabs) {
          const text = await desktopPage.evaluate((el) => el.textContent, tb);
          if (text && text.includes("Costs")) {
            await tb.click();
            await new Promise((r) => setTimeout(r, 500));
            await screenshot(desktopPage, "weekend-card-expanded-costs-desktop", DESKTOP_DIR, DESKTOP_VP);
            break;
          }
        }
      }
    }

    // 4. Switch back to Overview
    const deskOverBtn = await desktopPage.evaluateHandle(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim() === "Overview") return b;
      }
      return null;
    });
    if (deskOverBtn) {
      await deskOverBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 5. Popular weekends
    const deskPopBtn = await desktopPage.evaluateHandle(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Popular")) return b;
      }
      return null;
    });
    if (deskPopBtn) {
      await deskPopBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await screenshot(desktopPage, "popular-weekends-desktop", DESKTOP_DIR, DESKTOP_VP);
    }

    // 6. Desktop full page
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 300));
    await screenshot(desktopPage, "full-page-desktop", DESKTOP_DIR, DESKTOP_VP);

    await desktopPage.close();

    // ═══════════════════════════════════════════
    // WRITE MANIFEST
    // ═══════════════════════════════════════════
    const manifestContent = [
      "# Screenshot Manifest",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Screenshots",
      "",
      "| Filename | Route | Viewport | Directory |",
      "|----------|-------|----------|-----------|",
      ...manifest.map(
        (m) => `| ${m.filename} | ${m.route} | ${m.viewport} | ${m.directory} |`
      ),
    ].join("\n");

    writeFileSync(join(process.cwd(), "screenshots", "manifest.md"), manifestContent);
    console.log("\n📋 Manifest written to screenshots/manifest.md");
    console.log(`\n✅ Done! ${manifest.length} screenshots taken.`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
