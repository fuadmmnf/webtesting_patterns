const puppeteer = require('puppeteer-core')
const glob = require('glob');
crypto = require('node:crypto');


const testListSelector = ".runnables-region > ul.runnables > li"
const testCommandSectionSelector = "div.runnable-commands-region > ul.hooks-container > li"
const testCommandsSelector = "span.command-info"
const allTestRanConfirmationSelector = "li.suite.runnable"
const testTitleSelector = "span.runnable-title > span"

const commandMethodSelector = "span.command-method > span"
const commandMessageSelector = "span.command-message-text"
const commandAliasSelector = "span.command-alias"
const commandAliasCountSelector = "span.command-alias-count"


async function runTestFiles(browserPort, spec_files) {
    const browserURL = `http://127.0.0.1:${browserPort}`
    const browser = await puppeteer.connect({browserURL})
    const page = (await browser.pages())[0]
    await page.setViewport({
        width: 1366,
        height: 768,
        deviceScaleFactor: 20
    });
    // await testCode(page)
    // process.exit(1)

    for (const spec of spec_files) {
        await (await page.$$(`[data-cy="sidebar-link-specs-page"]`))[0].click()
        let arr = spec.split('/')
        if (arr[arr.length - 1] !== 'transaction-feeds.spec.ts')
            continue
        await runTests(page, arr[arr.length - 1])
        break
    }


}


async function getElementEntity(page, frame, command, selector) {
    // const selec = selector.substring(1, selector.length-1)
    const formattedSelector = `${selector}`


    const highlightHandle = (await page.$$('#toggle-highlights'))
    if (highlightHandle.length > 0) {
        await highlightHandle[0].click()
    }
    // await new Promise(resolve => setTimeout(resolve, 200))
    const elemHandle = (await frame.$$(formattedSelector))
    console.log(formattedSelector + " " + elemHandle.length)
    if (elemHandle.length === 0) {
        return {html: '', screenshot: ''}
    }
    let screenshotName = ''
    const htmlContent = await (await elemHandle[0].getProperty('outerHTML')).jsonValue()
    if (await elemHandle[0].boundingBox()) {
        screenshotName = `./../res/cypress-realworld-app/screenshots/${crypto.randomBytes(20).toString('hex')}.png`
        await elemHandle[0].screenshot({path: screenshotName})
    }
    return {
        html: htmlContent,
        screenshot: screenshotName
    }
}


async function runTests(page, spec_file) {
    console.log("running: " + spec_file)

    let testcase_item = (await page.$$(`[data-cy-row="${spec_file}"] > a`))[0]
    await testcase_item.click()
    await page.waitForSelector(allTestRanConfirmationSelector)
    while (true) {
        let mainRunnebleClasses = (await (await (await page.$$(allTestRanConfirmationSelector))[0].getProperty("className")).jsonValue()).split(" ")

        if (mainRunnebleClasses.includes('runnable-passed')) {
            // console.log('tests finished executing')
            await parseCommands()
            break
        } else {
            // console.log('still running tests')
        }
    }

    async function parseCommands() {
        // clearTimeout(timeout);
        const frame = await (await page.waitForSelector('iframe.aut-iframe')).contentFrame();
        await page.waitForSelector(testListSelector)
        const list = await page.$$(testListSelector)
        const results = []
        for (let i = 0; i < list.length; i++) {
            await list[i].click()
            const test_title = await (await (await list[i].$$(testTitleSelector))[0].getProperty('innerText')).jsonValue()
            console.log("TITLE: " + test_title)
            const commands = await (await list[i].$$(testCommandSectionSelector))[1].$$(testCommandsSelector)

            for (let j = 0; j < commands.length; j++) {
                await commands[j].click()
                // console.log(await (await commands[j].getProperty('innerHTML')).jsonValue())
                const alias_handle = (await commands[j].$$(commandAliasSelector))
                const alias_count_handle = (await commands[j].$$(commandAliasCountSelector))

                const method_text = await (await (await commands[j].$$(commandMethodSelector))[0].getProperty('innerText')).jsonValue()
                const message_handle = (await commands[j].$$(commandMessageSelector))
                const method_message = message_handle.length === 0 ? "" : await (await message_handle[0].getProperty('innerText')).jsonValue()

                results.push({

                    method: method_text,
                    message: method_message,
                    alias: {
                        message: (alias_handle.length === 0 ? "" : await (await alias_handle[0].getProperty('innerText')).jsonValue()),
                        count: (alias_count_handle.length === 0 ? "" : await (await alias_count_handle[0].getProperty('innerText')).jsonValue())
                    },
                    element_entity: ((method_text === 'get' && method_message.length !== 0) ? await getElementEntity(page, frame, commands[j], method_message) :
                        {
                            html: "",
                            screenshot: ""
                        })
                })
                // console.log(await (await commands[j].getProperty('innerHTML')).jsonValue())
                // console.log('\n')
            }
            await list[i].click()
            // console.log('\n\n\n')
        }
        console.log(results)
    }


}

browserPort = 39909

glob('./../test_systems/cypress-realworld-app/cypress/tests/ui/*.ts', function (err, files) {
    runTestFiles(browserPort, files)
})
