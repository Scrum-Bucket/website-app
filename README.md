# website-app

This app is currently in CI/CD as of 05/09/2026. As a result, you can look at the website here:
frontend: https://polite-sea-008d19c10.7.azurestaticapps.net/
backend: https://crabrave-g0ave8bxcmgxasa0.westus3-01.azurewebsites.net/users
(The rest of this README shall be for running locally)

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

## Backend Authentication

Protected backend endpoints require authentication. Use `BACKEND_ACCESS_TOKEN` for the shared backend sign-in/token flow and `TOKEN_SECRET` for signing backend and frontend user session tokens. Public routes such as frontend login, signup, and room join remain available without a backend access token.

## Code Coverage

```
-----------------------|---------|----------|---------|---------|--------------------------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                    
-----------------------|---------|----------|---------|---------|--------------------------------------
All files              |   94.39 |    84.49 |   94.37 |   96.22 |                                      
 src                   |   91.17 |       82 |   94.11 |   92.07 |                                      
  auth.js              |   90.38 |     81.5 |   93.93 |   91.33 | 38,71,86,129,222-226,389,397,414-418 
  backend.js           |     100 |      100 |     100 |     100 |                                      
  env.js               |     100 |      100 |     100 |     100 |                                      
 src/app               |     100 |      100 |     100 |     100 |                                      
  createApp.js         |     100 |      100 |     100 |     100 |                                      
 src/http              |     100 |    88.09 |     100 |     100 |                                      
  cors-config.js       |     100 |       92 |     100 |     100 | 31,67                                
  rate-limit.js        |     100 |    82.35 |     100 |     100 | 12,14,16                             
  security-headers.js  |     100 |      100 |     100 |     100 |                                      
 src/jobs              |     100 |    83.33 |     100 |     100 |                                      
  activity-cleanup.js  |     100 |    83.33 |     100 |     100 | 17                                   
 src/rooms             |   96.25 |    82.16 |   94.66 |   97.89 |                                      
  room-services.js     |   96.21 |    82.16 |   94.59 |   97.87 | 344,385-386,390-391,395-396          
  room.js              |     100 |      100 |     100 |     100 |                                      
 src/routes            |   93.15 |    87.13 |   91.97 |    95.7 |                                      
  index.js             |     100 |      100 |     100 |     100 |                                      
  rooms.js             |   95.31 |    90.82 |   96.15 |   96.96 | 72,114,126,133,251                   
  songs.js             |   97.05 |    83.33 |     100 |     100 | 35                                   
  users.js             |   88.46 |       80 |   85.48 |    93.1 | 38,52,65,135,212,225,239,253,260,267 
  youtube.js           |   95.74 |    83.33 |     100 |   95.65 | 54,84                                
 src/songs             |     100 |    85.18 |     100 |     100 |                                      
  song-services.js     |     100 |    85.18 |     100 |     100 | 12,23-25,30,36-43,74,91              
  song.js              |     100 |      100 |     100 |     100 |                                      
 src/user              |   88.88 |    82.79 |      96 |   92.68 |                                      
  user-services.js     |    88.4 |    82.79 |   95.65 |    92.3 | 26,85,203-205,268-272                
  user.js              |     100 |      100 |     100 |     100 |                                      
 src/utils             |     100 |      100 |     100 |     100 |                                      
  room-code.js         |     100 |      100 |     100 |     100 |                                      
  room-member-token.js |     100 |      100 |     100 |     100 |                                      
  user-response.js     |     100 |      100 |     100 |     100 |                                      
 src/youtube           |     100 |       84 |     100 |     100 |                                      
  youtube-services.js  |     100 |       84 |     100 |     100 | 21,38-39,74                          
-----------------------|---------|----------|---------|---------|--------------------------------------

Test Suites: 9 passed, 9 total
Tests:       144 passed, 144 total
Snapshots:   0 total
Time:        7.161 s
```

## Documentation

- [Product Specification](https://docs.google.com/document/d/1mHLF9VbAohl15Izfi-5ZskFS4eX-vD1d_WkiqiE46fQ/edit?tab=t.0)
- [Project Wiki](https://github.com/Scrum-Bucket/website-app/wiki)

## Demo

- [Watch the Demo Video](https://drive.google.com/file/d/1rmpGDGdh6IHPgCBreRHODINfcsR-u21x/view?usp=sharing)
