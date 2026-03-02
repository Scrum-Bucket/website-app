// src/MyApp.jsx
import React, { useState, useEffect } from "react";

function MyApp({ onLogin }) {
const [characters, setCharacters] = useState([]);

function removeOneCharacter(index, id) {
    console.log("Deleting id: ", id)
        if (!id) {
            console.log("Missing id for delete.");
            return;
        }
        fetch(`http://localhost:8000/users/${id}`, {method: "DELETE"})
        .then((res)=> 
            {
                if (res.status === 204){
                    setCharacters((prev) => prev.filter((_, i) => i !== index));
                }
                else if (res.status === 404) 
                    {
                        console.log("User not found.");
                    }
            }).catch((error) => console.log(error));
    };

    function updateList(person) {

        postUser(person)
  .then((res) => res.json())
  .then(() => fetchUsers())
  .then((res) => res.json())
  .then((json) => setCharacters(json["users_list"]))
  .catch((error) => console.log(error));

    }
    function fetchUsers() {
        const promise = fetch("http://localhost:8000/users");
        return promise;
    }
    useEffect(() => {
        fetchUsers()
            .then((res) => res.json())
            .then((json) => setCharacters(json["users_list"]))
            .catch((error) => { console.log(error); });
    }, [] );

    function postUser(person) {
        const promise = fetch("http://localhost:8000/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(person),
        });

        return promise;
    }


    return (
        <div className="page">
            <div className="floating">
                <div className="row">
                    <input type="text" placeholder="Username" />
                    <input type="password" placeholder="Password" />
                </div>
                <button type="button" className="login-button" onClick={onLogin}>Log In</button>
            </div>
        </div>
    );

}
export default MyApp;
