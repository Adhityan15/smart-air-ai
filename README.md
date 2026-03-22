AI AirCare — Uno + DHT22(D7) + MQ-135(A0)

Instructions:
1. Open Arduino IDE -> open arduino/aircare_sketch.ino -> select Board: Arduino Uno -> Upload.
2. In project folder run: python -m http.server 8000
3. Open Edge/Chrome: http://localhost:8000/index.html
4. Login (any credentials) -> Dashboard -> Click Connect Arduino -> choose device -> Allow
5. Readings will appear live. Use AI Assistant for suggestions.

Notes:
- Arduino prints newline JSON like: {"aq":120,"temp":26.3,"hum":55.1}
- MQ-135 mapping is a demo approximation; calibrate for real AQI calculations.
