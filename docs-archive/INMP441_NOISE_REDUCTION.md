# INMP441 Noise Reduction Guide

## Complete Wiring Diagram (All Noise Components)

This diagram shows the full recommended wiring with every noise-reduction component in place.

```
                                   ┌── Ferrite Bead ──┐
  ESP32-C3 3.3V ───────────────────┤  (600Ω @ 100MHz) ├──────────────────── INMP441 VDD
                                   └──────────────────┘         │
                                                                 ├── [0.1µF ceramic] ── GND
                                                                 │   (as close to VDD pin
                                                                 │    as possible, <5mm)
                                                                 └── [10µF electrolytic] ── GND

  ESP32-C3 GND  ──────────────────────────────────────────────────────────── INMP441 GND

  ESP32-C3 GND  ──────────────────────────────────────────────────────────── INMP441 L/R
                                                                              (GND = LEFT channel)

  ESP32-C3 GPIO4 ──── [100Ω] ──────────────────────────────────────────────── INMP441 SD
                          │                                        │
                        [10kΩ]                             (data output)
                          │
                         GND

  ESP32-C3 GPIO5 ──────────────────────────────────────────────────────────── INMP441 SCK

  ESP32-C3 GPIO6 ──────────────────────────────────────────────────────────── INMP441 WS
```

> **Component placement priority:** The 0.1µF cap on VDD is the single most impactful component.
> Add it first and re-test before adding others.

---

## Hardware Solutions (Most Effective)

### 1. Add Pull-down Resistor on SD
- Place **10kΩ resistor** from SD (GPIO4) to GND
- Prevents line from floating when INMP441 isn't driving it
- Reduces high-frequency noise pickup

```
  INMP441 SD ──────────────────────────────── ESP32-C3 GPIO4
                     │
                   [10kΩ]
                     │
                    GND
```

### 2. Power Supply Decoupling
- Add **0.1µF ceramic capacitor** close to INMP441 VCC pin (within 5mm)
- Add **10µF electrolytic capacitor** on 3.3V rail
- Both capacitors to GND with short traces

```
  3.3V rail                     INMP441 VDD pin
      │                               │
      └──── [Ferrite Bead] ───────────┤
       (optional, extra isolation)    ├─── short trace (<5mm) ───┐
                                      │                           │
                                   [0.1µF]                    [10µF]
                                   ceramic                  electrolytic
                                   (+ to VDD)               (+ to VDD)
                                      │                           │
                                     GND                         GND

  NOTE: Place 0.1µF physically as close to the VDD pin as possible.
        The 10µF can be further away on the 3.3V supply rail.
```

### 3. Shorten Wires
- Keep SD, BCK, WS wires as short as possible (**<5cm**)
- Use twisted pair or shielded cable if wires must be long
- Route away from WiFi antenna area

### 4. Ground Plane
- Ensure solid ground connection between ESP32 and INMP441
- Keep ground path short and thick

### 5. Series Resistor
- Add **100Ω resistor** in series with SD line near the INMP441
- Dampens reflections and reduces high-frequency noise
- Place between INMP441 SD pin and ESP32 GPIO4

```
  INMP441 SD ──── [100Ω] ──────────────────── ESP32-C3 GPIO4
                 ↑
                 Place this end close to the INMP441 SD pin,
                 not close to the ESP32.
                 Combined with the 10kΩ pull-down this forms
                 a low-pass RC filter (cutoff ≈ 160kHz).
```

## Software Solutions (If Hardware Can't Be Changed)

### 1. Digital Filtering
- Add median filter or moving average to samples
- High-pass filter to remove DC offset
- Low-pass filter to remove high-frequency noise

### 2. Sample Rate Reduction
- Lower from 16kHz to 8kHz - reduces noise bandwidth

### 3. Oversampling
- Sample at higher rate and average down

## Quick Fix Recommendation

The **quickest fix** to try:
- Add a **0.1µF capacitor** between INMP441 VCC and GND
- Add a **10kΩ pull-down resistor** from SD to GND

This often resolves 80% of noise issues.

```
  Minimum viable noise fix — two components:

  3.3V ─────────────────────────── INMP441 VDD
                                        │
                                     [0.1µF]   ← solder as close
                                        │         to VDD pin as possible
                                       GND

  GPIO4 ────────────────────────── INMP441 SD
             │
           [10kΩ]
             │
            GND
```

## I2S Clock Specifications

- **BCK (Bit Clock) Frequency**: 1.024 MHz
  - Calculation: 16kHz sample rate × 32 bits/slot × 2 channels = 1.024 MHz
  - Clock period: ~977 nanoseconds per bit
  
- **WS (Word Select) Frequency**: 16 kHz
  - Toggles once per channel sample

## Soldering Best Practices for MEMS Microphones

INMP441 microphones are extremely sensitive to heat damage during soldering.

### Specifications
- **Maximum Temperature**: 260°C
- **Maximum Duration**: 10 seconds

### Recommended Technique
1. **Use low temperature**: 300-320°C iron
2. **Quick work**: Touch for <3 seconds per joint
3. **Pre-tin**: Pre-tin wires and pads before final connection
4. **Heat sink**: Clip small alligator clip between solder point and INMP441 to absorb heat
5. **ESD protection**: Use grounded anti-static wrist strap

### Damage Symptoms
- Random full-scale noise output
- One channel dead (reads all zeros)
- Dense noise on oscilloscope instead of clean digital transitions
- I2S communication works but data is garbage

### Alternatives to Direct Soldering
- Hot air rework station at 250°C
- Pre-soldered modules with headers (solder headers to board, plug in mic module)
- INMP441 modules with pre-soldered JST connectors

## Oscilloscope Testing

### Expected Signals
- **BCK (GPIO5)**: Clean square wave at 1.024 MHz
- **WS (GPIO6)**: Square wave at 16 kHz (word select)
- **SD (GPIO4)**: Digital data synchronized to BCK edges, varying patterns

### Healthy Data Signal
- Relatively flat periods between transitions
- Changes synchronized to clock edges
- Varying patterns corresponding to audio waveforms
- NOT a solid wall of noise

### Bad Signal Indicators
- Continuous random toggling filling entire vertical range
- No correlation with clock edges
- Dense chaotic noise instead of discrete transitions

### Oscilloscope Settings
- **Time/div**: 1-2 µs (to see several BCK cycles)
- **Voltage/div**: 500mV - 1V (to span 0-3.3V digital levels)
- **Coupling**: DC (not AC)
- **Bandwidth limit**: Enable 20MHz limit to filter ultra-high frequency noise
