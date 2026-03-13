const backend = require("../src/backend.js");
const database = require("../src/database");
const userSchema = require("../src/user/user.js");
const userServices = require("../src/user/user-services.js");
const songsSchema = require("../src/songs/song.js");
const songsServices = require("../src/songs/song-services.js");

//initialize database models and mongo server
let userModel;
let songModel;
let mongoServer;

//helper function to connect to database
async function conenctToCloudDbHelper(){
    try{ //connect to database
        backend.setDatabaseConn(await database.connect());
    }catch(err){ //error check
        console.log(err);
    }
}

//automatically connect to database before all tests
beforeAll(async () => {await conenctToCloudDbHelper()});
//automatically disconnect from database after all tests
afterAll(async () => {await database.disconnect()})

//in case we need to run something before/after each test
beforeEach(async() => {});
afterEach(async() => {});

test("test app runs", async() => {
    const result = await (backend.app).get("/");
    console.log("App check: ", result);
    expect(result).toBe("Backend running.");
});
