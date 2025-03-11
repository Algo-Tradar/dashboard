import os
import json
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import base64
import requests

# Load environment variables and store the .env path
load_dotenv()
ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'C:/Users/USER/Desktop/trading analysis/mantis/mantis-free-react-admin-template/.env'))

# Get the Gmail webhook credentials from env
GMAIL_WEBHOOK = os.getenv("GMAIL_WEBHOOK")
GMAIL_TOKEN = os.getenv("GMAIL_TOKEN")

# Check if the GMAIL_WEBHOOK is available
if not GMAIL_WEBHOOK:
    raise ValueError(f"GMAIL_WEBHOOK not found in .env file at: {ENV_PATH}")

try:
    # Convert JSON string to dictionary
    credentials_data = json.loads(GMAIL_WEBHOOK)
except json.JSONDecodeError as e:
    print(f"Error parsing GMAIL_WEBHOOK JSON in {ENV_PATH}. Make sure it's properly formatted.")
    raise

# Define required scopes and paths
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def update_env_with_token(token_json):
    """Update .env file with new token"""
    if not os.path.exists(ENV_PATH):
        print(f"Error: .env file not found at {ENV_PATH}")
        return
    
    # Read all lines from .env
    with open(ENV_PATH, 'r') as file:
        lines = file.readlines()
    
    token_line_exists = False
    # Update the GMAIL_TOKEN line if it exists
    for i, line in enumerate(lines):
        if line.startswith('GMAIL_TOKEN='):
            lines[i] = f'GMAIL_TOKEN=\'{token_json}\'\n'
            token_line_exists = True
            break
    
    # Add GMAIL_TOKEN line if it doesn't exist
    if not token_line_exists:
        # Ensure there's a newline before adding new entry
        if lines and not lines[-1].endswith('\n'):
            lines.append('\n')
        lines.append(f'GMAIL_TOKEN=\'{token_json}\'\n')
    
    # Write back to .env
    with open(ENV_PATH, 'w') as file:
        file.writelines(lines)
    print("Updated GMAIL_TOKEN in .env")

def get_credentials():
    """Get valid credentials, using cached token if available."""
    creds = None
    
    # Try to use existing token if available
    if GMAIL_TOKEN:
        try:
            token_data = json.loads(GMAIL_TOKEN)
            creds = Credentials.from_authorized_user_info(token_data, SCOPES)
            print("Using existing token")
        except Exception as e:
            print(f"Error loading existing token: {e}")
    
    # If no valid token, use web credentials to get new token
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired token")
            try:
                creds.refresh(Request())
                update_env_with_token(creds.to_json())
            except Exception as e:
                print(f"Error refreshing token: {e}")
                creds = None
        
        if not creds:
            print("Getting new token using web credentials")
            try:
                flow = InstalledAppFlow.from_client_config(credentials_data, SCOPES)
                creds = flow.run_local_server(port=8080, access_type='offline', prompt='consent')
                update_env_with_token(creds.to_json())
            except Exception as e:
                print(f"Error in OAuth flow: {e}")
                return None

    return creds

def get_email_content(service, msg_id):
    """Get the decoded email content"""
    try:
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        payload = message.get('payload', {})
        
        # Try to get plain text content
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data:
                        return base64.urlsafe_b64decode(data).decode('utf-8')
        elif 'body' in payload and 'data' in payload['body']:
            data = payload['body']['data']
            return base64.urlsafe_b64decode(data).decode('utf-8')
        
        return "No plain text content available"
    except Exception as e:
        return f"Error getting content: {str(e)}"

def parse_email_data(service, msg_data):
    """Extract content from TradingView alerts, returns content string or None"""
    headers = msg_data.get('payload', {}).get('headers', [])
    
    from_address = ""
    subject = ""
    date = ""

    for header in headers:
        name = header.get('name', '').lower()
        if name == 'from':
            from_address = header.get('value', '')
        elif name == 'subject':
            subject = header.get('value', '')
        elif name == 'date':
            date = header.get('value', '')

    # Check if the email is from today
    email_date = datetime.strptime(date, '%a, %d %b %Y %H:%M:%S %z')
    if email_date.date() != datetime.now().date():
        return None

    # Determine the cryptocurrency from the subject
    if "BTC Indicators Updates" in subject:
        crypto = "BTCUSDT"
    elif "ETH Indicators Updates" in subject:
        crypto = "ETHUSDT"
    elif "SOL Indicators Updates" in subject:
        crypto = "SOLUSDT"
    else:
        return None

    # Only process TradingView alerts with "Indicators Updates"
    if "TradingView" in from_address and "Indicators Updates" in subject:
        content = get_email_content(service, msg_data['id'])
        if "Indicators Updates" in content:
            return crypto, content
    return None

def get_alerts():
    try:
        creds = get_credentials()
        if not creds:
            print("Failed to obtain valid credentials")
            return None

        service = build('gmail', 'v1', credentials=creds)
        four_hours_ago = int((datetime.now() - timedelta(hours=4)).timestamp())
        query = f"in:inbox after:{four_hours_ago}"
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])

        if not messages:
            return None

        all_alerts = {}
        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
            parsed_data = parse_email_data(service, msg_data)
            if parsed_data:
                crypto, content = parsed_data
                indicators = extract_indicators(content)
                if indicators:
                    all_alerts[crypto] = indicators

        return all_alerts if all_alerts else None

    except Exception as e:
        print(f"Error reading Gmail: {str(e)}")
        return None

def extract_indicators(content):
    """Extract indicator values from email content."""
    lines = content.splitlines()
    indicators = {}
    for line in lines:
        if "Knn Moving Average:" in line:
            indicators['knnMovingAverage'] = line.split(":")[1].strip()
        elif "Keltner Channels:" in line:
            indicators['keltnerChannels'] = line.split(":")[1].strip()
        elif "AI Trend Navigator:" in line:
            indicators['aiTrendNavigator'] = line.split(":")[1].strip()
    return indicators

def update_api_data(new_data):
    """Update the API data with new indicator values."""
    try:
        response = requests.post('http://127.0.0.1:5000/api/update_indicators', json=new_data)
        if response.ok:
            print("API data updated:", response.json())
        else:
            print("Failed to update API data:", response.text)
    except Exception as e:
        print(f"Error updating API data: {str(e)}")

if __name__ == "__main__":
    alerts = get_alerts()
    if alerts:
        update_api_data(alerts)
