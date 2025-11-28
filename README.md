FadeChat – Private Local Messaging System

FadeChat is a fully independent, privacy-focused messaging system that runs entirely on localhost, without external APIs or databases. Messages are encrypted, disappear dynamically, and support real-time chat with a clean modern UI.

🔥 Key Features
🛡️ Security & Privacy

Secure authentication (bcrypt password hashing)

AES-256 encryption for all messages

No external servers – runs fully offline

Temporary chatrooms with join codes

Rooms are auto-deleted when the creator disconnects

💬 Real-time Communication

WebSocket-based bi-directional messaging

Dynamic disappearing messages based on chat activity

Smart chatroom lifecycle management

Standalone .exe support (desktop-ready)

🎨 Modern UI

Clean, responsive interface

Smooth fade animations

Dashboard with:

Create Chatroom

Join Chatroom via Code

🏁 Quick Start (Local Setup)
git clone <your-repository-link>
cd fadechat
npm install   # or pip install -r requirements.txt (depending on your backend)
npm start     # or python app.py


Then open in browser:

http://localhost:5000

🔐 Authentication Flow

Register with username + password

Password is stored using bcrypt hashing

Login redirects to DASHBOARD

🧠 Dashboard Overview

After login, users see:

Option	Description
Create Chatroom	Generates a new room + join code
Visit Chatroom	Join existing room using code

Once inside a chatroom:

Room code is shown in a corner

Creator leaving = room auto-deletes

All messages in that room are erased

Other users inside get redirected to dashboard

🧬 Chatroom Lifecycle
flowchart TD
    A[Login] --> B[Dashboard]
    B --> C[Create Chatroom]
    B --> D[Visit Chatroom via Code]
    C --> E[Real-time Encrypted Chat]
    D --> E
    E -->|Creator disconnects| F[Delete Room + Messages]
    F --> B

🔐 Message Security
Layer	Technique
Passwords	bcrypt hashing
Messages	AES-256 encryption
Transport	WebSockets
Storage	Local & temporary only
📦 Packaging as EXE (Standalone Build)

To create a .exe file:

pyinstaller --onefile --noconsole app.py


Or with Electron if using Node:

npm run build-electron

📌 Possible Future Enhancements
Category	Ideas
Security	2FA, screenshot alerts, encrypted exports
Chat UX	Typing indicator, message replies, voice notes
Rooms	Group chat, admin controls, polls
AI	Auto-replies, summary, mood detection
UI	Dark mode, themes, PWA install
File Sharing	Encrypted images/docs, self-destruct media
📁 Project Structure (Example)
fadechat/
│── public/           # HTML, CSS, client JS
│── server/           # Backend API + WebSocket logic
│── encryption/       # AES-256 helpers
│── rooms/            # In-memory room manager
│── auth/             # bcrypt authentication
│── config/           # Settings & keys
│── app.py / index.js # Main backend file
└── README.md

📜 License

Open-source — feel free to modify and build on top of FadeChat.

📞 Contact

For collaborations or improvements, feel free to reach out or open an issue on GitHub.