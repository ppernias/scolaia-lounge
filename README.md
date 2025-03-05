# ScolaIA Lounge
AI-powered learning space for your community

## About
ScolaIA Lounge is a specialized web application designed to provide a collaborative space for sharing AI assistants. It's a companion application to ScolaIA Desk, focused on creating a comfortable environment for extended learning sessions.

## Overview
ScolaIA Lounge provides a dedicated space where users can create, collect and share assistants. You can install ScolaIA Lounge in your server and start your AI Engaged Community".

## Key Features
- Display Assisatnts from community in different orders and classifications
- Allows you, using an easy-to-use form, to create new assistants or modify the existing ones.
- Uses ADL, Assistant Description Language to describe accurately the assistant. Those assistants can be used on ChatGPT, OpenWebUI or ScolaIA Desk  
- Powered by your own ChatGPT API or local LLM (Ollama) to improve assistants description

### User Management System
- Secure user authentication
- Settings and default customization
- Session management

### Administrative Tools
- User management
- System configuration

### Security Features
- JWT-based authentication
- Encrypted sensitive data
- Secure configuration management
- Protected API endpoints

## Technical Architecture
ScolaIA Lounge is built using modern technologies:

- **Backend**: FastAPI (Python), SQLAlchemy
- **Frontend**: Jinja2 Templates, Bootstrap
- **Database**: SQLite with migrations
- **AI Integration**: OpenAI API
- **Authentication**: JWT system

## Setup
### Prerequisites
- Python 3.8 or higher
- Git
- Internet connection for OpenAI API access

### Installation
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Linux/Mac
# or
venv\Scripts\activate  # On Windows
```

2. Clone the repository:
```bash
git clone https://github.com/ppernias/scolaia-lounge.git
cd scolaia-lounge
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Start the server:
```bash
python run.py
```
Or alternatively:
```bash
uvicorn app.main:app --reload
```

Visit http://localhost:8000 to access the application.

## Network Access and Production Deployment
To make the server accessible from other computers:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production environments:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Autostart on System Boot
### Using Systemd (Linux)
1. Create a service file:
```bash
sudo nano /etc/systemd/system/scolaia-lounge.service
```

2. Add the following content (adjust paths according to your installation):
```ini
[Unit]
Description=ScolaIA Lounge Application Service
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/root/scolaia-lounge
Environment="PATH=/root/scolaia-lounge/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="PYTHONPATH=/root/scolaia-lounge"
ExecStart=/bin/bash -c 'source /root/scolaia-lounge/venv/bin/activate && python3 run.py'
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:
```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable scolaia-lounge.service

# Start the service
sudo systemctl start scolaia-lounge.service
```

4. Check status:
```bash
sudo systemctl status scolaia-lounge.service
```

5. Useful commands for service management:
```bash
# Stop the service
sudo systemctl stop scolaia-lounge.service

# Restart the service
sudo systemctl restart scolaia-lounge.service

# View service logs
sudo journalctl -u scolaia-lounge.service
```

## Troubleshooting
### PyYAML Installation Error
If you encounter PyYAML installation issues:

Install required development libraries:
```bash
# For Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y python3-dev libyaml-dev

# For Red Hat/CentOS
sudo yum install -y python3-devel libyaml-devel
```

## Security Notes
- The `SECRET_KEY` is used for encrypting sensitive data and signing tokens
- Changing the `SECRET_KEY` after deployment will:
  - Invalidate all existing sessions
  - Make encrypted data unreadable
- Store production secrets securely
- Never commit the `assistants.db` file to version control 