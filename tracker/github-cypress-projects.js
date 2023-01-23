const oct = require('octokit')
const fs = require("fs");
const octokit = new oct.Octokit({
    auth: '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'
})


const queryString = 'q=' + encodeURIComponent('cypress in:topic,readme stars:>=50 forks:>2');
octokit.request(`GET /search/repositories?${queryString}`, {})
    .then((res) => {
        // console.log(res.status)
        // console.log(res.data)
        fs.writeFileSync(`./../res/cypress_github_projects.json`, JSON.stringify(res.data, null, 2), 'utf-8');

    })
