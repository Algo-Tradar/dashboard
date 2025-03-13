import requests

FNG_TODAY_API_URL = "https://api.alternative.me/fng/?limit=1&format=json"

def get_today_grade_and_index():
    response = requests.get(FNG_TODAY_API_URL)
    today_data = response.json().get("data")[0]
    
    today_index = int(today_data['value'])
    today_grade = today_data['value_classification'].title()
    
    return today_grade, today_index

if __name__ == "__main__":
    grade, index = get_today_grade_and_index()
    print(f"Grade: {grade}")
    print(f"Index: {index}")