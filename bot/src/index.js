const { Builder, By, until, Key } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");
const readline = require('readline-sync');
const config = require("./config.js")

require("dotenv").config()

const program = async (g2gMailAddress, g2gPassword, firefoxWebdriverPath) => {
    const firefoxService = new firefox.ServiceBuilder(firefoxWebdriverPath);

    const driver = new Builder()
        .forBrowser("firefox")
        .setFirefoxService(firefoxService)
        .build();

    const clickButton = async (locator) => {
        await driver.wait(until.elementsLocated(locator), 10000);
        const button = await driver.findElement(locator);
        button.click();
    }

    const waitForElement = async (locator) => {
        while (true) {
            await driver.wait(until.elementsLocated(locator), 10000);
            try {
                const element = await driver.findElement(locator)
                return element
            } catch (err) {
                continue
            }
        }
    }

    const extractText = async (locator) => {
        await driver.wait(until.elementsLocated(locator, 10000))
        const element = await driver.findElement(locator);

        return element.getText();
    }

    const fillInput = async (by, value) => {
        await driver.wait(until.elementLocated(by), 10000);
        const input = await driver.findElement(by);
        input.sendKeys(value);
        return input
    }

    const performLogin = async () => {
        await driver.get("https://www.g2g.com/login");

        await fillInput(By.xpath("//input[@type='text']"), g2gMailAddress)
        const pwField = await fillInput(By.xpath("//input[@type='password']"), g2gPassword)

        await driver.sleep(1000 * 5)
        await pwField.sendKeys(Key.ENTER)
    }

    const performTwoFactorAuth = async () => {
        try {
            await driver.findElement(By.css("input.otp-input:nth-child(1)"))
            const otp = readline.question("OTP Code: ")
            for(let i = 0; i < 6; i++) {
                const otpField = await driver.findElement(By.css(`input.otp-input:nth-child(${i + 1})`))
                otpField.sendKeys(otp.charAt(i))
                await driver.sleep(1000)
            }
        } catch (err) {
            console.log(err)
        }
    }

    const performCompleteSellOrder = async () => {
        try {
            await driver.get("https://www.g2g.com/order/sellOrder/index")

            const startCompletionElementXpath = By.xpath("//a[contains(text(),'#')]")
            await waitForElement(startCompletionElementXpath)
            const accountId = (await extractText(startCompletionElementXpath))
                .split("#")[1]
            await clickButton(startCompletionElementXpath)

            const url = await driver.getCurrentUrl();
            const sellId = url.split("=")[1]
            console.log(`Got an order with following id: ${sellId} -- the accountid is -> ${accountId}`)

            await driver.sleep(1000 * 3)

            await clickButton(By.xpath("//a[contains(text(),'View Delivery Details')]"))
            await driver.sleep(1000)

            await clickButton(By.xpath("//a[contains(text(),'Start Trading')]"))
            await driver.sleep(1000)

            const accountData = config[accountId]

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

            await driver.sleep(1000 * 3)
            schedulePerformFulfillOrder()
        } catch (err) {
            await driver.sleep(1000 * 60 * 2)
            schedulePerformFulfillOrder()
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

const requireEnv = (name) => {
    const value = process.env[name]
    if (!value) {
        console.log(`You need to specifiy ${name} as environment variable`)
        process.exit(-1)
    }
    return value
}

const g2gMailAddress = requireEnv("G2G_EMAIL")
const g2gPassword = requireEnv("G2G_PASSWORD")
const firefoxWebdriverPath = requireEnv("FIREFOX_WEBDRIVER_PATH")

program(g2gMailAddress, g2gPassword, firefoxWebdriverPath);
