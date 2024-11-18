#include <Arduino.h>
#include <Servo.h>
#include <ArduinoJson.h>

Servo servo_1;  // create servo object to control a servo
Servo servo_0;

float t = 0.0;
float speed = 0.01;
    // variable to store the servo position

unsigned long prev_millis = 0;
const long interval = 1000;

void setup() {
  Serial.begin(9600);
  servo_0.attach(8);
  servo_1.attach(9);
  
  servo_0.write(90);
}

void loop() {

  int pos = (sin(t)+1) * 90;
  servo_1.write(pos);
  t += speed;
  delay(5);

  if( Serial.available() > 0){
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, Serial);
    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.f_str());
      return;
    }
    int angle = doc["angle"];
    servo_0.write(angle);
  }
}
