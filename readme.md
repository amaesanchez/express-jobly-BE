# Jobly (backend)
RESTful API for job application platform. Built to exercise implementation of authentication/authorization features, while following TDD approach.

Deployed on: [asanchez-jobly.surge.sh](https://asanchez-jobly.surge.sh)  
**User: guest  
Password: password**  

*Please be patient on load

To access backend codebase: https://github.com/amaesanchez/react-jobly-frontend.git

## Local Setup

1. Seed `jobly` and `jobly_test` databases in PostgreSQL.

    ```
    psql -f jobly.sql
    ```
    
2. Install dependencies and run app.

    ```
    npm install
    npm start
    ```
    
Will be running on localhost:3001.

## Testing
99% Test Coverage  
Run the following in CLI.  
```
jest -i
```

## TODO
- [ ] Implement more detailed dashboard for tracking applications
- [ ] Add additional tests to hit 100% coverage
