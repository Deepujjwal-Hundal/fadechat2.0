#!/usr/bin/env python3
"""
FadeChat Backend API Testing
Tests Socket.IO endpoints and functionality
"""

import requests
import socketio
import sys
import time
import json
from datetime import datetime

class FadeChatTester:
    def __init__(self, server_url="http://localhost:3000"):
        self.server_url = server_url
        self.sio = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = None
        self.room_data = None
        self.messages_received = []
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")

    def run_test(self, name, test_func):
        """Run a single test"""
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            result = test_func()
            if result:
                self.tests_passed += 1
                self.log(f"✅ {name} - PASSED", "PASS")
            else:
                self.log(f"❌ {name} - FAILED", "FAIL")
            return result
        except Exception as e:
            self.log(f"❌ {name} - ERROR: {str(e)}", "ERROR")
            return False

    def test_health_endpoint(self):
        """Test server health endpoint"""
        try:
            response = requests.get(f"{self.server_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log(f"Server status: {data.get('status')}, Uptime: {data.get('uptime'):.1f}s")
                return data.get('status') == 'operational'
            return False
        except Exception as e:
            self.log(f"Health check failed: {e}")
            return False

    def test_socket_connection(self):
        """Test Socket.IO connection"""
        try:
            self.sio = socketio.Client()
            
            # Set up event handlers
            @self.sio.event
            def connect():
                self.log("Socket.IO connected successfully")
            
            @self.sio.event
            def disconnect():
                self.log("Socket.IO disconnected")
            
            @self.sio.event
            def new_message(data):
                self.messages_received.append(data)
                self.log(f"Received message: {data.get('content', 'N/A')}")
            
            @self.sio.event
            def user_joined(data):
                self.log(f"User joined: {data.get('username')}")
            
            @self.sio.event
            def room_destroyed(data):
                self.log(f"Room destroyed: {data.get('reason')}")
            
            self.sio.connect(self.server_url)
            time.sleep(1)  # Wait for connection
            return self.sio.connected
        except Exception as e:
            self.log(f"Socket connection failed: {e}")
            return False

    def test_user_login(self):
        """Test user login/authentication"""
        if not self.sio or not self.sio.connected:
            return False
        
        try:
            test_username = f"TestUser_{int(time.time())}"
            test_avatar = "https://static.prod-images.emergentagent.com/jobs/40ed10e7-4341-44f1-a335-d3799264c5f6/images/0b4bbd5166b060c5ee660bb9b5de42ee0cef85aa28430c69e4256ad22f1814bd.png"
            
            # Send login request
            response = self.sio.call('login', {
                'username': test_username,
                'avatar': test_avatar
            }, timeout=5)
            
            if response and response.get('success'):
                self.user_data = response.get('user')
                self.log(f"Login successful for user: {test_username}")
                self.log(f"User ID: {self.user_data.get('id')}")
                self.log(f"Security status: {response.get('security')}")
                return True
            else:
                self.log(f"Login failed: {response}")
                return False
        except Exception as e:
            self.log(f"Login test failed: {e}")
            return False

    def test_create_room(self):
        """Test room creation"""
        if not self.sio or not self.user_data:
            return False
        
        try:
            room_settings = {
                'settings': {
                    'autoDestructTime': 60,
                    'allowFileSharing': True,
                    'allowVoiceMessages': True,
                    'maxParticipants': 10
                },
                'theme': {
                    'primaryColor': 'cyan',
                    'name': 'Cyber Frost'
                }
            }
            
            response = self.sio.call('create_room', room_settings, timeout=5)
            
            if response and response.get('success'):
                self.room_data = response.get('room')
                self.log(f"Room created successfully")
                self.log(f"Room code: {self.room_data.get('code')}")
                self.log(f"Room ID: {self.room_data.get('id')}")
                self.log(f"Theme: {self.room_data.get('theme', {}).get('name')}")
                return True
            else:
                self.log(f"Room creation failed: {response}")
                return False
        except Exception as e:
            self.log(f"Room creation test failed: {e}")
            return False

    def test_send_message(self):
        """Test sending encrypted message"""
        if not self.sio or not self.room_data:
            return False
        
        try:
            test_message = {
                'id': f"msg_{int(time.time())}",
                'roomId': self.room_data['id'],
                'senderId': self.user_data['id'],
                'senderName': self.user_data['username'],
                'content': 'Test encrypted message content',
                'iv': 'test_iv_string',
                'timestamp': int(time.time() * 1000),
                'ttl': 60,
                'type': 'TEXT'
            }
            
            self.sio.emit('send_message', test_message)
            time.sleep(2)  # Wait for message to be processed
            
            # Check if we received the message back
            if self.messages_received:
                self.log(f"Message sent and received successfully")
                return True
            else:
                self.log("Message sent but not received back")
                return False
        except Exception as e:
            self.log(f"Send message test failed: {e}")
            return False

    def test_room_settings_update(self):
        """Test updating room settings"""
        if not self.sio or not self.room_data:
            return False
        
        try:
            new_settings = {
                'autoDestructTime': 120,
                'allowFileSharing': False
            }
            
            new_theme = {
                'primaryColor': 'magenta',
                'name': 'Neon Pulse'
            }
            
            self.sio.emit('update_room_settings', {
                'roomId': self.room_data['id'],
                'settings': new_settings,
                'theme': new_theme
            })
            
            time.sleep(1)  # Wait for update
            self.log("Room settings update sent successfully")
            return True
        except Exception as e:
            self.log(f"Room settings update test failed: {e}")
            return False

    def test_typing_indicators(self):
        """Test typing start/stop functionality"""
        if not self.sio or not self.room_data:
            return False
        
        try:
            # Start typing
            self.sio.emit('typing_start', self.room_data['id'])
            time.sleep(1)
            
            # Stop typing
            self.sio.emit('typing_stop', self.room_data['id'])
            time.sleep(1)
            
            self.log("Typing indicators sent successfully")
            return True
        except Exception as e:
            self.log(f"Typing indicators test failed: {e}")
            return False

    def test_leave_room(self):
        """Test leaving room"""
        if not self.sio or not self.room_data:
            return False
        
        try:
            self.sio.emit('leave_room', self.room_data['id'])
            time.sleep(1)
            self.log("Leave room request sent successfully")
            return True
        except Exception as e:
            self.log(f"Leave room test failed: {e}")
            return False

    def cleanup(self):
        """Clean up connections"""
        if self.sio and self.sio.connected:
            self.sio.disconnect()
            self.log("Socket.IO connection closed")

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting FadeChat Backend Tests", "START")
        self.log("=" * 50)
        
        # Test sequence
        tests = [
            ("Server Health Check", self.test_health_endpoint),
            ("Socket.IO Connection", self.test_socket_connection),
            ("User Login/Authentication", self.test_user_login),
            ("Room Creation", self.test_create_room),
            ("Send Message", self.test_send_message),
            ("Room Settings Update", self.test_room_settings_update),
            ("Typing Indicators", self.test_typing_indicators),
            ("Leave Room", self.test_leave_room),
        ]
        
        for test_name, test_func in tests:
            success = self.run_test(test_name, test_func)
            if not success and test_name in ["Server Health Check", "Socket.IO Connection", "User Login/Authentication"]:
                self.log(f"Critical test failed: {test_name}. Stopping tests.", "CRITICAL")
                break
            time.sleep(0.5)  # Brief pause between tests
        
        # Results
        self.log("=" * 50)
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run} passed", "RESULT")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!", "SUCCESS")
            return 0
        else:
            self.log(f"❌ {self.tests_run - self.tests_passed} tests failed", "FAILURE")
            return 1

def main():
    tester = FadeChatTester()
    try:
        exit_code = tester.run_all_tests()
        return exit_code
    except KeyboardInterrupt:
        tester.log("Tests interrupted by user", "INTERRUPT")
        return 1
    except Exception as e:
        tester.log(f"Unexpected error: {e}", "ERROR")
        return 1
    finally:
        tester.cleanup()

if __name__ == "__main__":
    sys.exit(main())