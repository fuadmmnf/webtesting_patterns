const puppeteer = require('puppeteer-core')

const testListSelector = ".runnables-region > ul.runnables > li"
const testCommandSectionSelector = "ul.hooks-container > li"
const testCommandsSelector = "span.command-info"
const commandMethodSelector = "span.command-method"
const commandMessageSelector = "span.command-message"
async function getTestCommands(browserPort) {
    const browserURL = `http://127.0.0.1:${browserPort}`
    const browser = await puppeteer.connect({browserURL})
    const page = (await browser.pages())[0]

    const list = await page.$$(testListSelector)
    const results = []
    for (let i = 0; i < list.length; i++) {
        await list[i].click()
        const commands = await (await list[i].$$(testCommandSectionSelector))[2].$$(testCommandsSelector)

        for(let j=0;j<commands.length; j++){
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

browserPort = 46067
getTestCommands(browserPort)