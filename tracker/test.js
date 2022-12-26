const puppeteer = require('puppeteer-core')
var glob = require('glob');


const testListSelector = ".runnables-region > ul.runnables > li"
const testCommandSectionSelector = "ul.hooks-container > li"
const testCommandsSelector = "span.command-info"
const commandMethodSelector = "span.command-method"
const commandMessageSelector = "span.command-message"

async function runTestFiles(browserPort, spec_files) {
    const browserURL = `http://127.0.0.1:${browserPort}`
    const browser = await puppeteer.connect({browserURL})
    const page = (await browser.pages())[0]

    for (let spec_file of spec_files) {
        await page.goto('#/specs')
        arr = spec_file.split('/')
        await runTests(page, arr[arr.length - 1])
    }


}

async function runTests(page, spec_file) {
    testcase_item = (await page.$$(`[data-cy-row="${spec_file}"]`))[0]
    await testcase_item.click()

    const timeout = setTimeout(async function () {
        //check if all test cases ran
        await parseCommands();
    }, 30000);

    async function parseCommands() {
        clearTimeout(timeout);

        const list = await page.$$(testListSelector)
        const results = []
        for (let i = 0; i < list.length; i++) {
            await list[i].click()
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

browserPort = 46067

spec_files = []
glob('./../test_systems/cypress-realworld-app/cypress/tests/ui/*.ts', function (err, files) {
    spec_files.push(files)
})
getTestCommands(browserPort, spec_files)