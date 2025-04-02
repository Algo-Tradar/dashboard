import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta
import time
import mysql.connector
import os
import json
import pymysql
from dotenv import load_dotenv
import sys

# Get the absolute path to the .env file
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')

# Load environment variables from a .env file
load_dotenv(env_path)

# Database Configuration: Load database connection details from environment variables
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = int(os.getenv('DB_PORT'))
WEB_DB_NAME = os.getenv('WEB_DB_NAME')

def create_table_if_not_exists(connection):
    try:
        cursor = connection.cursor()
        
        # First drop the existing table if it exists
        drop_table_query = "DROP TABLE IF EXISTS economic_indicators"
        cursor.execute(drop_table_query)
        connection.commit()
        
        create_table_query = """
        CREATE TABLE economic_indicators (
            date DATE NOT NULL,
            time TIME NOT NULL,
            event_name VARCHAR(255) NOT NULL,
            actual_value VARCHAR(50),
            previous_value VARCHAR(50),
            consensus_value VARCHAR(50),
            forecast_value VARCHAR(50),
            PRIMARY KEY (date, time, event_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        cursor.execute(create_table_query)
        connection.commit()
        print("Table 'economic_indicators' created successfully")
        cursor.close()
        return True
    except mysql.connector.Error as err:
        print(f"Error creating table: {err}")
        return False

def connect_to_database():
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=WEB_DB_NAME,
            port=DB_PORT
        )
        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        return None

def format_date(date_str):
    # Convert date string like "Monday March 31 2025" to "2025-03-31"
    try:
        date_obj = datetime.strptime(date_str, "%A %B %d %Y")
        return date_obj.strftime("%Y-%m-%d")
    except Exception as e:
        print(f"Error formatting date {date_str}: {e}")
        return date_str

def scrape_trading_economics():
    url = "https://tradingeconomics.com/calendar"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
    }
    
    # Define the indicators we want to track
    target_indicators = [
        'Unemployment Rate',
        'ISM Manufacturing PMI',
        'Core Inflation Rate YoY',
        'Manufacturing PMI',
        'U-6 Unemployment Rate',
        'Non Farm Payrolls',
        'Fed Interest Rate Decision',
        'GDP Growth Rate',
        'CPI YoY',
        'PPI YoY',
        'Retail Sales MoM',
        'Industrial Production MoM',
    ]
    
    try:
        print("Starting the scraping process...")
        print(f"Looking for these economic indicators: {', '.join(target_indicators)}")
        
        # Add a delay to respect rate limiting
        time.sleep(2)
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        print(f"Response status code: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Connect to database
        connection = connect_to_database()
        if not connection:
            return None

        # Create table if it doesn't exist
        if not create_table_if_not_exists(connection):
            connection.close()
            return None

        cursor = connection.cursor()
        
        # Prepare the insert query
        insert_query = """
        INSERT INTO economic_indicators 
        (date, time, event_name, actual_value, previous_value, consensus_value, forecast_value)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        actual_value = VALUES(actual_value),
        previous_value = VALUES(previous_value),
        consensus_value = VALUES(consensus_value),
        forecast_value = VALUES(forecast_value)
        """
        
        # Find all rows with data attributes
        data = []
        records_processed = 0
        current_date = None
        
        # Find all tr elements that contain data
        rows = soup.find_all('tr', attrs={'data-id': True})
        print(f"\nFound {len(rows)} total rows to process")
        
        for row in rows:
            # Get the country from data attributes
            country = row.get('data-country', '')
            
            # Only process US data
            if country.lower() != "united states":
                continue
                
            # Get all cells
            cells = row.find_all('td')
            if len(cells) >= 4:  # Make sure we have enough cells
                try:
                    # Get event name first (was previously in Previous column)
                    event_full = cells[4].text.strip() if len(cells) > 4 else ''
                    
                    # Check if this event matches any of our target indicators
                    if not any(indicator.lower() in event_full.lower() for indicator in target_indicators):
                        continue
                    
                    # Get time from the first cell
                    time_cell = cells[0].text.strip()
                    
                    # Get values (corrected positions)
                    actual = cells[5].text.strip() if len(cells) > 5 else ''  # Actual value
                    previous = cells[6].text.strip() if len(cells) > 6 else ''  # Previous value
                    consensus = cells[7].text.strip() if len(cells) > 7 else ''  # Consensus
                    forecast = cells[8].text.strip() if len(cells) > 8 else ''  # Forecast
                    
                    # Get the date from the header row
                    date_header = row.find_previous('tr', {'style': 'white-space: nowrap'})
                    if date_header:
                        date_text = date_header.find('th', colspan='3')
                        if date_text:
                            current_date = date_text.text.strip()
                    
                    if current_date and time_cell:
                        # Format the date to YYYY-MM-DD
                        formatted_date = format_date(current_date)
                        
                        # Convert time to 24-hour format
                        try:
                            if time_cell:
                                time_obj = datetime.strptime(time_cell, '%I:%M %p')
                                time_24h = time_obj.strftime('%H:%M:00')
                            else:
                                time_24h = '00:00:00'
                        except ValueError:
                            time_24h = '00:00:00'
                            print(f"Warning: Could not parse time '{time_cell}' for {event_full}, using default")

                        # Clean and validate values
                        def clean_value(val):
                            if not val or val in ['', '-', 'N/A']:
                                return None
                            return val.strip()

                        # Store in data list for DataFrame
                        data.append({
                            'Date': formatted_date,
                            'Time': time_cell,
                            'Event': event_full,
                            'Actual': actual,
                            'Previous': previous,
                            'Consensus': consensus,
                            'Forecast': forecast
                        })

                        # Prepare the data tuple for database insertion
                        data_tuple = (
                            formatted_date,
                            time_24h,
                            event_full,
                            clean_value(actual),
                            clean_value(previous),
                            clean_value(consensus),
                            clean_value(forecast)
                        )

                        # Insert into database
                        cursor.execute(insert_query, data_tuple)
                        records_processed += 1
                        print(f"Found indicator: {event_full} (Actual: {actual}, Previous: {previous}, Consensus: {consensus}, Forecast: {forecast}) at {time_cell} on {formatted_date}")
                
                except Exception as e:
                    print(f"Error processing row: {e}")
                    continue
        
        # Commit the database changes
        connection.commit()
        print(f"\nSuccessfully processed {records_processed} records in database")
        
        if not data:
            print("\nNo matching economic indicators were found in the calendar")
            return None
            
        # Convert to DataFrame and sort by date and time
        df = pd.DataFrame(data)
        df = df.sort_values(['Date', 'Time'])
        print(f"\nSuccessfully extracted {len(data)} economic indicators")
        return df
        
    except requests.exceptions.RequestException as e:
        print(f"Network error occurred: {str(e)}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}")
        return None
    finally:
        if 'connection' in locals() and connection:
            cursor.close()
            connection.close()

if __name__ == "__main__":
    # Check if .env file exists
    if not os.path.exists(env_path):
        print(f"Error: .env file not found at {env_path}")
        sys.exit(1)

    df = scrape_trading_economics()
    if df is not None and not df.empty:
        print("\nUS Economic Indicators:")
        # Print without index
        print(df.to_string(index=False))
    else:
        print("\nNo data was retrieved. Please check the error messages above.") 