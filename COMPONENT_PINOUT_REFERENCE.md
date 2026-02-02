# Component Pinout Reference
## ESP32-C3 SuperMini & INMP441 I2S Microphone

**Document Version:** 1.0  
**Date:** January 28, 2026  
**Status:** Hardware Verified  
**Related Documents:** [Hardware Design Document](sound%20level%20mesh%20hardware%20design.md)

---

## Overview

This document provides the complete pinout specifications for the components used in the Sound Level Mesh System monitoring devices:

- **ESP32-C3 SuperMini Development Board** (Microcontroller)
- **MH-ET LIVE INMP441 Digital Microphone Module** (I2S Audio Input)

This reference includes physical pin layouts, recommended I2S wiring configuration, and software setup examples.

---

## 1. ESP32-C3 SuperMini Pinout

The ESP32-C3 SuperMini is a compact development board based on the **RISC-V architecture** (single-core, 160 MHz). It features built-in USB-CDC (USB-to-Serial) eliminating the need for external USB-to-UART chips.

### Physical Orientation

**Hold the board with:**
- USB-C connector facing **UP** (top)
- Chip and buttons facing **YOU** (front)

**Header Layout:**
- **Right Header:** Starts with `5V` at top right (Pin 1)
- **Left Header:** Starts with `GPIO 5` at top left (Pin 1)

### Complete Pinout Table

| Pin Label | GPIO    | Physical Position        | Function / Notes                                |
|-----------|---------|--------------------------|------------------------------------------------|
| **5V**    | -       | Right Side, Pin 1 (Top)  | 5V Power Input (from USB or external)          |
| **GND**   | -       | Right Side, Pin 2        | Ground                                          |
| **3V3**   | -       | Right Side, Pin 3        | 3.3V Output (Regulated) or Input               |
| **0**     | GPIO 0  | Right Side, Pin 4        | ADC1_CH0, Digital I/O                          |
| **1**     | GPIO 1  | Right Side, Pin 5        | ADC1_CH1, Digital I/O                          |
| **2**     | GPIO 2  | Right Side, Pin 6        | ⚠️ Strapping Pin (Keep floating at boot)       |
| **3**     | GPIO 3  | Right Side, Pin 7        | ADC1_CH3, Digital I/O                          |
| **4**     | GPIO 4  | Right Side, Pin 8 (Bottom)| ADC1_CH4, **I2S SCK** (Recommended)           |
| **5**     | GPIO 5  | Left Side, Pin 1 (Top)   | ADC1_CH5, **I2S WS** (Recommended), MISO (SPI)|
| **6**     | GPIO 6  | Left Side, Pin 2         | **I2S SD** (Recommended), MOSI (SPI)           |
| **7**     | GPIO 7  | Left Side, Pin 3         | SS (SPI), Digital I/O                          |
| **8**     | GPIO 8  | Left Side, Pin 4         | I2C SDA, LED, ⚠️ Strapping Pin                 |
| **9**     | GPIO 9  | Left Side, Pin 5         | I2C SCL, Boot Button, ⚠️ Strapping Pin         |
| **10**    | GPIO 10 | Left Side, Pin 6         | Digital I/O                                    |
| **20**    | GPIO 20 | Left Side, Pin 7         | UART RX (USB Serial)                           |
| **21**    | GPIO 21 | Left Side, Pin 8 (Bottom)| UART TX (USB Serial)                           |

### Pin Categories

#### Power Pins
- **5V:** Input voltage from USB or external power (not regulated)
- **3V3:** Regulated 3.3V output (can supply ~500mA) or 3.3V input if powered externally
- **GND:** Ground reference

#### I2S Recommended Pins (For INMP441 Connection)
- **GPIO 4:** I2S Serial Clock (SCK/BCLK) - Right Side, Pin 8
- **GPIO 5:** I2S Word Select (WS/LRCK) - Left Side, Pin 1
- **GPIO 6:** I2S Serial Data (SD/DIN) - Left Side, Pin 2

#### Strapping Pins ⚠️ **IMPORTANT**

These pins affect boot behavior if held HIGH or LOW during power-on:

| GPIO | Boot Behavior                                           |
|------|---------------------------------------------------------|
| GPIO 2 | Keep **floating** at boot (do not pull HIGH or LOW)   |
| GPIO 8 | Boot mode selection - avoid external connections       |
| GPIO 9 | Download mode - connected to boot button                |

**Recommendation:** Avoid using GPIO 2, 8, and 9 for I2S or other critical functions to prevent boot issues.

#### Serial/Debug Pins
- **GPIO 20:** UART RX (USB CDC)
- **GPIO 21:** UART TX (USB CDC)

**Note:** These are used by the USB-CDC serial interface. Avoid using them for I2S.

### Visual Pinout Diagram

```
        USB-C Connector (TOP)
        ┌─────────────┐
        │   ╔═══════╗ │
        │   ║ USB-C ║ │
        │   ╚═══════╝ │
        │             │
        │  ┌───────┐  │
        │  │ ESP32 │  │
        │  │  C3   │  │
        │  └───────┘  │
        │             │
Right   │             │   Left
Header  │             │   Header
────────┴─────────────┴────────
        
 5V  ●               ● GPIO 5  (I2S WS) ← Recommended
GND  ●               ● GPIO 6  (I2S SD) ← Recommended
3V3  ●               ● GPIO 7
  0  ●               ● GPIO 8  (⚠️ Strapping)
  1  ●               ● GPIO 9  (⚠️ Strapping)
  2  ●               ● GPIO 10 (Boot Button)
  3  ●               ● GPIO 20 (USB RX)
  4  ●               ● GPIO 21 (USB TX)
   (I2S SCK) ←
   Recommended
```

---

## 2. MH-ET LIVE INMP441 Pinout

The INMP441 is a high-precision **MEMS omnidirectional microphone** with digital I2S output. It features:
- Sample rate: Up to 48 kHz
- Bit depth: 24-bit
- SNR: 65 dB
- Sensitivity: -26 dBFS
- Operating voltage: **3.3V only** (do not use 5V!)

### Physical Orientation

**Hold the module with:**
- **Gold Circle** (microphone) facing **YOU** (front)
- **Pins at the BOTTOM**
- Count pins from **LEFT to RIGHT**

### Complete Pinout Table

| Pin # | Name  | Physical Position    | Function                              | Connect To        |
|-------|-------|----------------------|---------------------------------------|-------------------|
| 1     | **SCK** | Far Left (Pin 1)   | Serial Clock (BCLK - Bit Clock)       | ESP32-C3 GPIO 4   |
| 2     | **WS**  | Pin 2              | Word Select (LRCK - Left/Right Clock) | ESP32-C3 GPIO 5   |
| 3     | **L/R** | Pin 3              | Channel Select (Low=Left, High=Right) | ESP32-C3 GND      |
| 4     | **SD**  | Pin 4              | Serial Data (DOUT - Audio Data)       | ESP32-C3 GPIO 6   |
| 5     | **VDD** | Pin 5              | Power Supply (**3.3V ONLY**)          | ESP32-C3 3V3      |
| 6     | **GND** | Far Right (Pin 6)  | Ground                                 | ESP32-C3 GND      |

### Pin Function Details

#### I2S Interface Pins
- **SCK (Serial Clock / BCLK):** Bit clock input - synchronizes data transmission
- **WS (Word Select / LRCK):** Determines left vs right channel in stereo mode
- **SD (Serial Data / DOUT):** Digital audio data output (24-bit I2S format)

#### Power Pins
- **VDD:** **3.3V power supply** - Do NOT connect to 5V! Will damage the microphone.
- **GND:** Ground reference

#### Channel Selection
- **L/R:** Connect to GND for **LEFT channel** (standard for mono)
  - Connect to GND = Left Channel
  - Connect to VDD = Right Channel
  - For mono recording, always connect to GND

### Visual Pinout Diagram

```
     ┌─────────────────┐
     │                 │
     │      ┌───┐      │
     │      │ ⦿ │      │  ← Gold circle = Microphone
     │      └───┘      │
     │                 │
     │   INMP441       │
     │                 │
     └─────────────────┘
     │ │ │ │ │ │
     1 2 3 4 5 6
     │ │ │ │ │ │
    SCK WS L/R SD VDD GND
     │  │  │  │  │  │
     ↓  ↓  ↓  ↓  ↓  ↓
  GPIO4 GPIO5 GND GPIO6 3V3 GND
     │  │     │  │  │  │
     └──┴─────┴──┴──┴──┴── ESP32-C3
```

---

## 3. Wiring Guide

### Recommended Connection Table

This wiring configuration uses GPIO 4, 5, and 6 to avoid conflicts with:
- Strapping pins (GPIO 2, 8, 9)
- USB serial pins (GPIO 20, 21)
- Boot button (GPIO 9)

| INMP441 Pin | INMP441 Function | ESP32-C3 Pin | ESP32-C3 Location | Wire Color (Suggested) |
|-------------|------------------|--------------|-------------------|------------------------|
| **VDD**     | Power (3.3V)     | **3V3**      | Right Side, Pin 3 | Red                    |
| **GND**     | Ground           | **GND**      | Right Side, Pin 2 | Black                  |
| **L/R**     | Channel Select   | **GND**      | Right Side, Pin 2 | Black (tie to GND)     |
| **SCK**     | I2S Bit Clock    | **GPIO 4**   | Right Side, Pin 8 | Yellow                 |
| **WS**      | I2S Word Select  | **GPIO 5**   | Left Side, Pin 1  | Green                  |
| **SD**      | I2S Serial Data  | **GPIO 6**   | Left Side, Pin 2  | Blue                   |

### Wiring Notes

1. **Power Supply:**
   - Use **3V3 pin only** (ESP32-C3 regulated 3.3V output)
   - **Never connect VDD to 5V** - this will damage the INMP441
   - Current draw: ~1.2 mA (very low)

2. **Ground Connections:**
   - Connect both INMP441 GND and L/R to ESP32-C3 GND
   - Use same ground reference for all connections

3. **L/R Channel Selection:**
   - Connect L/R to GND for **mono left channel** recording
   - This is the standard configuration for single microphone systems
   - Do not leave L/R floating

4. **I2S Signal Routing:**
   - Keep wire lengths **short** (< 10 cm recommended)
   - Use twisted pair or shielded cable for longer runs
   - Avoid routing near power cables or high-frequency signals

5. **Signal Quality:**
   - GPIO 4, 5, 6 provide clean I2S signals
   - No conflicts with boot, USB, or strapping functions
   - Reliable operation without boot issues

### Physical Assembly Diagram

```
ESP32-C3 SuperMini              INMP441 Microphone
(USB-C UP)                      (Mic facing you)

Right Side:                     Pins (Left to Right):
  5V  ●                         1. SCK ──┐
  GND ●───────────────────┬─────2. WS  ──┤
  3V3 ●───────┐           │     3. L/R ──┤
   0  ●       │           │     4. SD  ──┤
   1  ●       │           │     5. VDD ──┤
   2  ●       │           │     6. GND ──┘
   3  ●       │           │
   4  ●───────┼───────────┼─────────────────(SCK)
              │           │
Left Side:    │           │
   5  ●───────┼───────────┼─────────────────(WS)
   6  ●───────┼───────────┼─────────────────(SD)
   7  ●       │           │
   8  ●       │           │
   9  ●       │           │
  10  ●       │           │
  20  ●       │           │
  21  ●       └───(VDD)   └───(GND + L/R)
```

---

## 4. Software Configuration

### Arduino IDE / ESP-IDF Configuration

When programming the ESP32-C3, configure the I2S pins to match the wiring above.

#### Pin Definitions

```cpp
#include <driver/i2s.h>

// I2S Pin Configurations
#define I2S_WS   5    // Word Select (LRCK) - Left Side Pin 1
#define I2S_SD   6    // Serial Data (DIN)  - Left Side Pin 2  
#define I2S_SCK  4    // Bit Clock (BCLK)   - Right Side Pin 8

// I2S Port Selection
#define I2S_PORT I2S_NUM_0
```

#### I2S Configuration Structure

```cpp
void setup() {
  Serial.begin(115200);
  
  // I2S Configuration
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),  // Master, receive mode
    .sample_rate = 44100,                                  // 44.1 kHz (or 16000, 48000)
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,         // 32-bit for 24-bit data
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,          // Mono (L/R tied to GND)
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,    // Standard I2S format
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,             // Interrupt priority
    .dma_buf_count = 8,                                    // Number of DMA buffers
    .dma_buf_len = 64,                                     // DMA buffer length
    .use_apll = false,                                     // Don't use APLL
    .tx_desc_auto_clear = false,                           // Don't auto-clear TX
    .fixed_mclk = 0                                        // Auto MCLK
  };
  
  // I2S Pin Configuration
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,           // Bit clock pin
    .ws_io_num = I2S_WS,             // Word select pin
    .data_out_num = I2S_PIN_NO_CHANGE,  // Not used for microphone
    .data_in_num = I2S_SD            // Serial data input pin
  };
  
  // Install and configure I2S driver
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  
  Serial.println("I2S initialized successfully");
}

void loop() {
  // Read audio data from I2S
  size_t bytes_read = 0;
  int32_t samples[64];  // Buffer for audio samples
  
  i2s_read(I2S_PORT, &samples, sizeof(samples), &bytes_read, portMAX_DELAY);
  
  // Process audio data here...
  // Note: INMP441 outputs 24-bit data in 32-bit format
  // Upper 24 bits contain audio, lower 8 bits are zero
}
```

#### Key Configuration Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Sample Rate | 44100 Hz | Can use 16000, 22050, 44100, or 48000 Hz |
| Bits per Sample | 32-bit | INMP441 outputs 24-bit in 32-bit container |
| Channel Format | ONLY_LEFT | Because L/R is tied to GND (mono) |
| Communication Format | STAND_I2S | Standard I2S protocol |
| DMA Buffers | 8 × 64 | Adjustable based on latency needs |

#### Sample Rate Options

```cpp
// Low latency, lower quality (good for sound level monitoring)
.sample_rate = 16000   // 16 kHz

// Standard quality
.sample_rate = 44100   // 44.1 kHz (CD quality)

// High quality (maximum for INMP441)
.sample_rate = 48000   // 48 kHz
```

### Data Format

The INMP441 outputs **24-bit audio data** in a **32-bit container**:

```
32-bit Word Structure:
┌───────────────────────────────┬───────────┐
│  Audio Data (24 bits)         │ Zero (8)  │
│  [MSB..................LSB]   │ [0000000] │
└───────────────────────────────┴───────────┘
 Bit 31                    Bit 8  Bit 7...0

To extract 24-bit audio from 32-bit sample:
  audio_value = (sample >> 8) & 0xFFFFFF;
```

---

## 5. Testing and Verification

### Initial Testing Procedure

1. **Power Check:**
   ```cpp
   // Verify 3.3V at INMP441 VDD pin
   // Expected: 3.25V - 3.35V
   ```

2. **I2S Signal Check (with oscilloscope):**
   - SCK: Should see square wave at bit clock frequency
   - WS: Should see square wave at sample rate
   - SD: Should see data transitions

3. **Audio Data Verification:**
   ```cpp
   void test_audio_read() {
     int32_t sample;
     size_t bytes_read;
     
     i2s_read(I2S_PORT, &sample, sizeof(sample), &bytes_read, 1000);
     
     if (bytes_read > 0) {
       Serial.print("Sample: ");
       Serial.println(sample, HEX);
     } else {
       Serial.println("ERROR: No data received");
     }
   }
   ```

4. **Expected Results:**
   - Silent room: Samples around 0x00800000 (mid-scale)
   - With sound: Samples varying around mid-scale
   - No data: Check wiring and power

### Common Issues

| Problem | Possible Cause | Solution |
|---------|----------------|----------|
| No data received | Wiring incorrect | Verify all connections |
| All zeros | VDD not connected | Check 3.3V power supply |
| All 0xFF | L/R floating | Connect L/R to GND |
| Noisy data | Poor grounding | Use common ground reference |
| Boot issues | Strapping pin conflict | Use GPIO 4, 5, 6 as specified |

---

## 6. Alternative Pin Configurations

While GPIO 4, 5, 6 are recommended, the ESP32-C3 allows flexible I2S pin mapping.

### Alternative GPIO Options

**If GPIO 4, 5, 6 are unavailable:**

| Function | Primary | Alternative 1 | Alternative 2 | Avoid |
|----------|---------|---------------|---------------|-------|
| I2S SCK  | GPIO 4  | GPIO 3        | GPIO 7        | 2, 8, 9, 20, 21 |
| I2S WS   | GPIO 5  | GPIO 10       | GPIO 7        | 2, 8, 9, 20, 21 |
| I2S SD   | GPIO 6  | GPIO 0        | GPIO 1        | 2, 8, 9, 20, 21 |

**Pins to Avoid:**
- **GPIO 2, 8, 9:** Strapping pins (boot mode)
- **GPIO 20, 21:** USB serial (debugging)

---

## 7. Specifications Summary

### ESP32-C3 SuperMini Specifications

| Parameter | Value |
|-----------|-------|
| Architecture | RISC-V (Single-core) |
| Clock Speed | 160 MHz |
| Flash | 4 MB |
| SRAM | 400 KB |
| WiFi | 802.11 b/g/n (2.4 GHz) |
| Bluetooth | BLE 5.0 |
| Operating Voltage | 3.3V |
| Input Voltage | 5V (USB) or 3.3V |
| GPIO Pins | 22 (15 available) |
| USB Interface | USB-CDC (built-in) |

### INMP441 Specifications

| Parameter | Value |
|-----------|-------|
| Type | MEMS Omnidirectional |
| Interface | I2S Digital |
| Operating Voltage | 3.3V (±10%) |
| Current Consumption | 1.2 mA typical |
| Sample Rate | Up to 48 kHz |
| Bit Depth | 24-bit |
| SNR | 65 dB |
| Sensitivity | -26 dBFS |
| Frequency Response | 60 Hz - 15 kHz |
| Operating Temp | -40°C to +85°C |

---

## 8. References

### Official Documentation
- [ESP32-C3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)
- [ESP32-C3 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)
- [INMP441 Datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [I2S Bus Specification](https://www.sparkfun.com/datasheets/BreakoutBoards/I2SBUS.pdf)

### ESP-IDF Documentation
- [I2S Driver API Reference](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/i2s.html)
- [GPIO & RTC GPIO](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/gpio.html)

### Related Project Documents
- [Sound Level Mesh Hardware Design](sound%20level%20mesh%20hardware%20design.md)
- [Sound Level Mesh Architecture](sound%20level%20mesh%20architecture.md)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial release with verified pinouts |

---

**Document Status:** ✅ Verified and Ready for Implementation  
**Hardware Status:** ⏳ Awaiting component delivery for physical verification
