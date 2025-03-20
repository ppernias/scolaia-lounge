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
python3 run.py
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
<<<<<<< HEAD
- Never commit the `assistants.db` file to version control 
=======
- Never commit the `assistants.db` file to version control 

# Initial Configuration
The first user to register will be considered the administrator. They will have access to all areas of the system except the decrypted information about users' passwords.

An administrator can assign or revoke the administrator level to other administrators.

## Getting Started:

-   Once the administrator has registered, they must go to the “settings” option and fill in the fields in the general tab: “owner_email,” “owner_name,” and “owner_organization.” These fields are required to later configure the service for sending emails to users.

- Next, it is recommended to fill in the requested data in the “Mail” tab in order to activate the email sending service. After doing so, test the service by clicking on “Test eMail” in the settings section.

- Then, you should enter the API KEY obtained from OpenAI (https://platform.openai.com → settings → API Keys).

- After entering the openapi_apikey, click on “Test OpenAI” to load the available models, and then edit the “openai_model” field.

- The other fields are optional and can be used if, instead of using the OpenAI API service, you use another compatible service.

- If using a local API service based on Ollama/OpenWebUI, you must fill in the Ollama tab. You can also test it by clicking on “Test Ollama” in the settings.

- The Improve tab is used to modify the prompt-assistant and tools improvement service using the configured API connection.

- The administrator must also complete their profile by going to “My Profile” and filling in any missing information.

## License of Use: Apache 2.0 @2025, Pedro A Pernias

1. Grant of Rights

You are free to use, copy, modify, and distribute covered works, including for commercial purposes.
You do not have to release your modifications under the same license, but you must maintain the required notices and disclaimers.

2. Patent Protection

The license includes a patent grant: contributors automatically provide users with a license to their patents related to the contributed code.
This grant terminates if you engage in a patent lawsuit claiming that the software infringes your patents.

3. Requirements and Notices

You must include a copy of the Apache License 2.0 and the original copyright statements with any copies or substantial portions of the software.
If you modify the software, you should note significant changes in your source files.

4. Disclaimer of Warranty and Limitation of Liability

The software is provided “as is,” without warranties or conditions of any kind.
Neither the authors nor contributors accept liability for any damages arising from its use.

5. Trademark Use

The license does not grant permission to use contributors’ trademarks. Separate permission may be required.
For full details, please refer to the Apache License 2.0 text. If you have specific concerns, consult a qualified legal professional.
>>>>>>> a23228ae31fda26b4cfbcd8b1bfe73e1db7607ec
