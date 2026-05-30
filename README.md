# website-app

This app is currently in CI/CD as of 05/09/2026. As a result, you can look at the website here:
frontend: https://polite-sea-008d19c10.7.azurestaticapps.net/
backend: https://crabrave-g0ave8bxcmgxasa0.westus3-01.azurewebsites.net/users

At the present time, accessing the backend requires an authentication token (from an .env file) which will be required for accessing or modifying data in the backend.

To test api endpoints, install supertest: `npm install supertest`

To run backend and frontend at once in root, install concurrently: `npm install concurrently`

Style: JS Style Guide

To initialize the packages:
Install jsonwebtokens to root by running: `npm install jsonwebtokens`
Install vite in frontend by running `npm install vite` in packages/react-frontend
Then, in stall express in backend by running `npm install express` and `npm install bcrypt` in packages/express-backend

To run this website, you need both the frontend and backend:
Run `npm run dev` in a terminal in the following directories:

1. packages/express-backend
2. packages/react-frontend

## Code Coverage

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   99.24 |     86.2 |     100 |     100 |
 src               |     100 |      100 |     100 |     100 |
  backend.js       |     100 |      100 |     100 |     100 |
 src/songs         |   94.11 |       60 |     100 |     100 |
  song-services.js |   92.85 |       60 |     100 |     100 | 24-35
  song.js          |     100 |      100 |     100 |     100 |
 src/user          |     100 |     87.5 |     100 |     100 |
  user-services.js |     100 |     87.5 |     100 |     100 | 68-69
  user.js          |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------

Test Suites: 2 passed, 2 total
Tests:       50 passed, 50 total
Snapshots:   0 total
Time:        1.819 s
```

## Documentation

- [Product Specification](https://docs.google.com/document/d/1mHLF9VbAohl15Izfi-5ZskFS4eX-vD1d_WkiqiE46fQ/edit?tab=t.0)
- [Project Wiki](https://github.com/Scrum-Bucket/website-app/wiki)

## Demo

- [Watch the Demo Video](https://drive.google.com/file/d/1uAM1H02-eCvunkPq36HE16gq0xVT5WIq/view?usp=sharing)
