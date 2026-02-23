// src/MyApp.jsx
import React, { useState, useEffect } from "react";
import Table from "./Table";
import Form from "./Form";

function MyApp() {
    const [characters, setCharacters] = useState([]);

    function fetchUsers() {
        const promise = fetch("http://localhost:8000/users");
        return promise;
    }

    useEffect(() => {
        fetchUsers()
            .then((res) => res.json())
            .then((json) => setCharacters(json["users_list"]))
            .catch((error) => { console.log(error); });
    }, []);

    function postUser(person) {
        const promise = fetch("http://localhost:8000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(person),
        })

        return promise;
    }

    function updateList(person) {
        postUser(person)
            .then(res => {
                if (res.status !== 201) {
                    throw new Error(`Status: ${res.status}`);
                }
                return fetchUsers(); // use response body
            })
            .then(res => res.json())
            .then(json => setCharacters(json.users_list))
            .catch(err => {
                console.error("Update failed:", err);
            });
    }

    function removeOneCharacter(index) {
        const id = characters[index]._id;
        const link = "http://localhost:8000/users" + "/" + id;

        const promise = fetch(link, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        }).then(res => {
            if (res.status === 404) {
                throw new Error(`Status: ${res.status} (Not Found)`);
            }
            if (res.status !== 204) {
                throw new Error(`Status: ${res.status}`);
            }
        }).catch(err => {
            console.error("Update failed:", err);
            return;
        });

        const updated = characters.filter((character, i) => {
            return i !== index;
        });
        setCharacters(updated);
    }

    return (
        <div className="container">
            <Table
                characterData={characters}
                removeCharacter={removeOneCharacter}
            />
            <Form handleSubmit={updateList} />
        </div>
    );
}

export default MyApp;