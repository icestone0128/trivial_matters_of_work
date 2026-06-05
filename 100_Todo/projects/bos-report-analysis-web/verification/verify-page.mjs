import { chromium } from 'playwright';
import path from 'node:path';

const baseDir = process.cwd();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
const page = await context.newPage();

await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.fill('#project-name', 'S8L');
await page.fill('#summary-input', `Sort\tPart Quantity\tFMD Applying\tFMD Released\tApproved
ME Single\t583\t21\t513\t192
Packing Single\t57\t3\t46\t24
Assy\t90\t1\t85\t5
Total\t730\t25\t644\t221`);
await page.locator('#preview-btn').dispatchEvent('click');
await page.screenshot({ path: path.join(baseDir, 'desktop.png'), fullPage: true });

const singleTitle = await page.locator('#current-project-label').textContent();
const singleChartCount = await page.locator('.single-panel .status-card').count();
const heading = await page.locator('h1').textContent();
const recordHeaders = await page.locator('.record-table th').allTextContents();
const quantityBars = await page.locator('.aggregate-panel .bar-fill.quantity').count();
const sheetTabs = await page.locator('.sheet-tab').allTextContents();
const aggregateCards = await page.locator('.aggregate-panel .status-card h3').allTextContents();
const piePanels = await page.locator('.pie-panel h3').allTextContents();
const aggregateHeaders = await page.locator('#aggregate-summary th').allTextContents();
const panelTools = await page.locator('.records-panel .panel-tools').textContent();
const exportButton = await page.locator('#export-btn').textContent();
const exportPngButton = await page.locator('#export-png-btn').textContent();
const pngButtonDisplayBefore = await page.locator('#export-png-btn').evaluate(button => getComputedStyle(button).display);
const pieLegendRows = await page.locator('.pie-panel').first().locator('.legend-row').count();
const pieCenterLabels = await page.locator('.pie-center small').allTextContents();
const singleCells = await page.locator('.single-panel td').allTextContents();
const excelDownload = await Promise.all([
  page.waitForEvent('download'),
  page.locator('#export-btn').click()
]).then(([download]) => download.suggestedFilename());
const pieCanvasPixel = await page.locator('.pie-canvas').first().evaluate(canvas => {
  const ctx = canvas.getContext('2d');
  return Array.from(ctx.getImageData(Math.floor(canvas.width * 0.75), Math.floor(canvas.height * 0.25), 1, 1).data);
});
const pngDownload = await Promise.all([
  page.waitForEvent('download'),
  page.locator('#export-png-btn').click()
]).then(([download]) => download.suggestedFilename());
const pngButtonDisplayAfter = await page.locator('#export-png-btn').evaluate(button => getComputedStyle(button).display);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

const mobile = await browser.newPage({ viewport: { width: 390, height: 1100 }, isMobile: true });
await mobile.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await mobile.fill('#project-name', 'S8L');
await mobile.fill('#summary-input', `Sort\tPart Quantity\tFMD Applying\tFMD Released\tApproved
ME Single\t583\t21\t513\t192
Packing Single\t57\t3\t46\t24
Assy\t90\t1\t85\t5
Total\t730\t25\t644\t221`);
await mobile.locator('#preview-btn').dispatchEvent('click');
await mobile.screenshot({ path: path.join(baseDir, 'mobile.png'), fullPage: true });
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

await browser.close();

console.log(JSON.stringify({
  heading,
  singleTitle,
  singleChartCount,
  recordHeaders,
  quantityBars,
  sheetTabs,
  aggregateCards,
  piePanels,
  aggregateHeaders,
  panelTools,
  exportButton,
  exportPngButton,
  pngButtonDisplayBefore,
  pngButtonDisplayAfter,
  excelDownload,
  pngDownload,
  pieCanvasPixel,
  pieLegendRows,
  pieCenterLabels,
  singleCells: singleCells.slice(0, 8),
  desktopHorizontalOverflow: overflow,
  mobileHorizontalOverflow: mobileOverflow
}, null, 2));
