const fs = require('fs');
const glob = require("glob");

let sequences = []
glob('./../res/*.json', function (err, files) {
    for (const file of files) {
        let tests = JSON.parse(fs.readFileSync(file))
        for (const test of tests) {
            let seq = []
            for (let i = 0; i < test.commands.length; i++) {
                if (test.commands[i].method === 'get') {
                    seq.push(`${test.commands[i + 1].method} ${test.commands[i].element_entity.tag}`)
                }
            }
            sequences.push(seq)
        }
    }
})
