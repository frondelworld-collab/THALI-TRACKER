import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const images = [
    'Pizza', 'Cheeseburger', 'Caesar_Salad', 'Pasta_Carbonara', 'Sushi_Roll', 'Samosa', 'Paneer_Tikka', 'Butter_Chicken'
];

async function run() {
    console.log('Starting Puppeteer E2E tests...');
    fs.mkdirSync('screenshots', { recursive: true });

    const browser = await puppeteer.launch({ 
        headless: 'new', executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a good mobile viewport for the scanner
    await page.setViewport({ width: 390, height: 844 });

    for (let i = 0; i < images.length; i++) {
        const imgName = images[i];
        console.log(`\n[${i+1}/${images.length}] Testing ${imgName}...`);
        
        try {
            await page.goto('http://localhost:3000/');
            await page.evaluate(() => localStorage.setItem('mockUser', 'true'));
            await page.goto('http://localhost:3000/scanner', { waitUntil: 'domcontentloaded' });
            
            // Wait for file input to be ready
            await page.waitForSelector('input[type="file"]');
            const inputUploadHandle = await page.$('input[type="file"]');
            
            // Upload file
            const filePath = path.join(__dirname, 'test_images', `${imgName}.jpg`);
            await inputUploadHandle.uploadFile(filePath);

            console.log('Image uploaded. Waiting for analysis (this may take up to 10 seconds)...');
            
            // Wait for results sheet to appear by looking for the text
            await page.waitForFunction(() => document.body.innerText.includes('Add to Daily Log'), { timeout: 30000 });
            
            // Give it an extra second for animations to settle
            await new Promise(r => setTimeout(r, 1000));
            
            // Take screenshot
            const screenshotPath = path.join(__dirname, 'screenshots', `${imgName}_result.png`);
            await page.screenshot({ path: screenshotPath });
            console.log(`Screenshot saved to ${screenshotPath}`);

            // To avoid rate limits (5 per minute = 12s interval), we wait 15 seconds
            console.log('Waiting 15 seconds to respect rate limits...');
            await new Promise(r => setTimeout(r, 15000));

        } catch (e) {
            console.error(`Failed to process ${imgName}:`, e.message);
            const screenshotPath = path.join(__dirname, 'screenshots', `${imgName}_error.png`);
            await page.screenshot({ path: screenshotPath });
            console.log(`Saved error screenshot to ${screenshotPath}`);
        }
    }

    await browser.close();
    console.log('All tests completed.');
}

run();
