#define DO_BTN 2
#define RE_BTN 3
#define MI_BTN 4
#define FA_BTN 5
#define SOL_BTN 6
#define LA_BTN 7
#define SI_BTN 8
#define DO2_BTN 9

#define RED_LED 10
#define YELLOW_LED 11
#define GREEN_LED 12

void setup() {
  Serial.begin(9600);
  
  // Setup button pins as inputs with pull-up resistors
  for (int i = DO_BTN; i <= DO2_BTN; i++) {
    pinMode(i, INPUT_PULLUP);
  }
  
  // Setup LED pins as outputs
  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  
  // Turn off all LEDs initially
  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
}

void loop() {
  // Check for button presses
  for (int i = DO_BTN; i <= DO2_BTN; i++) {
    if (digitalRead(i) == LOW) {  // Button is pressed (LOW due to pull-up)
      Serial.println(i);  // Send button number to web interface
      delay(200);  // Debounce delay
    }
  }
  
  // Check for incoming score data from web interface
  if (Serial.available() > 0) {
    char score = Serial.read();
    
    // Turn off all LEDs first
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
    
    // Light up appropriate LED based on score
    switch (score) {
      case 'R':  // Red for poor performance
        digitalWrite(RED_LED, HIGH);
        break;
      case 'Y':  // Yellow for average performance
        digitalWrite(YELLOW_LED, HIGH);
        break;
      case 'G':  // Green for good performance
        digitalWrite(GREEN_LED, HIGH);
        break;
    }
  }
}
