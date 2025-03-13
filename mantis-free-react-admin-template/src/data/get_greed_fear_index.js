const FNG_TODAY_API_URL = "https://api.alternative.me/fng/?limit=1&format=json";

const get_today_grade_and_index = async () => {
    try {
        const response = await fetch(FNG_TODAY_API_URL);
        const data = await response.json();
        const today_data = data.data[0];
        
        const today_index = parseInt(today_data.value);
        const today_grade = today_data.value_classification.charAt(0).toUpperCase() + 
                          today_data.value_classification.slice(1).toLowerCase();
        
        return [today_grade, today_index];
    } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        return ['Error', 0];
    }
};

export default get_today_grade_and_index; 