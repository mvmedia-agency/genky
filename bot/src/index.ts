import { By, Builder, until, Key } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";
import readline from "readline-sync";
import config from "./config";
import fs from "fs";

require("dotenv").config()

function getCurrentTime() {
    const currentDateTime = new Date();

    const hours = String(currentDateTime.getHours()).padStart(2, "0");
    const minutes = String(currentDateTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentDateTime.getSeconds()).padStart(2, "0");
    const millis = String(currentDateTime.getMilliseconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}:${millis}`;
}

const _log = console.log;

function logToFile(data: string): string {
    const filePath = "log.txt";
    const msg = `[${getCurrentTime()}] ${data}`;
    fs.appendFileSync(filePath, msg + "\n");

    return msg;
}

function logToFileAndStdout(data: string) {
    _log(logToFile(data));
}

console.log = (message: string) => {
    logToFileAndStdout(message);
}

const program = async (g2gMailAddress: string, g2gPassword: string, firefoxWebdriverPath: string, firefoxBinaryPath: string) => {
    const options = new firefox.Options()
        .setBinary(firefoxBinaryPath)
        .headless();

    const firefoxService = new firefox.ServiceBuilder(firefoxWebdriverPath);

    const driver = new Builder()
        .forBrowser("firefox")
        .setFirefoxService(firefoxService)
        .setFirefoxOptions(options)
        .build();

    console.log("[!] successfully started firefox");

    const clickButton = async (locator: By) => {
        await driver.wait(until.elementsLocated(locator), 10000);
        const button = await driver.findElement(locator);
        button.click();
    }

    const waitForElement = async (locator: By) => {
        console.log("[$] Waiting for Order")
        for(let i = 0; i < 10; i++) {
            try {
                await driver.wait(until.elementsLocated(locator), 10000);
                const element = await driver.findElement(locator)
                return element
            } catch (err) {
                await driver.sleep(1000)
                continue
            }
        }
        throw new Error("elementNotFound");
    }

    const extractText = async (locator: By) => {
        await driver.wait(until.elementsLocated(locator), 10000)
        const element = await driver.findElement(locator);

        return element.getText();
    }

    const fillInput = async (by: By, value: string) => {
        await driver.wait(until.elementLocated(by), 10000);
        const input = await driver.findElement(by);
        input.sendKeys(value);
        return input
    }

    const performLogin = async () => {
        console.log("[!] trying to perform login")
        await driver.get("https://www.g2g.com/login");

        await fillInput(By.xpath("//input[@type='text']"), g2gMailAddress)
        const pwField = await fillInput(By.xpath("//input[@type='password']"), g2gPassword)

        await driver.sleep(1000 * 5)
        await pwField.sendKeys(Key.ENTER)

        console.log("[!] successfully performed login");
    }

    const performTwoFactorAuth = async () => {
        try {
            console.log("[!] trying to perform 2FA");
            await driver.findElement(By.css("input.otp-input:nth-child(1)"))
            const otp = readline.question("OTP Code: ")
            for(let i = 0; i < 6; i++) {
                const otpField = await driver.findElement(By.css(`input.otp-input:nth-child(${i + 1})`))
                otpField.sendKeys(otp.charAt(i))
                await driver.sleep(1000)
            }
            console.log("[!] successfully performed 2FA");
        } catch (err) {
            console.log(err)
        }
    }

    const performCompleteSellOrder = async () => {
        try {
            console.log("[$] perform complete sell order");
            await driver.get("https://www.g2g.com/order/sellOrder/index")

            const startCompletionElementXpath = By.xpath("//a[contains(text(),'#')]")
            await waitForElement(startCompletionElementXpath)
            const accountId = (await extractText(startCompletionElementXpath))
                .split("#")[1]

            console.log("found $$$");

            await clickButton(startCompletionElementXpath)

            const url = await driver.getCurrentUrl();
            const sellId = url.split("=")[1]
            console.log(`Got an order with following id: ${sellId} -- the accountid is -> ${accountId}`)

            await driver.sleep(1000 * 3)

            await clickButton(By.xpath("//a[contains(text(),'View Delivery Details')]"))
            await driver.sleep(1000)

            console.log(":: clicked on view delivery details");

            await clickButton(By.xpath("//a[contains(text(),'Start Trading')]"))
            await driver.sleep(1000)

            console.log(":: clicked on start trading");

            const accountData = config[accountId]

            console.log(`:: username -> ${accountData.username}`);
            console.log(`:: password -> ${accountData.password}`);
            console.log(`:: emailPassword -> ${accountData.emailPassword}`);
            console.log(`:: email -> ${accountData.email}`);
            console.log(`:: additional -> ${accountData.additional}`);

            await fillInput(By.xpath('//*[@id="account_id"]'), accountData.username)
            await fillInput(By.xpath('//*[@id="password"]'), accountData.password)

            await fillInput(By.xpath('//*[@id="first_name"]'), '-')
            await fillInput(By.xpath('//*[@id="last_name"]'), '-')
            await fillInput(By.xpath('//*[@id="account_country"]'), '-')
            await fillInput(By.xpath('//*[@id="date_of_birth"]'), '-')

            await fillInput(By.xpath('//*[@id="email_account"]'), accountData.email)
            await fillInput(By.xpath('//*[@id="email_password"]'), accountData.emailPassword)

            await fillInput(By.xpath('//*[@id="secret_question"]'), accountData.additional)
            await fillInput(By.xpath('//*[@id="secret_answer"]'), accountData.additional)
            await fillInput(By.xpath('//*[@id="additional_note"]'), accountData.additional)

            await clickButton(By.xpath("//button[contains(text(),'Submit')]"));

            console.log(":: clicked submit button");
            console.log(":: done with this shit");

            await driver.sleep(1000 * 3)
            performCompleteSellOrder()
        } catch (err) {
            console.log(err);
            await driver.sleep(10000)
            performCompleteSellOrder()
        }
    }

    const run = async () => {
        await performLogin()
        await driver.sleep(1000 * 5)
        await performTwoFactorAuth()
        await driver.sleep(1000 * 5)
        await performCompleteSellOrder()
    }

    await run();
}

const requireEnv = (name: string) => {
    const value = process.env[name]
    if (!value) {
        console.log(`You need to specifiy ${name} as environment variable`)
        process.exit(-1)
    }
    return value
}

const g2gMailAddress = requireEnv("G2G_EMAIL");
const g2gPassword = requireEnv("G2G_PASSWORD");
const firefoxWebdriverPath = requireEnv("FIREFOX_WEBDRIVER_PATH");
const firefoxBinaryPath = requireEnv("FIREFOX_BINARY_PATH");

program(g2gMailAddress, g2gPassword, firefoxWebdriverPath, firefoxBinaryPath);

