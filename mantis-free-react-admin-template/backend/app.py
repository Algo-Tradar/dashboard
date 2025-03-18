import os
import json
import pymysql
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import base64
import requests

# Load environment variables
load_dotenv()

# Initialize the Flask application
app = Flask(__name__)
# Configure CORS to allow requests from any origin
CORS(app)

# Initialize dictionaries to store data
indicator_data = {}
crypto_data = {
    'Fear-Greed': {},
    'Mining-Cost': {},
    'Distribution': {},
    'Google-Trends': {},
    'Order-Book': {},
    'Entities': {}
}

# Gmail Configuration
GMAIL_WEBHOOK = os.getenv("GMAIL_WEBHOOK")
GMAIL_TOKEN = os.getenv("GMAIL_TOKEN")
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Database Configuration
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = int(os.getenv('DB_PORT'))
WEB_DB_NAME = os.getenv('WEB_DB_NAME')

ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env')

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
    """Get valid credentials for Gmail API"""
    creds = None
    
    if GMAIL_TOKEN:
        try:
            token_data = json.loads(GMAIL_TOKEN)
            creds = Credentials.from_authorized_user_info(token_data, SCOPES)
        except Exception as e:
            print(f"Error loading existing token: {e}")
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                update_env_with_token(creds.to_json())
            except Exception as e:
                print(f"Error refreshing token: {e}")
                creds = None
        
        if not creds:
            try:
                credentials_data = json.loads(GMAIL_WEBHOOK)
                flow = InstalledAppFlow.from_client_config(credentials_data, SCOPES)
                creds = flow.run_local_server(port=8080, access_type='offline', prompt='consent')
                update_env_with_token(creds.to_json())
            except Exception as e:
                print(f"Error in OAuth flow: {e}")
                return None

    return creds

def get_email_content(service, msg_id):
    """Get decoded email content"""
    try:
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        payload = message.get('payload', {})
        
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
    """Extract content from TradingView alerts"""
    headers = msg_data.get('payload', {}).get('headers', [])
    
    from_address = ""
    date = ""

    for header in headers:
        name = header.get('name', '').lower()
        if name == 'from':
            from_address = header.get('value', '')
        elif name == 'date':
            date = header.get('value', '')

    email_date = datetime.strptime(date, '%a, %d %b %Y %H:%M:%S %z')
    if email_date.date() != datetime.now().date():
        return None

    content = get_email_content(service, msg_data['id'])

    if "BTCUSD indicators update" in content:
        crypto = "BTCUSDT"
    elif "ETHUSDT indicators update" in content:
        crypto = "ETHUSDT"
    elif "SOLUSDT indicators update" in content:
        crypto = "SOLUSDT"
    else:
        return None

    if "TradingView" in from_address and "indicators update" in content:
        return crypto, content
    return None

def extract_indicators(content):
    """Extract indicator values from email content"""
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

def get_alerts():
    """Get alerts from Gmail"""
    try:
        creds = get_credentials()
        if not creds:
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

def connect_to_database():
    """Establish database connection"""
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=WEB_DB_NAME,
            port=DB_PORT,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def get_crypto_data(column_name, crypto='BTC'):
    """Fetch crypto data from database"""
    connection = None
    try:
        # Remove USDT suffix if present and convert to uppercase
        crypto = crypto.replace('USDT', '').upper()
        
        # Check cache first
        if crypto in crypto_data[column_name]:
            return crypto_data[column_name][crypto], 200

        # Connect to database
        connection = connect_to_database()
        if not connection:
            return {"error": "Database connection failed"}, 500

        with connection.cursor() as cursor:
            # Verify table exists
            cursor.execute("SHOW TABLES LIKE 'cryptos'")
            if not cursor.fetchone():
                return {"error": "Table 'cryptos' does not exist"}, 404

            # Verify column exists
            cursor.execute("SHOW COLUMNS FROM cryptos LIKE %s", (column_name,))
            if not cursor.fetchone():
                return {"error": f"Column '{column_name}' does not exist"}, 404

            # Query data
            cursor.execute(f"SELECT `{column_name}` FROM cryptos WHERE crypto = %s", (crypto,))
            result = cursor.fetchone()
            
            if not result:
                return {"error": f"No data found for {crypto}"}, 404

            # Process data
            data_str = result[column_name]
            if not data_str:
                return {"error": f"No data in {column_name} column for {crypto}"}, 404

            try:
                # Handle JSON data
                data_str = data_str.replace("'", '"')
                data = json.loads(data_str)
                crypto_data[column_name][crypto] = {column_name: data}
                return crypto_data[column_name][crypto], 200
            except json.JSONDecodeError:
                # Return raw string if JSON parsing fails
                crypto_data[column_name][crypto] = {column_name: data_str}
                return crypto_data[column_name][crypto], 200

    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        if connection:
            connection.close()

def verify_database_setup():
    """Verify database setup and print table structure"""
    connection = None
    try:
        connection = connect_to_database()
        if not connection:
            return False

        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES LIKE 'cryptos'")
            if not cursor.fetchone():
                return False

            cursor.execute("DESCRIBE cryptos")
            return True

    except Exception as e:
        print(f"Database verification error: {e}")
        return False
    finally:
        if connection:
            connection.close()

def load_initial_data():
    """Load initial data for all supported cryptocurrencies"""
    cryptos = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
    columns = ['Fear-Greed', 'Mining-Cost', 'Distribution', 'Google-Trends', 'Order-Book', 'Entities']
    
    for crypto in cryptos:
        for column in columns:
            get_crypto_data(column, crypto)

# API Routes
@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    return jsonify(indicator_data)

@app.route('/api/update_indicators', methods=['POST'])
def update_indicators():
    try:
        new_data = request.json
        if not new_data:
            return jsonify({"error": "No data provided"}), 400
            
        indicator_data.update(new_data)
        return jsonify({"message": "Success", "data": indicator_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Crypto data endpoints
@app.route('/api/distribution/<crypto>', methods=['GET'])
@app.route('/api/distribution/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_distribution(crypto):
    result, status_code = get_crypto_data('Distribution', crypto)
    return jsonify(result), status_code

@app.route('/api/google-trends/<crypto>', methods=['GET'])
@app.route('/api/google-trends/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_google_trends(crypto):
    result, status_code = get_crypto_data('Google-Trends', crypto)
    return jsonify(result), status_code

@app.route('/api/fear-greed/<crypto>', methods=['GET'])
@app.route('/api/fear-greed/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_fear_greed(crypto):
    result, status_code = get_crypto_data('Fear-Greed', crypto)
    return jsonify(result), status_code

@app.route('/api/mining-cost/<crypto>', methods=['GET'])
@app.route('/api/mining-cost/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_mining_cost(crypto):
    result, status_code = get_crypto_data('Mining-Cost', crypto)
    return jsonify(result), status_code

@app.route('/api/order-book/<crypto>', methods=['GET'])
@app.route('/api/order-book/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_order_book(crypto):
    result, status_code = get_crypto_data('Order-Book', crypto)
    return jsonify(result), status_code

@app.route('/api/entities/<crypto>', methods=['GET'])
@app.route('/api/entities/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_entities(crypto):
    result, status_code = get_crypto_data('Entities', crypto)
    return jsonify(result), status_code

@app.route('/api/check_alerts', methods=['GET'])
def check_alerts():
    """Endpoint to manually check for new alerts"""
    alerts = get_alerts()
    if alerts:
        indicator_data.update(alerts)
        return jsonify({"message": "Alerts updated", "data": alerts})
    return jsonify({"message": "No new alerts found"})

if __name__ == '__main__':
    print("\nVerifying database setup...")
    if verify_database_setup():
        print("\nDatabase verification successful")
        print("\nLoading initial data...")
        load_initial_data()
        print("\nChecking for alerts...")
        alerts = get_alerts()
        if alerts:
            indicator_data.update(alerts)
            print("Found and loaded alerts:", alerts)
        else:
            print("No alerts found")
        print("\nStarting server...")
        print("Server will be accessible at http://localhost:5002")
        app.run(debug=True, host='0.0.0.0', port=5002)
    else:
        print("\nDatabase verification failed! Please check your database setup.")