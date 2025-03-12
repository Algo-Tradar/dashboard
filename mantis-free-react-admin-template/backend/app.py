from flask import Flask, jsonify, request
from flask_cors import CORS

# Initialize the Flask application
app = Flask(__name__)

# Enable Cross-Origin Resource Sharing (CORS) for the app
CORS(app)

# Initialize an empty dictionary to store indicator data
data = {}

# Define a route to get the current indicators
@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    # Return the current indicator data as a JSON response
    return jsonify(data)

# Define a route to update the indicators
@app.route('/api/update_indicators', methods=['POST'])
def update_indicators():
    # Get the new data from the request body
    new_data = request.json
    # Update the existing data with the new data
    data.update(new_data)
    # Return a success message with the updated data
    return jsonify({"message": "Indicators updated", "data": data})

# Run the app in debug mode
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
