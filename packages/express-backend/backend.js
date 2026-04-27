// backend.js
import express, { response } from "express";
import cors from "cors";
import userServices from "./user-services.js";

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

app.get("/users", (req, res) => {
  const name = req.query.name;
  const job = req.query.job;

  userServices
    .getUsers(name, job)
    .then((users) => res.json({ users_list: users }));
});

app.get("/users/:id", (req, res) => {
  const id = req.params["id"]; //or req.params.id

  userServices.findUserById(id).then((user) => {
    if (user === undefined) return res.status(404).send("Resource not found.");
    res.json(user);
  });
});

//endpoint to search for a youtube song
app.get("/youtube/:link", (req, res) => {
  const Ylink = req.params["link"]; //or req.params.id
    const apikey = "";
    //make GET request to youtube API 
    const promise = fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${Ylink}&maxResults=1&key=${apikey}`, {
      method: "GET",
      headers: {
        "part": "snippet",
        "channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
        "maxResults": 1,
      },
    }).then(async (response) =>{
        const content = await response.json()
        console.log(content);
      }

    ).catch((error) => console.log(error))

});

app.get("/", (req, res) => {
  res.send("Hello World! It's a me, Chris!");
});

app.post("/users", (req, res) => {
  userServices
    .addUser(req.body)
    .then((created) => res.status(201).json(created));
});

app.delete("/users/:id", (req, res) => {
  const id = req.params["id"]; //or req.params.id

  userServices.deleteUserById(id).then((user) => {
    if (user === undefined) return res.status(404).send("Resource not found.");
    res.status(204).send("User deleted");
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
