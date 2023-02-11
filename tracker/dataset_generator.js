const {MongoClient, ObjectId} = require("mongodb")
const glob = require("glob");
const fs = require("fs");
const dbURL = "mongodb://localhost:27017"
const client = new MongoClient(dbURL)
const projectRepoInfos = JSON.parse(fs.readFileSync('./../res/populars.json', 'utf8'));

const rawResDir = './../res/dataset/*/'

async function retrieveProjects(db) {
    const dirs = await glob(rawResDir);
    const projectCollection = db.collection('projects')
    for (let project in dirs) {
        let arr = project.split('/')
        const projName = arr[arr.length - 2]
        let projObj = projectRepoInfos.find(obj => {
            return obj.url.includes(projName)
        })
        await projectCollection.insertOne({
            _id: ObjectId(),
            name: projName,
            repo_url: projObj.url,
            updated_at: projObj.updated,
        })
    }

}


async function main() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db('webev');
    await db.createCollection('projects')
    await db.createCollection('tests')
    await db.createCollection('commands')
    await db.createCollection('snapshots')
    await retrieveProjects(db)
}

main()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());

