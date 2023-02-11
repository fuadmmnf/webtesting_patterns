const {MongoClient, ObjectId} = require("mongodb")
const glob = require("glob");
const fs = require("fs");
const {next} = require("mongodb/src/cursor/abstract_cursor");
const dbURL = "mongodb://localhost:27017"
const client = new MongoClient(dbURL)
const projectRepoInfos = JSON.parse(fs.readFileSync('./../res/populars.json', 'utf8'));

const rawResDir = './../res/dataset/*/'


async function createSnapshotDoc(snapshotsCollection, prevId, snapshot, nextId) {
    return await snapshotsCollection.insertOne({
        _id: ObjectId(),
        url: snapshot.url,
        prev: prevId,
        next: nextId,
        element: (snapshot.element === undefined || snapshot.element.keys().length === 0 ? {} : {
            html: snapshot.element.html,
            tag: snapshot.element.tag,
            screenshot_path: snapshot.element.screenshot.split('/').slice(3).join('/')
        }),
        page: (snapshot.page === undefined || snapshot.page.keys().length === 0 ? {} : {
            html: snapshot.page.html,
            tag: snapshot.page.tag,
            screenshot_path: snapshot.page.screenshot.split('/').slice(3).join('/')
        }),
    })
}

async function handleTestLog(db, projId, specName, testLogs) {
    const testsCollection = db.collection('tests')
    const commandsCollection = db.collection('commands')
    const snapshotsCollection = db.collection('snapshots')
    for (let testLog in testLogs) {
        const testObj = await testsCollection.insertOne({
            _id: ObjectId(),
            project_id: projId,
            title: testLog.title,
            spec_file: specName,
            num_commands: testLog.commands.length,
            num_asserts: testLog.commands.filter(c => c.info.method === 'assert').length,
        })
        let prevSnap = null
        let afterSnap = null
        for (let commandLog in testLog.commands) {
            // create before snapshot
            if(prevSnap === null){
                prevSnap = await createSnapshotDoc(snapshotsCollection, null, commandLog.snapshot.before, null)
            }
            // create after snapshot
            afterSnap = await createSnapshotDoc(snapshotsCollection, null, commandLog.snapshot.after, null)

            await commandsCollection.insertOne({
                _id: ObjectId(),
                test_id: testObj._id,
                info: commandLog.info,
                snapshots: {
                    before: prevSnap._id,
                    after: afterSnap._id,
                }
            })
            prevSnap = afterSnap
        }
    }
}


async function retrieveProjects(db) {
    const dirs = await glob(rawResDir);
    const projectCollection = db.collection('projects')
    for (let projectDir in dirs) {
        let arr = projectDir.split('/')
        const projName = arr[arr.length - 2]
        let projObj = projectRepoInfos.find(obj => {
            return obj.url.includes(projName)
        })
        projObj = await projectCollection.insertOne({
            _id: ObjectId(),
            name: projName,
            repo_url: projObj.url,
            updated_at: projObj.updated,
        })

        //get project spec logs
        const specs = await glob(projectDir + 'test*.json');
        for (let specFile in specs) {
            arr = specFile.split('/')
            const specName = arr[arr.length - 1].replace('test_', '').replace('.json', '').replace('_', '.')
            const testLogs = JSON.parse(fs.readFileSync(specFile, 'utf8'));
            await handleTestLog(db, projObj._id, specName, testLogs)

        }
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

