const puppeteer = require('puppeteer-core')
var glob = require('glob');


const testListSelector = ".runnables-region > ul.runnables > li"
const testCommandSectionSelector = "ul.hooks-container > li"
const testCommandsSelector = "span.command-info"
const allTestRanConfirmationSelector = "li.suite.runnable.runnable-passed"

const commandMethodSelector = "span.command-method"
const commandMessageSelector = "span.command-message"


async function testCode(page) {
    let selected_flags = await page.$$(allTestRanConfirmationSelector)
    if (selected_flags.length > 0) {
        console.log('tests finished executing')
        // await parseCommands()
    } else {
        console.log('still running tests')
    }
}

async function runTestFiles(browserPort, spec_files) {
    const browserURL = `http://127.0.0.1:${browserPort}`
    const browser = await puppeteer.connect({browserURL})
    const page = (await browser.pages())[0]

    // await testCode(page)
    // process.exit(1)

    for (const spec of spec_files) {
        await (await page.$$(`[data-cy="sidebar-link-specs-page"]`))[0].click()
        let arr = spec.split('/')
        if(arr[arr.length-1] !== 'notifications.spec.ts')
            continue
        await runTests(page, arr[arr.length - 1])
    }


}

async function runTests(page, spec_file) {
    console.log("running: " + spec_file)

    let testcase_item = (await page.$$(`[data-cy-row="${spec_file}"] > a`))[0]
    await testcase_item.click()
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let selected_flags = await page.$$(allTestRanConfirmationSelector)
        if (selected_flags.length > 0) {
            // console.log('tests finished executing')
            await parseCommands()
            break
        } else {
            // console.log('still running tests')
        }
    }

    async function parseCommands() {
        // clearTimeout(timeout);

        const list = await page.$$(testListSelector)
        const results = []
        for (let i = 0; i < list.length; i++) {
            await list[i].click()
            const test_title=  await (await (await list[i].$$("span.runnable-title > span"))[0].getProperty('innerHTML')).jsonValue()
            console.log("TITLE: " + test_title)
            const commands = await (await list[i].$$(testCommandSectionSelector))[2].$$(testCommandsSelector)

            for (let j = 0; j < commands.length; j++) {
                // results.push({
                //     method: (await (await commands[j].$$(commandMethodSelector))[0].getProperty('innerHTML')).jsonValue(),
                //     message: (await (await commands[j].$$(commandMessageSelector))[0].getProperty('innerHTML')).jsonValue()
                // })
                console.log(await (await commands[j].getProperty('innerHTML')).jsonValue())
                console.log('\n')
            }

            console.log('\n\n\n')
        }
        console.log(results)
    }


}

browserPort = 34549

glob('./../test_systems/cypress-realworld-app/cypress/tests/ui/*.ts', function (err, files) {
    runTestFiles(browserPort, files)
})
