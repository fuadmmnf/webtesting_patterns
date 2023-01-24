const fs = require('fs');
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
    // await page.setViewport({
    //     width: 1366
    //     height: 768,
    //     deviceScaleFactor: 20
    // });
    // await testCode(page)
    // process.exit(1)

    for (const spec of spec_files) {
        await (await page.$$(`[data-cy="sidebar-link-specs-page"]`))[0].click()
        let arr = spec.split('/')
        if (!['transaction-feeds.spec.ts', 'transaction-view.spec.ts', 'user-settings.spec.ts'].includes(arr[arr.length - 1]))
            continue
        await runTests(page, arr[arr.length - 1])
        // break
    }


}


async function getElementEntity(page, frame, selector) {
    // const selec = selector.substring(1, selector.length-1)
    const formattedSelector = `${selector}`


    // await new Promise(resolve => setTimeout(resolve, 200))
    let elemHandle = (await frame.$$(formattedSelector))
    // console.log(formattedSelector + " " + elemHandle.length)
    if (elemHandle.length === 0) {
        return {
            html: '', screenshot: '', tag: ''
        }
    }
    let screenshotName = ''
    let htmlContent = await (await elemHandle[0].getProperty('outerHTML')).jsonValue()
    let tag = (await (await elemHandle[0].getProperty('tagName')).jsonValue())
    if (tag === 'DIV') {
        // console.log(htmlContent)
        elemHandle = (await elemHandle[0].$$("button,input,a,h1,h2"))
        if (elemHandle.length !== 0) {
            tag = (await (await elemHandle[0].getProperty('tagName')).jsonValue())
        }
    }
    if (['BUTTON', 'INPUT'].includes(tag)) {
        tag += `(type='${await (await elemHandle[0].getProperty('type')).jsonValue()}')`
    }
    if (await elemHandle[0].boundingBox()) {
        screenshotName = `./../res/cypress-realworld-app/screenshots/${crypto.randomBytes(20).toString('hex')}.png`
        await elemHandle[0].screenshot({path: screenshotName})
    }


    return {
        // url: {
        //     before: '',
        //     after: (urlElem.length > 0 ? (await (await urlElem[0].getProperty('value')).jsonValue()) : ''),
        // },
        html: htmlContent,
        tag: tag,
        screenshot: screenshotName
    }
}

async function getAutUrl(page) {
    await page.waitForSelector('[data-cy=aut-url-input]')
    const urlElem = (await page.$$('[data-cy=aut-url-input]'))
    return (urlElem.length > 0 ? (await (await urlElem[0].getProperty('value')).jsonValue()) : '')
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
            await parseCommands(spec_file)
            break
        } else {
            // console.log('still running tests')
        }
    }

    async function parseCommands(spec_file) {
        // clearTimeout(timeout);
        const frame = await (await page.waitForSelector('iframe.aut-iframe')).contentFrame();
        await page.waitForSelector(testListSelector)
        const list = await page.$$(testListSelector)
        const tests = []
        for (let i = 0; i < list.length; i++) {
            const results = []
            await list[i].click()
            const test_title = await (await (await list[i].$$(testTitleSelector))[0].getProperty('innerText')).jsonValue()
            console.log("TITLE: " + test_title)
            const commands = [...(await (await list[i].$$(testCommandSectionSelector))[0].$$(testCommandsSelector)), ...(await (await list[i].$$(testCommandSectionSelector))[1].$$(testCommandsSelector))]

            for (let j = 0; j < commands.length; j++) {
                await commands[j].click()
                const highlightHandle = (await page.$$('#toggle-highlights')) // turn off element highlight
                if (highlightHandle.length > 0) {
                    await highlightHandle[0].click()
                }

                // get commad info
                // console.log(await (await commands[j].getProperty('innerHTML')).jsonValue())
                const alias_handle = (await commands[j].$$(commandAliasSelector))
                const alias_count_handle = (await commands[j].$$(commandAliasCountSelector))

                const method_text = await (await (await commands[j].$$(commandMethodSelector))[0].getProperty('innerText')).jsonValue()
                const message_handle = (await commands[j].$$(commandMessageSelector))
                const method_message = message_handle.length === 0 ? "" : await (await message_handle[0].getProperty('innerText')).jsonValue()


                // get snapshot info
                const beforeActionSnapshot = {
                    url: await getAutUrl(page),
                    element: await getElementEntity(page, frame, method_message),
                    page: await getElementEntity(page, frame, '*')
                }
                // change to after snapshot
                const snapshotButtons = (await ((await page.$$('[data-cy="snapshot-toggle"]'))[0]).$$('button'))
                if (snapshotButtons.length > 0) {
                    await snapshotButtons[1].click() // click after state button
                }
                const afterActionSnapshot = {
                    url: await getAutUrl(page),
                    element: await getElementEntity(page, frame, method_message),
                    page: await getElementEntity(page, frame, '*')
                }


                results.push({
                    info: {
                        method: method_text,
                        message: method_message,

                        alias: {
                            message: (alias_handle.length === 0 ? "" : await (await alias_handle[0].getProperty('innerText')).jsonValue()),
                            count: (alias_count_handle.length === 0 ? "" : await (await alias_count_handle[0].getProperty('innerText')).jsonValue())
                        },
                    },
                    snapshot: {
                        before: beforeActionSnapshot,
                        after: afterActionSnapshot,
                    },

                })
            }
            await list[i].click()
            tests.push({
                title: test_title,
                commands: results,
            })
        }
        fs.writeFileSync(`./../res/result_${spec_file.replaceAll('.', '_')}.json`, JSON.stringify(tests, null, 2), 'utf-8');

        // console.log(results)
    }


}

browserPort = 38219


//cypress-realworld-app
glob('./../test_systems/cypress-realworld-app/cypress/tests/ui/*.ts', function (err, files) {
    runTestFiles(browserPort, files)
})
