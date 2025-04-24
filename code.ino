// Arduino Paint App Controller
// This sketch reads joystick, button and potentiometer inputs
// and sends them to P5.js via Serial communication.
// It also receives commands from P5.js to control LED and buzzer outputs.

// Pin definitions
const int joystickXPin = A0;  // Joystick X-axis
const int joystickYPin = A1;  // Joystick Y-axis
const int potPin = A2;        // Potentiometer for brush size
const int buttonPin = 2;      // Button for color cycling
const int ledPin = 3;         // LED output
const int buzzerPin = 4;      // Buzzer output

// Variables for input states
int joystickX = 0;
int joystickY = 0;
int potValue = 0;
int buttonState = HIGH;
int lastButtonState = HIGH;

// Variables for output states
boolean outputActive = false;

// Variables for serial communication
String inputString = "";      // String to hold incoming data
boolean stringComplete = false; // Whether the string is complete

void setup() {
  // Initialize serial communication at 9600 bits per second
  Serial.begin(9600);
  
  // Reserve 200 bytes for the inputString
  inputString.reserve(200);
  
  // Initialize pin modes
  pinMode(joystickXPin, INPUT);
  pinMode(joystickYPin, INPUT);
  pinMode(potPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP); // Using internal pull-up resistor
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  
  // Initialize outputs to off
  digitalWrite(ledPin, LOW);
  digitalWrite(buzzerPin, LOW);
}

void loop() {
  // Read inputs
  readInputs();
  
  // Send data to P5.js
  sendData();
  
  // Process any commands received from P5.js
  if (stringComplete) {
    processCommand();
    // Clear the string for the next command
    inputString = "";
    stringComplete = false;
  }
  
  // Short delay to prevent flooding the serial port
  delay(50);
}

void readInputs() {
  // Read analog values from joystick and potentiometer
  joystickX = analogRead(joystickXPin);
  joystickY = analogRead(joystickYPin);
  potValue = analogRead(potPin);
  
  // Read button state (active LOW with pull-up resistor)
  buttonState = digitalRead(buttonPin);
}

void sendData() {
  // Send joystick position (mapped to 0-100 range for easier P5 processing)
  Serial.print("JOYSTICK:");
  Serial.print(map(joystickX, 0, 1023, 0, 100));
  Serial.print(",");
  Serial.println(map(joystickY, 0, 1023, 0, 100));
  
  // Send potentiometer value (mapped to 1-30 for brush size)
  Serial.print("POT:");
  Serial.println(map(potValue, 0, 1023, 1, 30));
  
  // Check for button press (detect transition from HIGH to LOW)
  if (buttonState == LOW && lastButtonState == HIGH) {
    Serial.println("BUTTON:PRESSED");
  }
  
  // Update last button state
  lastButtonState = buttonState;
}

void processCommand() {
  // Process commands received from P5.js
  if (inputString.startsWith("SOUND:ON")) {
    // Turn on the LED and buzzer
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    outputActive = true;
  } 
  else if (inputString.startsWith("SOUND:OFF")) {
    // Turn off the LED and buzzer
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
    outputActive = false;
  }
}

// Serial event occurs whenever new data comes in
void serialEvent() {
  while (Serial.available()) {
    // Get the new byte
    char inChar = (char)Serial.read();
    
    // Add it to the inputString
    inputString += inChar;
    
    // If the incoming character is a newline, set a flag
    // so the main loop can process the command
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}