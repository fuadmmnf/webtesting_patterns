const {MongoClient, ObjectId} = require("mongodb")
const glob = require("glob");
const fs = require("fs");
// const {next} = require("mongodb/src/cursor/abstract_cursor");
const dbURL = "mongodb://localhost:27017"
const client = new MongoClient(dbURL)
let db = null
const projectRepoInfos = JSON.parse(fs.readFileSync('./../res/populars.json', 'utf8'));

const rawResDir = './../res/dataset/*/'


async function createSnapshotDoc(snapshotsCollection, prevId, snapshot, nextId) {
    const snapDoc = {
        _id: new ObjectId(),
        url: snapshot.url,
        prev: prevId,
        next: nextId,
        element: ((snapshot.element === undefined || Object.keys(snapshot.element).length === 0) ? {} : {
            html: snapshot.element.html,
            tag: snapshot.element.tag,
            screenshot_path: snapshot.element.screenshot.split('/').slice(3).join('/')
        }),
        page: ((snapshot.page === undefined || Object.keys(snapshot.page).length === 0)? {} : {
            html: snapshot.page.html,
            tag: snapshot.page.tag,
            screenshot_path: snapshot.page.screenshot.split('/').slice(3).join('/')
        }),
    }
    await snapshotsCollection.insertOne(snapDoc)
    return snapDoc
}

async function handleTestLog(projId, specName, testLogs) {
    const testsCollection = db.collection('tests')
    const commandsCollection = db.collection('commands')
    const snapshotsCollection = db.collection('snapshots')
    for (let testLog of testLogs) {
        const testDoc = {
            _id: new ObjectId(),
            project_id: projId,
            title: testLog.title,
            spec_file: specName,
            num_commands: testLog.commands.length,
            num_asserts: testLog.commands.filter(c => c.info.method === 'assert').length,
        }
        await testsCollection.insertOne(testDoc)
        let prevSnap = null
        let afterSnap = null
        for (let commandLog of testLog.commands) {
            // create before snapshot
            if (prevSnap === null) {
                prevSnap = await createSnapshotDoc(snapshotsCollection, null, commandLog.snapshot.before, null)
            }
            // create after snapshot
            afterSnap = await createSnapshotDoc(snapshotsCollection, null, commandLog.snapshot.after, null)

            await commandsCollection.insertOne({
                _id: new ObjectId(),
                test_id: testDoc._id,
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


async function retrieveProjects() {
    glob(rawResDir, async function (err, dirs) {
        const projectCollection = db.collection('projects')
        for (let projectDir of dirs) {
            let arr = projectDir.split('/')
            const projName = arr[arr.length - 2]
            let projObj = projectRepoInfos.find((obj) => {
                return obj.url.includes(projName)
            })
            projObj = await projectCollection.insertOne({
                _id: new ObjectId(),
                name: projName,
                repo_url: projObj.url,
                updated_at: projObj.updated,
            })
            // console.log('aise')

            //get project spec logs

            glob(projectDir + 'test*.json', async function (err, specs) {
                for (let specFile of specs) {
                    arr = specFile.split('/')
                    const specName = arr[arr.length - 1].replace('test_', '').replace('.json', '').replace('_', '.')
                    const testLogs = JSON.parse(fs.readFileSync(specFile, 'utf8'));
                    await handleTestLog(projObj._id, specName, testLogs)

                }
            });

        }
    })
}


async function main() {
    // Use connect method to connect to the server
    await client.connect();
    db = client.db('webev');
    await db.createCollection('projects')
    await db.createCollection('tests')
    await db.createCollection('commands')
    await db.createCollection('snapshots')
    await retrieveProjects()
}

main()
    .catch(console.error)
    // .finally(() => client.close());

