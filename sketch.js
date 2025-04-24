let currentColor;
let colors = [
  'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta', 'brown', 'white', 'black'
];
let paletteWidth = 50; // Width of the color palette
let prevX, prevY; // Variables to store the previous position for drawing lines

// Sound variables
let synths = []; // Array to hold synths for each color
let clearSynth, saveSynth;
let osc;
let filledPixels = 0;
let totalPixels;
let lastFilledPercentage = 0;

// Musical variables
let notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale in MIDI notes
let colorNotes = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76]; // Notes for color selection
let currentBeat = 0;
let bpm = 80;
let loopInterval;

// Arduino variables
let brushX, brushY;
let brushSize = 5;
let joystickX = 0; 
let joystickY = 0; 
let buttonPressed = false;
let lastButtonState = false;
let joystickSpeed = 5; // Speed of joystick movement
let lastColorChangeTime = 0;
let colorChangeDelay = 300; // Delay for color changing to prevent rapid cycling

// Arduino output simulation
let buzzerOn = false;
let ledOn = false;

// Arduino debug mode (for development only - not visible to users)
let debugMode = false;

function setup() {
  createCanvas(800, 600);
  background(255);
  noStroke();
  
  // Initialize brush position to center of drawing area
  brushX = width/2 + paletteWidth/2;
  brushY = height/2;
  prevX = brushX;
  prevY = brushY;
  
  // Initialize synths for color selection sounds
  for (let i = 0; i < colors.length; i++) {
    let synth = new p5.MonoSynth();
    synths.push(synth);
  }
  
  // Initialize synths for UI sounds
  clearSynth = new p5.PolySynth();
  saveSynth = new p5.MonoSynth();
  
  // Draw the color palette once
  drawPalette();
  
  // Set default color to black
  currentColor = 'black';
  
  // Set up oscillator for brush sound
  osc = new p5.Oscillator('sine');
  osc.amp(0);
  osc.start();
  
  // Calculate total pixels for canvas fill percentage (excluding palette)
  totalPixels = (width - paletteWidth) * height;
  
  // Create a reverb effect
  reverb = new p5.Reverb();
  reverb.process(osc, 2, 2); // Add reverb to oscillator
  
  // Start the musical loop
  startMusicLoop();
  
  // Create hidden instructions (only visible in debug mode)
  createHiddenInstructions();
  
  // Add Arduino control panel
  createArduinoPanel();
}

function createHiddenInstructions() {
  let instructions = createDiv(
    'DEVELOPER MODE INSTRUCTIONS:<br>' +
    '- Use arrow keys to simulate Arduino joystick<br>' +
    '- Press SPACEBAR to simulate Arduino button press<br>' +
    '- Press "P" to adjust brush size (simulates potentiometer)<br>' +
    '- Press "D" to toggle this debug panel<br>' +
    '- Press C to clear the canvas<br>' +
    '- Press S to save your artwork'
  );
  instructions.id('debug-instructions');
  instructions.addClass('hidden-instructions');
}

function createArduinoPanel() {
  let panel = createDiv('');
  panel.id('arduino-panel');
  panel.addClass('arduino-panel');
  
  // Add LED indicator with label
  let outputDiv = createDiv('');
  
  let ledLabel = createDiv('LED:');
  ledLabel.style('display', 'inline-block');
  ledLabel.style('width', '50px');
  outputDiv.child(ledLabel);
  
  let ledDiv = createDiv('');
  ledDiv.id('led-indicator');
  ledDiv.addClass('led');
  outputDiv.child(ledDiv);
  
  panel.child(outputDiv);
  
  // Add buzzer indicator with label
  let buzzerOutputDiv = createDiv('');
  
  let buzzerLabel = createDiv('BUZZER:');
  buzzerLabel.style('display', 'inline-block');
  buzzerLabel.style('width', '50px');
  buzzerOutputDiv.child(buzzerLabel);
  
  let buzzerDiv = createDiv('');
  buzzerDiv.id('buzzer-indicator');
  buzzerDiv.addClass('buzzer');
  buzzerOutputDiv.child(buzzerDiv);
  
  panel.child(buzzerOutputDiv);
  
  // Add potentiometer slider
  let potLabel = createDiv('Brush Size (Potentiometer)');
  potLabel.addClass('pot-label');
  panel.child(potLabel);
  
  let potSlider = createSlider(1, 30, 5, 1);
  potSlider.id('brush-size-pot');
  potSlider.addClass('pot-slider');
  potSlider.input(updateBrushSize);
  panel.child(potSlider);
  
  // Add controls label
  let controlsLabel = createDiv('Arduino Controls');
  controlsLabel.addClass('controls-label');
  panel.child(controlsLabel);
  
  // Add joystick and button status
  let joystickStatus = createDiv('Joystick: X=0, Y=0');
  joystickStatus.id('joystick-status');
  panel.child(joystickStatus);
  
  let buttonStatus = createDiv('Button: Not Pressed');
  buttonStatus.id('button-status');
  panel.child(buttonStatus);
}

function updateBrushSize() {
  // Update brush size based on potentiometer value
  brushSize = select('#brush-size-pot').value();
}

function startMusicLoop() {
  // Clear any existing interval
  if (loopInterval) clearInterval(loopInterval);
  
  // Calculate interval time based on BPM
  let intervalTime = (60 / bpm) * 1000;
  
  // Set up the new interval
  loopInterval = setInterval(playNextBeat, intervalTime);
}

function playNextBeat() {
  // Play a note based on the current beat and canvas fill
  let fillPercentage = filledPixels / totalPixels;
  
  // Increase complexity as canvas fills
  let notesToPlay = Math.max(1, Math.floor(fillPercentage * 4));
  
  // Create a synth for background music
  let musicSynth = new p5.MonoSynth();
  
  for (let i = 0; i < notesToPlay; i++) {
    // Select notes based on current beat and canvas state
    let noteIndex = (currentBeat + i * 2) % notes.length;
    let note = notes[noteIndex];
    
    // Play the note with volume based on fill percentage
    let vol = 0.05 + (fillPercentage * 0.1);
    musicSynth.play(midiToFreq(note), vol, 0, 0.2);
  }
  
  // Advance the beat
  currentBeat = (currentBeat + 1) % 8;
  
  // Adjust tempo based on canvas fill
  if (Math.floor(fillPercentage * 10) > Math.floor(lastFilledPercentage * 10)) {
    bpm = 80 + fillPercentage * 60; // Gradually increase from 80 to 140 BPM
    startMusicLoop(); // Restart loop with new tempo
    lastFilledPercentage = fillPercentage;
  }
}

function draw() {
  // Update simulated joystick position based on keyboard input
  if (debugMode) {
    updateSimulatedArduinoInputs();
  }
  
  // Update brush position based on joystick
  if (joystickX != 0 || joystickY != 0) {
    brushX += joystickX * joystickSpeed;
    brushY += joystickY * joystickSpeed;
    
    // Constrain brush to canvas area
    brushX = constrain(brushX, paletteWidth, width);
    brushY = constrain(brushY, 0, height);
    
    // Update joystick status in panel
    select('#joystick-status').html('Joystick: X=' + int(joystickX*100) + ', Y=' + int(joystickY*100));
  }
  
  // Check if button was pressed (and handle it only once per press)
  if (buttonPressed && !lastButtonState) {
    cycleColor();
    lastButtonState = true;
    select('#button-status').html('Button: Pressed');
  } else if (!buttonPressed) {
    lastButtonState = false;
    select('#button-status').html('Button: Not Pressed');
  }
  
  // Draw on the canvas
  stroke(currentColor);
  strokeWeight(brushSize);
  line(prevX, prevY, brushX, brushY);
  
  // Draw brush position indicator
  noStroke();
  fill(255, 100);
  ellipse(brushX, brushY, 10, 10);
  
  // Play brush sound with pitch variation based on Y position and X position
  let pitch = map(brushY, 0, height, 800, 200);
  let modulation = map(brushX, paletteWidth, width, 0, 10);
  osc.freq(pitch + sin(frameCount * 0.1) * modulation);
  osc.amp(0.1, 0.05);
  
  // Simulate Arduino output (LED and buzzer)
  // Warm colors (red, orange, yellow) trigger output
  if (currentColor === 'red' || currentColor === 'orange' || currentColor === 'yellow') {
    activateArduinoOutput(true);
  } else {
    activateArduinoOutput(false);
  }
  
  // Estimate filled pixels for canvas percentage calculation
  filledPixels += 5; // Approximate number of pixels in a brush stroke
  filledPixels = constrain(filledPixels, 0, totalPixels);
  
  // Update the previous position
  prevX = brushX;
  prevY = brushY;
  
  // Redraw palette with current color highlighted
  drawPalette();
}

function activateArduinoOutput(activate) {
  // Update the LED and buzzer status
  ledOn = activate;
  buzzerOn = activate;
  
  // Update the visual indicators in the Arduino panel
  let ledIndicator = select('#led-indicator');
  if (ledOn) {
    ledIndicator.addClass('led-on');
  } else {
    ledIndicator.removeClass('led-on');
  }
  
  let buzzerIndicator = select('#buzzer-indicator');
  if (buzzerOn) {
    buzzerIndicator.addClass('buzzer-on');
  } else {
    buzzerIndicator.removeClass('buzzer-on');
  }
}

function updateSimulatedArduinoInputs() {
  // Reset simulated joystick values
  joystickX = 0;
  joystickY = 0;
  
  // Check keyboard for joystick inputs
  if (keyIsDown(LEFT_ARROW)) {
    joystickX = -1;
  } else if (keyIsDown(RIGHT_ARROW)) {
    joystickX = 1;
  }
  
  if (keyIsDown(UP_ARROW)) {
    joystickY = -1;
  } else if (keyIsDown(DOWN_ARROW)) {
    joystickY = 1;
  }
}

function cycleColor() {
  // Only change color if enough time has passed since the last change
  let currentTime = millis();
  if (currentTime - lastColorChangeTime > colorChangeDelay) {
    // Cycle to the next color
    let currentIndex = colors.indexOf(currentColor);
    let nextIndex = (currentIndex + 1) % colors.length;
    currentColor = colors[nextIndex];
    
    // Play color selection sound
    let note = colorNotes[nextIndex];
    synths[nextIndex].play(midiToFreq(note), 0.5, 0, 0.3);
    
    lastColorChangeTime = currentTime;
  }
}

function keyPressed() {
  // Toggle debug mode with 'D' key
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
    let instructions = select('#debug-instructions');
    if (debugMode) {
      instructions.removeClass('hidden-instructions');
    } else {
      instructions.addClass('hidden-instructions');
    }
    return false;
  }
  
  // Only handle these keys in debug mode
  if (debugMode) {
    // Spacebar acts as the Arduino button for cycling colors
    if (key === ' ') {
      buttonPressed = true;
      return false; // Prevent default behavior
    }
    
    // 'P' key toggles showing the potentiometer (brush size) controls
    if (key === 'p' || key === 'P') {
      let panel = select('#arduino-panel');
      if (panel.style('display') === 'none') {
        panel.style('display', 'block');
      } else {
        panel.style('display', 'block');
      }
    }
  }
  
  // Clear the canvas (including the palette) when the 'C' key is pressed
  if (key === 'c' || key === 'C') {
    background(255);
    drawPalette(); // Redraw the palette
    
    // Play clear sound - a descending arpeggio
    let clearNotes = [72, 67, 64, 60];
    for (let i = 0; i < clearNotes.length; i++) {
      clearSynth.play(midiToFreq(clearNotes[i]), 0.3, i * 0.1, 0.2);
    }
    
    // Reset filled pixels count
    filledPixels = 0;
    
    // Reset tempo
    bpm = 80;
    startMusicLoop();
  }
  
  // Save the canvas when the 'S' key is pressed
  if (key === 's' || key === 'S') {
    saveCanvas('myPainting', 'png');
    
    // Play save sound - an ascending chord
    let melody = [60, 64, 67, 72];
    for (let i = 0; i < melody.length; i++) {
      setTimeout(() => {
        saveSynth.play(midiToFreq(melody[i]), 0.3, 0, 0.3);
      }, i * 150);
    }
  }
}

function keyReleased() {
  if (debugMode) {
    // Reset button press state when spacebar is released
    if (key === ' ') {
      buttonPressed = false;
      return false; // Prevent default behavior
    }
  }
}

function drawPalette() {
  // Draw the color palette
  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    rect(0, i * 50, paletteWidth, 50);
  }
  
  // Indicate the currently selected color
  let currentIndex = colors.indexOf(currentColor);
  stroke(255);
  strokeWeight(2);
  noFill();
  rect(2, currentIndex * 50 + 2, paletteWidth - 4, 46);
  noStroke();
}

function mousePressed() {
  // Change the current color when clicking on the palette
  if (mouseX < paletteWidth) {
    for (let i = 0; i < colors.length; i++) {
      if (mouseY > i * 50 && mouseY < (i + 1) * 50) {
        currentColor = colors[i];
        
        // Play color selection sound
        let note = colorNotes[i];
        synths[i].play(midiToFreq(note), 0.5, 0, 0.3);
        
        break;
      }
    }
  }
}

// Helper function to convert MIDI note to frequency
function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}