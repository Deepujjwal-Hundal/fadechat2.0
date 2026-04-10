# FadeChat Test Credentials

## Authentication
FadeChat uses ephemeral authentication - no persistent accounts.

### Login Requirements
- **Username**: Any alphanumeric string (e.g., "TestUser", "CyberAgent")
- **Password**: Any string (e.g., "test123", "securepass")

Note: Credentials are not stored. They are used only for the current session to establish WebSocket connection.

## Test Scenarios

### Basic Login
```
Username: TestAgent
Password: test123
```

### Room Testing
1. Create room as host
2. Copy 6-character room code (e.g., BHLEEF)
3. Open new browser/incognito window
4. Login with different username
5. Enter room code to join

### Server Endpoints
- Health Check: `GET http://localhost:3000/health`
- Frontend: `http://localhost:5173`

### Room Codes
Room codes are auto-generated 6-character alphanumeric strings (e.g., BHLEEF, EH5P9P)
