import os
import json
import pymysql
from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import base64
import requests
from flask_cors import CORS

# Load environment variables from a .env file
load_dotenv()

# Initialize the Flask application
app = Flask(__name__)

# Enable Cross-Origin Resource Sharing (CORS) for the app
CORS(app)

# Initialize dictionaries to store indicator and crypto data
indicator_data = {}
crypto_data = {
    'Fear-Greed': {},
    'Mining-Cost': {},
    'Distribution': {},
    'Google-Trends': {},
    'Order-Book': {},
    'Entities': {}
}

# Gmail Configuration: Load webhook and token from environment variables
GMAIL_WEBHOOK = os.getenv("GMAIL_WEBHOOK")
GMAIL_TOKEN = os.getenv("GMAIL_TOKEN")
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Database Configuration: Load database connection details from environment variables
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = int(os.getenv('DB_PORT'))
WEB_DB_NAME = os.getenv('WEB_DB_NAME')

# Define paths for environment and backup files
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env')
# Use an absolute path for the backup file
BACKUP_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'backup_data.json'))

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

def extract_signal_history(service, msg_data):
    """Extract signal history details from email content"""
    headers = msg_data.get('payload', {}).get('headers', [])
    subject = ""
    
    # Extract the subject from the email headers
    for header in headers:
        if header.get('name', '').lower() == 'subject':
            subject = header.get('value', '')
            break

    # Process all emails with subjects starting with 'Alert:'
    if not subject.startswith("Alert:"):
        return None

    # Extract the desired part of the subtitle
    start = subject.find("Alert:") + len("Alert:")
    end = subject.find("(") if "(" in subject else len(subject)
    subtitle = subject[start:end].strip()

    signal_details = {
        'subtitle': subtitle
    }
    
    content = get_email_content(service, msg_data['id'])
    lines = content.splitlines()
    
    for line in lines:
        # Capture lines that contain 'Time:' and 'Price:' for signal details
        if "Time:" in line:
            signal_details['time'] = line.split("Time:")[1].strip()
        elif "Price:" in line:
            signal_details['price'] = line.split("Price:")[1].strip()
        else:
            # Use the first non-empty line as the description
            if 'description' not in signal_details and line.strip():
                signal_details['description'] = line.strip()
    
    # Ensure all required fields are present
    if 'description' in signal_details and 'price' in signal_details and 'time' in signal_details:
        return signal_details
    return None

def get_alerts():
    """Get alerts from Gmail"""
    try:
        creds = get_credentials()
        if not creds:
            return None

        service = build('gmail', 'v1', credentials=creds)
        four_hours_ago = int((datetime.now() - timedelta(hours=23)).timestamp())
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

@app.route('/api/economic-indicators', methods=['GET'])
def get_economic_indicators():
    """Endpoint to get economic indicators from the database and save to backup"""
    try:
        connection = connect_to_database()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    DATE_FORMAT(date, '%Y-%m-%d') as date,
                    TIME_FORMAT(time, '%H:%i') as time,
                    event_name,
                    actual_value,
                    previous_value,
                    consensus_value,
                    forecast_value
                FROM economic_indicators 
                ORDER BY date ASC, time ASC
            """)
            indicators = cursor.fetchall()

            # Update the indicator_data dictionary
            indicator_data['economic_indicators'] = indicators
            
            # Save to backup file
            save_data_to_json()

            return jsonify(indicators), 200

    except Exception as e:
        print(f"Error fetching economic indicators: {e}")
        return jsonify({"error": "Internal server error"}), 500
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

def save_data_to_json():
    """Save current data to a JSON file for backup."""
    try:
        # Print the current working directory
        print(f"Current working directory: {os.getcwd()}")  # Debug: Print current working directory
        # Get the absolute path for the backup file
        absolute_backup_path = os.path.abspath(BACKUP_FILE_PATH)
        print(f"Attempting to save data to {absolute_backup_path}...")  # Debug: Print absolute file path
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(absolute_backup_path), exist_ok=True)
        
        # Initialize default structure
        default_data = {
            "indicator_data": {
                "BTCUSDT": {},
                "ETHUSDT": {},
                "SOLUSDT": {},
                "economic_indicators": [],
                "signal_history": []
            },
            "crypto_data": {
                "Fear-Greed": {},
                "Mining-Cost": {},
                "Distribution": {},
                "Google-Trends": {},
                "Order-Book": {},
                "Entities": {}
            }
        }
        
        # Read existing backup data if it exists and is not empty
        try:
            with open(absolute_backup_path, 'r') as existing_file:
                content = existing_file.read().strip()
                if content:  # Only try to parse if file is not empty
                    existing_data = json.loads(content)
                else:
                    existing_data = default_data
        except (FileNotFoundError, json.JSONDecodeError):
            existing_data = default_data
        
        # Update indicator_data while preserving existing data
        if "indicator_data" not in existing_data:
            existing_data["indicator_data"] = default_data["indicator_data"]
        
        # Update each key in indicator_data separately
        for key, value in indicator_data.items():
            if key not in existing_data["indicator_data"]:
                existing_data["indicator_data"][key] = value
            elif isinstance(value, list):
                existing_data["indicator_data"][key] = value
            else:
                existing_data["indicator_data"][key].update(value)
        
        # Update crypto_data while preserving existing data
        if "crypto_data" not in existing_data:
            existing_data["crypto_data"] = default_data["crypto_data"]
        
        # Update each key in crypto_data separately
        for key, value in crypto_data.items():
            if key not in existing_data["crypto_data"]:
                existing_data["crypto_data"][key] = value
            else:
                existing_data["crypto_data"][key].update(value)
        
        # Write the updated data back to the file
        with open(absolute_backup_path, 'w') as backup_file:
            json.dump(existing_data, backup_file, indent=4)
        print("Data successfully backed up to JSON.")
    except Exception as e:
        print(f"Error saving data to JSON: {e}")

def fetch_signal_history_from_gmail():
    """Fetch signal history from Gmail"""
    try:
        creds = get_credentials()
        if not creds:
            return None

        service = build('gmail', 'v1', credentials=creds)
        # Fetch emails from the last two days
        two_days_ago = datetime.now() - timedelta(days=2)
        query = f"in:inbox after:{two_days_ago.strftime('%Y/%m/%d')}"
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])

        if not messages:
            return None

        signal_history_list = []
        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
            signal_history = extract_signal_history(service, msg_data)
            if signal_history:
                signal_history_list.append(signal_history)

        if not signal_history_list:
            return None

        return signal_history_list

    except Exception as e:
        return None

# API Routes
@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    save_data_to_json()  # Save data when accessed
    return jsonify({'indicator_data': indicator_data})

@app.route('/api/update_indicators', methods=['POST'])
def update_indicators():
    try:
        new_data = request.json
        if not new_data:
            return jsonify({"error": "No data provided"}), 400
            
        indicator_data.update(new_data)
        save_data_to_json()  # Save data after updating
        return jsonify({"message": "Success", "data": indicator_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Crypto data endpoints
@app.route('/api/distribution/<crypto>', methods=['GET'])
@app.route('/api/distribution/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_distribution(crypto):
    result, status_code = get_crypto_data('Distribution', crypto)
    save_data_to_json()  # Save data when accessed
    return jsonify(result), status_code

@app.route('/api/google-trends/<crypto>', methods=['GET'])
@app.route('/api/google-trends/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_google_trends(crypto):
    result, status_code = get_crypto_data('Google-Trends', crypto)
    save_data_to_json()  # Save data when accessed
    return jsonify(result), status_code

@app.route('/api/fear-greed/<crypto>', methods=['GET'])
@app.route('/api/fear-greed/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_fear_greed(crypto):
    result, status_code = get_crypto_data('Fear-Greed', crypto)
    save_data_to_json()  # Save data when accessed
    return jsonify(result), status_code

@app.route('/api/mining-cost/<crypto>', methods=['GET'])
@app.route('/api/mining-cost/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_mining_cost(crypto):
    result, status_code = get_crypto_data('Mining-Cost', crypto)
    save_data_to_json()  # Save data when accessed
    return jsonify(result), status_code

@app.route('/api/order-book/<crypto>', methods=['GET'])
@app.route('/api/order-book/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_order_book(crypto):
    result, status_code = get_crypto_data('Order-Book', crypto)
    save_data_to_json()  # Save data when accessed
    return jsonify(result), status_code

@app.route('/api/entities/<crypto>', methods=['GET'])
@app.route('/api/entities/', defaults={'crypto': 'BTC'}, methods=['GET'])
def get_entities(crypto):
    result, status_code = get_crypto_data('Entities', crypto)
    save_data_to_json()  # Save data when accessed
    return jsonify(result), status_code

@app.route('/api/check_alerts', methods=['GET'])
def check_alerts():
    """Endpoint to manually check for new alerts"""
    alerts = get_alerts()
    if alerts:
        indicator_data.update(alerts)
        save_data_to_json()  # Save data after updating
        return jsonify({"message": "Alerts updated", "data": alerts})
    return jsonify({"message": "No new alerts found"})

@app.route('/api/signal_history', methods=['GET'])
def get_signal_history():
    """Endpoint to get signal history from Gmail and save to backup_data.json."""
    signal_history_list = fetch_signal_history_from_gmail()
    if signal_history_list:
        # Assuming signal history should be part of indicator_data
        indicator_data['signal_history'] = signal_history_list
        print(f"Final indicator_data before saving: {json.dumps(indicator_data, indent=4)}")  # Debug: Print final state of indicator_data
        save_data_to_json()  # Save data after updating indicator_data
        return jsonify(signal_history_list), 200
    return jsonify([]), 404

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
        app.run(debug=False, host='0.0.0.0', port=5002)
    else:
        print("\nDatabase verification failed! Please check your database setup.") 