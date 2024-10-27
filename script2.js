const puppeteer = require('puppeteer');
const md5 = require('md5');
const axios = require('axios');
const os = require("os");
const path = require("path");
const fs = require('fs').promises;


const HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
};
const acc_info = {
    // Insert your account information in both variables below
    "email": "janice.du+demo@multilogin.com",
    "password": md5("&EO$sfLF7CdXlRjo")
};

const scrapedData = [];

async function get_token() {
    const signIn_URL = "https://api.multilogin.com/user/signin";
    try {
        const response = await axios.post(signIn_URL, acc_info, {
            headers: HEADERS
        });
        return response.data.data.token;
    } catch (error) {
        console.log(error.message);
        console.log("Response data:", error.response.data);
        return false;
    }
};
// Insert the Folder ID and the Profile ID below
const folder_id = "07ab8089-5d9f-49ce-8dab-443499427583";
const profile_id = "d3348650-29e0-41b4-a8e2-e07ae7945510";

async function start_browserProfile() {
    const token = await get_token();
    if (!token) return;
    // Update HEADERS with bearer token retrived from the get_token function
    HEADERS.Authorization = 'Bearer ' + token;
    // Launch a profile defining "Puppeteer" as automation type
    const profileLaunch_URL = `https://launcher.mlx.yt:45001/api/v2/profile/f/${folder_id}/p/${profile_id}/start?automation_type=puppeteer&headless_mode=false`;
    try {
        const response = await axios.get(profileLaunch_URL, {
            headers: HEADERS
        });
        console.log(response)
        const browserURL = `http://127.0.0.1:${response.data.data.port}`;
        // if you prefer to connect with browserWSEndpoint, try to get the webSocketDebuggerUrl by following request
        // const {data : {webSocketDebuggerUrl}} = await axios.get(`${browserURL}/json/version`)
        const browser = await puppeteer.connect({
            browserURL: browserURL,
            headless: false,  // Set to true for headless mode
            defaultViewport: {width: 1280, height: 800}
        });

        const page = await browser.newPage();

        // Navigate to website (replace with your target website)
        await page.goto('https://www.trustpilot.com/users/connect?redirect=%2freview%2fmultilogin.com&source_cta=header', {
            timeout: 0 // Increased timeout for Gmail loading
        });

        try {
            // Wait for the selector with a timeout (e.g., 5 seconds)
            const element = await page.waitForSelector('#onetrust-reject-all-handler', { timeout: 5000 });

            if (element) {
                // Click if the element is found
                await element.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

            }
        } catch (error) {
            // If the selector is not found within the timeout, this block executes, but no crash occurs
            console.log("Element not found, moving on...");
        }

        await page.click('#__next > div > div > main > div > div > div.paper_paper__1PY90.paper_outline__lwsUX.card_card__lQWDv.styles_loginCard__x2_8S > div > div > div > button > span');

        // Wait for email input field to be present
        // Replace selector with the actual email input selector from your target website
        await page.waitForSelector('#email-lookup');


        // ADD YOUR GMAIL ADDRESS
        await page.type('#email-lookup', '');

        // Wait for and click the submit button
        // Replace selector with the actual submit button selector
        await page.waitForSelector('#__next > div > div > main > div > div > div.paper_paper__1PY90.paper_outline__lwsUX.card_card__lQWDv.styles_loginCard__x2_8S > div > div > div > form > button');
        await new Promise(resolve => setTimeout(resolve, 2500));
        await page.click('#__next > div > div > main > div > div > div.paper_paper__1PY90.paper_outline__lwsUX.card_card__lQWDv.styles_loginCard__x2_8S > div > div > div > form > button');

        const mailPage = await browser.newPage();
        const cookiesString = await fs.readFile('./gmail_cookies.json', 'utf8');
        const cookies = JSON.parse(cookiesString);

        // Set cookies
        await mailPage.setCookie(...cookies);

        // Navigate to Gmail
        await mailPage.goto('https://mail.google.com/mail/u/0/#inbox', {
            timeout: 0 // Increased timeout for Gmail loading
        });
        let extractedCode = '';
        while (extractedCode === '' || !extractedCode) {
            await mailPage.waitForSelector('table', {timeout: 0});
            await new Promise(resolve => setTimeout(resolve, 2500));
            await mailPage.waitForSelector('div > div > div.D.E.G-atb > div.nH.aqK > div.Cq.aqL > div > div > div:nth-child(4) > div', {timeout: 60000});
            await new Promise(resolve => setTimeout(resolve, 5000));
            await mailPage.click('div > div > div.D.E.G-atb > div.nH.aqK > div.Cq.aqL > div > div > div:nth-child(4) > div');

            await new Promise(resolve => setTimeout(resolve, 10000));

            extractedCode = await mailPage.evaluate(() => {
                try {
                    let codeText = document.querySelectorAll('table')[5]
                        ?.querySelector('tr')
                        ?.querySelectorAll('td')[5]
                        ?.querySelector('span')
                        ?.textContent;

                    if (!codeText) {
                        codeText = document.querySelectorAll('table')[2].querySelector('tr').querySelectorAll('td')[5]
                            ?.querySelector('span')
                            ?.textContent
                    }

                    console.log('The Text code:', codeText);
                    return codeText; // Return the text so we can use it outside evaluate
                } catch (err) {
                    console.error('Error in evaluate:', err);
                    return null;
                }
            });
            let otp = '';


            // Check if it's Trustpilot
            if (extractedCode?.includes('Trustpilot') || extractedCode?.includes('Log in with code')) {
                // Click the span


                otp = extractedCode.substring(8, 13);
                if (/^\d+$/.test(otp)) {
                    console.log('Extracted code:', otp);
                } else {
                    otp = extractedCode.substring(16, 21);
                    console.log('Extracted code 1:', otp);
                }
                await mailPage.close();
                await page.type('#verification-code-input', otp);
                await new Promise(resolve => setTimeout(resolve, 6000));

                await page.goto('https://www.trustpilot.com/evaluate/multilogin.com', {
                    timeout: 0 // Increased timeout for Gmail loading
                });
                await new Promise(resolve => setTimeout(resolve, 6000));
                try {
                    // Wait for the selector with a timeout (e.g., 5 seconds)
                    const element = await page.waitForSelector('#onetrust-reject-all-handler', { timeout: 5000 });

                    if (element) {
                        // Click if the element is found
                        await element.click();
                    }
                } catch (error) {
                    // If the selector is not found within the timeout, this block executes, but no crash occurs
                    console.log("Element not found, moving on...");
                }
                await page.click('#__next > div > div > main > div > div:nth-child(2) > div > form > div > div > div > div.star-selector_starSelector__wK5wO > input:nth-child(5)');

                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.type('#review-text', 'Gooddie vibes only Mannnn');

                await new Promise(resolve => setTimeout(resolve, 2000));

                await page.click('#__next > div > div > main > div > div:nth-child(2) > div > form > div:nth-child(6) > button');
                await page.click('#review-date-of-experience');
                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.keyboard.press('Enter');



                await page.click('#__next > div > div > main > div > div:nth-child(2) > div > form > div:nth-child(6) > button');

            } else {
                console.log('Found the element but it\'s not Trustpilot:', extractedCode);
            }
        }


        //startScript();
    } catch (error) {
        console.log("Error:", error.message);
        if (error.response) {
            console.log("Response data:", error.response.data);
        }
    }
};

start_browserProfile();
