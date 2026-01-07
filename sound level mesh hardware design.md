# Sound Level Mesh System - Hardware Design Document

## Document Information
- **Version:** 1.0
- **Date:** 2024
- **Status:** Draft
- **Author:** Hardware Engineering Team
- **Related Documents:** Sound Level Mesh System PRD, Architecture Document

---

## 1. Executive Summary

This document describes the hardware design for the Sound Level Mesh System monitoring devices. Each device consists of an ESP32 microcontroller connected to an MH-ET LIVE INMP441 I2S Digital Microphone Module. The system requires 10 identical monitoring devices communicating via WiFi to a central web server.

### Hardware Components
- **Microcontroller:** ESP32 development board
- **Microphone Module:** MH-ET LIVE INMP441 I2S Digital Microphone Module
- **Power Supply:** USB (5V) or external power adapter
- **Enclosure:** Weather-resistant housing

---

## 2. Component Specifications

### 2.1 ESP32 Microcontroller

#### Recommended Development Board
- **Model:** ESP32 DevKit V1 or similar
- **Chip:** ESP32-WROOM-32 or ESP32-WROOM-32E
- **Processor:** 
  - Dual-core Xtensa LX6 microprocessor
  - Clock frequency: 240 MHz
  - 32-bit architecture
- **Memory:**
  - Flash: 4 MB (minimum), 16 MB (recommended)
  - SRAM: 520 KB
  - ROM: 448 KB
- **WiFi:**
  - 802.11 b/g/n (2.4 GHz)
  - WPA2/WPA3 support
- **GPIO Pins:** 34 programmable GPIO pins
- **I2S Interface:** Built-in I2S peripheral
- **Power:**
  - Operating voltage: 3.3V
  - Input voltage: 5V (via USB) or 3.3V-5V (via VIN)
  - Current consumption: ~80-260 mA (active), ~10 µA (deep sleep)
- **Dimensions:** ~52mm × 27mm (typical DevKit board)

#### ESP32 Pinout (Relevant Pins)
- **Power Pins:**
  - VIN: 5V input (when not using USB)
  - 3.3V: 3.3V output
  - GND: Ground
- **I2S Pins (for INMP441 connection):**
  - GPIO 22: I2S_DATA (Serial Data)
  - GPIO 25: I2S_WS (Word Select / Left-Right Clock)
  - GPIO 26: I2S_BCLK (Bit Clock / Serial Clock)
- **Other Useful Pins:**
  - GPIO 0: Boot button (optional)
  - GPIO 2: Built-in LED (optional, for status indication)

### 2.2 MH-ET LIVE INMP441 I2S Digital Microphone Module

#### Module Specifications
- **Microphone Type:** Omnidirectional MEMS (Micro-Electro-Mechanical Systems)
- **Interface:** I2S digital output
- **Operating Voltage:** 1.8V - 3.3V (typically 3.3V)
- **Current Consumption:** ~1.2 mA typical
- **Sample Rate:** Up to 48 kHz
- **Bit Depth:** 24-bit
- **Signal-to-Noise Ratio (SNR):** 65 dB
- **Sensitivity:** -26 dBFS
- **Frequency Response:** 60 Hz - 15 kHz
- **Directional Pattern:** Omnidirectional
- **Operating Temperature:** -40°C to +85°C
- **Dimensions:** ~20mm × 20mm (module size)

#### Module Pinout
- **VDD:** Power supply (3.3V)
- **GND:** Ground
- **SCK:** Serial Clock (I2S Bit Clock)
- **WS:** Word Select (I2S Left/Right Clock)
- **SD:** Serial Data (I2S Data Output)
- **L/R:** Left/Right channel select (connect to GND for left/mono)

---

## 3. Wiring Diagram and Connections

### 3.1 INMP441 to ESP32 Connection

```
INMP441 Module          ESP32 DevKit
─────────────────       ────────────────
VDD              ──────> 3.3V
GND              ──────> GND
SCK              ──────> GPIO 26 (I2S_BCLK)
WS               ──────> GPIO 25 (I2S_WS)
SD               ──────> GPIO 22 (I2S_DATA)
L/R              ──────> GND (for mono/left channel)
```

### 3.2 Detailed Pin Connections

| INMP441 Pin | ESP32 Pin | Function | Notes |
|-------------|-----------|----------|-------|
| VDD | 3.3V | Power Supply | Use ESP32's 3.3V output |
| GND | GND | Ground | Common ground |
| SCK | GPIO 26 | I2S Bit Clock | Serial clock signal |
| WS | GPIO 25 | I2S Word Select | Left/Right channel select |
| SD | GPIO 22 | I2S Serial Data | Audio data output |
| L/R | GND | Channel Select | Ground for left/mono channel |

### 3.3 Power Connections

**Option 1: USB Power (Recommended for Development)**
- Connect USB cable to ESP32 DevKit USB port
- Provides 5V power, regulated to 3.3V on board
- INMP441 powered from ESP32's 3.3V pin

**Option 2: External Power Supply**
- Connect 5V power supply to ESP32 VIN pin
- Ensure power supply can provide at least 500 mA
- INMP441 powered from ESP32's 3.3V pin

**Power Consumption Estimate:**
- ESP32 (active): ~80-260 mA @ 3.3V
- INMP441: ~1.2 mA @ 3.3V
- **Total:** ~100-270 mA @ 3.3V (or ~150-400 mA @ 5V input)

### 3.4 Wiring Diagram (Schematic View)

```
                    ┌─────────────────┐
                    │   ESP32 DevKit  │
                    │                 │
     USB/5V ───────>│ VIN             │
                    │                 │
                    │ 3.3V ───────────┼───┐
                    │                 │   │
                    │ GND ────────────┼───┼───┐
                    │                 │   │   │
                    │ GPIO 26 (BCLK) ─┼───┼───┼───┐
                    │                 │   │   │   │
                    │ GPIO 25 (WS) ───┼───┼───┼───┼───┐
                    │                 │   │   │   │   │
                    │ GPIO 22 (DATA) ─┼───┼───┼───┼───┼───┐
                    │                 │   │   │   │   │   │
                    └─────────────────┘   │   │   │   │   │
                                          │   │   │   │   │
                    ┌─────────────────┐  │   │   │   │   │
                    │  INMP441 Module  │  │   │   │   │   │
                    │                  │  │   │   │   │   │
                    │ VDD <────────────┘  │   │   │   │   │
                    │ GND <───────────────┘   │   │   │   │
                    │ SCK <────────────────────┘   │   │   │
                    │ WS  <───────────────────────┘   │   │
                    │ SD  <────────────────────────────┘   │
                    │ L/R <────────────────────────────────┘
                    │                  │
                    └──────────────────┘
```

---

## 4. Physical Layout and Assembly

### 4.1 Component Placement

**Recommended Layout:**
1. ESP32 DevKit board mounted on standoffs or PCB
2. INMP441 module positioned to minimize wire length
3. Keep I2S signal wires as short as possible (< 10 cm recommended)
4. Route power and ground wires together to reduce noise
5. Separate digital signals from power lines

### 4.2 Wire Specifications

**For I2S Signals (SCK, WS, SD):**
- **Type:** Twisted pair or shielded cable recommended
- **Length:** Keep under 10 cm if possible
- **Gauge:** 22-24 AWG
- **Shielding:** Optional but recommended for longer runs

**For Power (VDD, GND):**
- **Type:** Standard hookup wire
- **Length:** As needed for layout
- **Gauge:** 22-24 AWG
- **Note:** Use thicker wire (20 AWG) if power supply is far from module

### 4.3 Soldering vs. Breadboard

**Development/Prototyping:**
- Use breadboard or jumper wires for initial testing
- Allows easy reconfiguration and debugging

**Production:**
- Solder connections for reliability
- Use header pins or direct soldering
- Consider custom PCB for final design

### 4.4 Assembly Steps

1. **Prepare ESP32:**
   - Ensure ESP32 DevKit is powered off
   - Identify GPIO pins 22, 25, 26, 3.3V, and GND

2. **Prepare INMP441:**
   - Identify module pins (VDD, GND, SCK, WS, SD, L/R)
   - Ensure module is clean and undamaged

3. **Make Connections:**
   - Connect power first: VDD to 3.3V, GND to GND
   - Connect I2S signals: SCK→GPIO26, WS→GPIO25, SD→GPIO22
   - Connect L/R to GND for mono operation

4. **Verify Connections:**
   - Double-check all connections
   - Ensure no short circuits
   - Verify power polarity

5. **Power On:**
   - Connect USB or external power
   - Check for proper operation

---

## 5. I2S Configuration

### 5.1 I2S Bus Configuration

**For INMP441 Module:**
- **Sample Rate:** 16 kHz (recommended) or up to 48 kHz
- **Bit Depth:** 24-bit
- **Channel Format:** Mono (left channel)
- **Communication Format:** I2S (standard)
- **Bit Order:** MSB first
- **Clock Polarity:** Normal (data on falling edge)

### 5.2 ESP32 I2S Peripheral Settings

**I2S Configuration Parameters:**
- **Mode:** I2S_MODE_MASTER | I2S_MODE_RX (receive mode)
- **Sample Rate:** 16000 Hz (or 48000 Hz)
- **Bits Per Sample:** I2S_BITS_PER_SAMPLE_24BIT
- **Channel Format:** I2S_CHANNEL_FMT_ONLY_LEFT (mono)
- **Communication Format:** I2S_COMM_FORMAT_STAND_I2S
- **DMA Buffer Count:** 8
- **DMA Buffer Length:** 1024 bytes

### 5.3 Clock Configuration

**I2S Clock Calculation:**
- Bit Clock (BCLK) = Sample Rate × Bits Per Sample × Channels
- For 16 kHz, 24-bit, mono: BCLK = 16000 × 24 × 1 = 384 kHz
- For 48 kHz, 24-bit, mono: BCLK = 48000 × 24 × 1 = 1.152 MHz

**ESP32 I2S Clock:**
- ESP32 generates I2S clock internally
- Configure using I2S driver API
- Clock accuracy depends on APB clock (typically 80 MHz)

---

## 6. Power Supply Design

### 6.1 Power Requirements

**Total System Power:**
- ESP32: 80-260 mA @ 3.3V (active mode)
- INMP441: 1.2 mA @ 3.3V
- **Total:** ~100-270 mA @ 3.3V

**Input Power Options:**
1. **USB 5V:** Standard USB power (500 mA minimum)
2. **External 5V:** Wall adapter or battery pack
3. **3.3V Direct:** If using external 3.3V regulator

### 6.2 Power Supply Considerations

**Voltage Regulation:**
- ESP32 DevKit includes onboard 3.3V regulator
- Accepts 5V input, regulates to 3.3V
- INMP441 requires stable 3.3V supply

**Power Filtering:**
- Add decoupling capacitors near INMP441:
  - 100 nF ceramic capacitor (VDD to GND)
  - 10 µF electrolytic capacitor (optional, for stability)

**Power Consumption Optimization:**
- ESP32 can enter light sleep between measurements
- Reduces average power consumption
- INMP441 remains active during sleep (low power)

### 6.3 Battery Operation (Optional)

**If Battery-Powered:**
- Use 3.7V Li-ion battery (single cell)
- Requires voltage regulator to 3.3V
- Add battery management circuit (BMS)
- Consider power consumption for battery life calculation

---

## 7. Enclosure and Environmental Considerations

### 7.1 Enclosure Requirements

**Physical Protection:**
- Weather-resistant housing (IP54 minimum, IP65 recommended)
- Protection from dust and moisture
- Ventilation for microphone (acoustic port)
- Access to USB port or power connector

**Acoustic Considerations:**
- Microphone should have clear path to environment
- Acoustic port/opening for sound waves
- Avoid blocking microphone with enclosure material
- Consider wind protection (foam windscreen)

**Thermal Management:**
- ESP32 can generate heat during operation
- Ensure adequate ventilation
- Operating temperature: 0°C to +50°C (typical)

### 7.2 Mounting Considerations

**Installation:**
- Secure mounting to prevent vibration
- Position microphone away from noise sources
- Consider height and orientation for optimal sound capture
- Ensure WiFi antenna has clear line of sight

**Cable Management:**
- Secure power cable to prevent disconnection
- Protect cables from environmental damage
- Use weather-resistant cable if exposed

---

## 8. Testing and Verification

### 8.1 Initial Testing

**Power-On Test:**
1. Connect power supply
2. Verify ESP32 boots (LED indicators if available)
3. Check WiFi connectivity
4. Verify I2S communication with INMP441

**Audio Test:**
1. Send test signal or use known sound source
2. Verify audio data is received via I2S
3. Check sample rate and bit depth
4. Verify FFT processing produces expected results

### 8.2 Functional Testing

**Measurement Accuracy:**
- Compare with calibrated reference sound level meter
- Test at various sound levels (30-130 dB)
- Verify frequency band measurements
- Test calibration offset application

**System Integration:**
- Verify data transmission to central server
- Test configuration retrieval
- Verify real-time monitoring
- Test device registration

### 8.3 Environmental Testing

**Temperature:**
- Test at operating temperature range
- Verify performance at extremes

**Humidity:**
- Test in high humidity conditions
- Verify enclosure protection

**Vibration:**
- Test with mechanical vibration
- Verify connections remain secure

---

## 9. Bill of Materials (BOM)

### 9.1 Required Components (Per Device)

| Component | Part Number/Description | Quantity | Notes |
|-----------|------------------------|----------|-------|
| ESP32 DevKit | ESP32-WROOM-32 DevKit V1 | 1 | Or equivalent |
| INMP441 Module | MH-ET LIVE INMP441 | 1 | I2S digital microphone |
| USB Cable | USB-A to Micro-USB | 1 | For power/programming |
| Power Adapter | 5V, 1A minimum | 1 | Optional, if not using USB |
| Jumper Wires | 22-24 AWG | 6 | For connections |
| Enclosure | Weather-resistant | 1 | IP54/IP65 rated |
| Standoffs | M3, 10mm | 4 | For mounting (optional) |

### 9.2 Optional Components

| Component | Description | Quantity | Notes |
|-----------|-------------|----------|-------|
| Decoupling Capacitors | 100 nF ceramic | 2 | Power filtering |
| LED Indicator | 3mm LED | 1 | Status indication |
| Resistor | 220Ω | 1 | For LED (if used) |
| Antenna Extension | WiFi antenna cable | 1 | If needed for range |

### 9.3 Tools Required

- Soldering iron (if soldering connections)
- Multimeter (for testing)
- Wire strippers
- Breadboard (for prototyping)
- Oscilloscope (optional, for signal verification)

---

## 10. Troubleshooting

### 10.1 Common Issues

**No Audio Data:**
- Check I2S pin connections
- Verify I2S configuration matches INMP441 specs
- Check power supply to INMP441 (3.3V)
- Verify sample rate and bit depth settings

**Poor Audio Quality:**
- Check for loose connections
- Verify power supply stability
- Check for electrical interference
- Ensure proper I2S clock configuration

**WiFi Connection Issues:**
- Verify WiFi credentials
- Check signal strength
- Ensure ESP32 antenna is not blocked
- Verify network configuration

**Power Issues:**
- Check power supply voltage
- Verify current capacity (minimum 500 mA)
- Check for short circuits
- Verify ground connections

### 10.2 Diagnostic Procedures

**I2S Signal Verification:**
1. Use oscilloscope to check I2S signals
2. Verify clock frequency matches configuration
3. Check data signal for activity
4. Verify word select timing

**Power Verification:**
1. Measure voltage at INMP441 VDD pin (should be 3.3V)
2. Check current consumption
3. Verify no voltage drops under load

**Communication Test:**
1. Use serial monitor to check ESP32 output
2. Verify I2S data reception
3. Check for error messages
4. Test data transmission to server

---

## 11. Safety Considerations

### 11.1 Electrical Safety

- Ensure proper power supply voltage (5V for ESP32, 3.3V for INMP441)
- Avoid short circuits between power and ground
- Use appropriate wire gauge for current requirements
- Verify polarity before connecting power

### 11.2 Environmental Safety

- Ensure enclosure provides adequate protection
- Avoid exposure to water or excessive moisture
- Protect from extreme temperatures
- Secure mounting to prevent falling

### 11.3 Operational Safety

- Follow manufacturer specifications
- Do not exceed maximum ratings
- Allow adequate ventilation for heat dissipation
- Regular inspection and maintenance

---

## 12. Future Enhancements

### 12.1 Potential Improvements

- **Custom PCB:** Design dedicated PCB for production
- **Battery Power:** Add battery support with power management
- **Additional Sensors:** Temperature, humidity sensors
- **Status LEDs:** Visual indicators for device status
- **External Antenna:** Improved WiFi range
- **Power Management:** Low-power modes for extended operation

### 12.2 Scalability Considerations

- Design for easy assembly and maintenance
- Standardize connections for consistency
- Document assembly procedures
- Create assembly jigs if producing multiple units

---

## 13. Appendix

### A. Pin Reference Tables

**ESP32 GPIO Pin Functions:**
- GPIO 22: I2S_DATA (Input)
- GPIO 25: I2S_WS (Input)
- GPIO 26: I2S_BCLK (Input)
- GPIO 0: Boot button (Input, pull-up)
- GPIO 2: Built-in LED (Output)

**INMP441 Pin Functions:**
- VDD: Power (3.3V)
- GND: Ground
- SCK: Serial Clock (Input)
- WS: Word Select (Input)
- SD: Serial Data (Output)
- L/R: Channel Select (Input, connect to GND)

### B. I2S Timing Diagram

```
BCLK:  _|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_
       |   |   |   |   |   |   |   |   |
WS:    ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
       (Left Channel)    (Right Channel)
SD:    MSB ────────────────> LSB
       (24-bit data word)
```

### C. References

- ESP32 Technical Reference Manual: Espressif Systems
- ESP-IDF Programming Guide: Espressif Systems
- INMP441 Datasheet: InvenSense
- MH-ET LIVE INMP441 Module Documentation
- I2S Bus Specification

### D. Related Documents

- Sound Level Mesh System PRD
- Sound Level Mesh Architecture Document
- Firmware Development Guide (to be created)
- Assembly Instructions (to be created)

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Hardware Engineer | | | |
| Electrical Engineer | | | |
| System Architect | | | |

---

**Document Status:** Draft - Pending Review and Approval

