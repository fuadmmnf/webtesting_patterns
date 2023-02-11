const oct = require('octokit')
const fs = require("fs");
const octokit = new oct.Octokit({
    auth: ''
})

const data = JSON.parse(fs.readFileSync('./../res/res.json', 'utf8'));
console.log(data.length)
const uniques = data.filter((arr, index, self) =>
    index === self.findIndex((t) => (t.url === arr.url))).sort((a, b) => b.stars - a.stars);

console.log(uniques.length);

async function getRepoStats(repos) {
    let popularRepos = []
    let counter = 1
    for (let repo of repos) {
        console.log(`running repo-${counter}: ${repo.url}`)
        try {
            let arr = repo.url.split('/')
            const repoInfo = await octokit.rest.repos.get({
                owner: arr[arr.length - 2],
                repo: arr[arr.length - 1],
            });
            // console.log(repoInfo.data.stargazers_count)
            if (repoInfo.data.stargazers_count >= 50) {
                let commitRes = await octokit.rest.repos.listCommits({
                    owner: arr[arr.length - 2],
                    repo: arr[arr.length - 1],
                    per_page: 1,
                });
                let urlSearchParams = new URLSearchParams(commitRes.headers.link);
                let params = Object.fromEntries(urlSearchParams.entries());
                let commit_num = parseInt(params.page.split('>;')[0])
                // break
                // console.log(parseInt(params.page))
                if (commit_num >= 50) {
                    let contRes = await octokit.rest.repos.listContributors({
                        owner: arr[arr.length - 2],
                        repo: arr[arr.length - 1],
                        per_page: 1,
                    });
                    // console.log(contRes.headers['Link'])
                    let urlSearchParams2 = new URLSearchParams(contRes.headers.link);
                    let params2 = Object.fromEntries(urlSearchParams.entries());
                    let cont_num = parseInt(params2.page.split('>;')[0])
                    if (parseInt(params2.page) >= 3) {
                        popularRepos.push({
                            url: repo.url,
                            commits: parseInt(params.page),
                            watchers: repoInfo.data.watchers_count,
                            forks: repoInfo.data.forks_count,
                            stars: repoInfo.data.stargazers_count,
                            contributors: cont_num,
                            updated: repoInfo.data.updated_at,
                        })
                        counter++

                    }

                }

            }


        }
        catch (e) {

        }
        if (counter % 50 === 0) {
            fs.writeFile("./../res/populars.json", JSON.stringify(popularRepos), function (err) {
                    if (err) throw err;
                    console.log('complete');
                }
            );
        }

    }
    fs.writeFile("./../res/populars.json", JSON.stringify(popularRepos), function (err) {
            if (err) throw err;
            console.log('complete');
        }
    );
    return popularRepos
}

getRepoStats(uniques).then((res) => {
    console.log(res.length)
    // console.log(res)

    // fs.writeFile("./../res/populars.json", JSON.stringify(res), function (err) {
    //         if (err) throw err;
    //         console.log('complete');
    //     }
    // );

})
