/**
 * Sound Level Sensor - ESP32-C3 Firmware
 * 
 * This firmware samples audio from an INMP441 I2S microphone,
 * performs FFT analysis for frequency band measurements,
 * calculates dB levels, and transmits data to a backend server via WiFi.
 */

#include <stdio.h>
#include <string.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_mac.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "esp_sntp.h"
#include "mdns.h"
#include "driver/i2s_std.h"
#include "esp_dsp.h"
#include "cJSON.h"
#include "esp_ota_ops.h"
#include "esp_http_client.h"
#include "esp_https_ota.h"

// Firmware Version
#define FIRMWARE_VERSION "1.1.1"

// Configuration
// Device ID will be set dynamically based on MAC address
static char device_id[32];  // Global device ID based on MAC address
#define WIFI_SSID CONFIG_WIFI_SSID
#define WIFI_PASS CONFIG_WIFI_PASSWORD
#define SERVER_URL CONFIG_SERVER_URL
#define API_KEY CONFIG_API_KEY

// OTA Configuration
#define OTA_CHECK_INTERVAL_MS (3600000)  // Check for updates every hour
#define OTA_RECV_TIMEOUT 5000
#define OTA_BUFFER_SIZE 1024

// I2S Configuration for INMP441
#define I2S_PORT I2S_NUM_0
#define I2S_SAMPLE_RATE 16000
#define I2S_BITS_PER_SAMPLE 32  // INMP441 outputs 24-bit, but we use 32-bit container
#define I2S_CHANNELS 1
#define I2S_DMA_BUF_COUNT 4
#define I2S_DMA_BUF_LEN 1024

// GPIO Pins (ESP32-C3 to INMP441)
#define I2S_BCK_PIN 5   // I2S_BCLK
#define I2S_WS_PIN 6    // I2S_WS
#define I2S_DATA_PIN 4  // I2S_DATA

// FFT Configuration
#define FFT_SIZE 1024
#define SAMPLE_BUFFER_SIZE FFT_SIZE

// Frequency Bands (configurable)
#define NUM_BANDS 3
typedef struct {
    int band_number;
    float start_freq;
    float end_freq;
    float level;
} freq_band_t;

// Event Detection Configuration
#define EVENT_THRESHOLD_DB 55.0f  // Threshold for detecting sound events
#define EVENT_RISE_RATE_DB_PER_SEC 5.0f  // Minimum rise rate to consider it an event
#define EVENT_MIN_DURATION_MS 50  // Minimum duration to be considered an event
#define EVENT_MAX_DURATION_MS 5000  // Maximum duration to track
#define EVENT_COOLDOWN_MS 500  // Cooldown period after event ends

typedef struct {
    bool is_active;
    int64_t onset_timestamp_us;  // Microsecond timestamp when event started
    float peak_amplitude_db;
    int64_t peak_timestamp_us;
    int32_t duration_ms;
    float onset_db;
    float previous_db;
    int64_t event_start_time;
    int64_t last_above_threshold_time;
} event_detector_t;

// Calibration offset (configurable from server)
static float calibration_offset_db = 0.0f;

// WiFi event group
static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT BIT1

static const char *TAG = "SOUND_SENSOR";
static int s_retry_num = 0;
static i2s_chan_handle_t rx_handle = NULL;

// Frequency bands configuration
static freq_band_t frequency_bands[NUM_BANDS] = {
    {1, 20, 200, 0},
    {2, 200, 2000, 0},
    {3, 2000, 8000, 0}
};

// Event detector state
static event_detector_t event_detector = {
    .is_active = false,
    .onset_timestamp_us = 0,
    .peak_amplitude_db = 0,
    .peak_timestamp_us = 0,
    .duration_ms = 0,
    .onset_db = 0,
    .previous_db = 30.0f,  // Start with minimum expected level
    .event_start_time = 0,
    .last_above_threshold_time = 0
};

// HTTP response buffer for configuration
#define CONFIG_BUFFER_SIZE 2048
static char config_buffer[CONFIG_BUFFER_SIZE];
static int config_buffer_index = 0;

// Forward declarations
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                              int32_t event_id, void* event_data);
static void init_wifi(void);
static void init_mdns(void);
static void init_i2s(void);
static void init_sntp(void);
static void audio_sampling_task(void *pvParameters);
static float calculate_db_level(float* magnitude, int size);
static void calculate_frequency_bands(float* fft_magnitude, int fft_size, int sample_rate);
static void apply_hamming_window(float* samples, int size);
static esp_err_t send_measurement_data(float db_level, freq_band_t* bands, int num_bands);
static void ota_task(void *pvParameters);
static esp_err_t check_and_perform_ota_update(void);

// WiFi event handler
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                              int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < 10) {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGI(TAG, "Retry connecting to WiFi...");
        } else {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
        }
        ESP_LOGI(TAG, "Failed to connect to WiFi");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

// Initialize WiFi
static void init_wifi(void)
{
    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT,
                                                        ESP_EVENT_ANY_ID,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT,
                                                        IP_EVENT_STA_GOT_IP,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
            .threshold.authmode = WIFI_AUTH_OPEN,  // Allow any auth mode (WPA2/WPA3)
            .sae_pwe_h2e = WPA3_SAE_PWE_BOTH,     // Support both WPA3 methods
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "WiFi initialization finished.");

    // Wait for connection
    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group,
            WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
            pdFALSE,
            pdFALSE,
            portMAX_DELAY);

    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "Connected to WiFi SSID:%s", WIFI_SSID);
        // Initialize mDNS after WiFi is connected
        init_mdns();
    } else if (bits & WIFI_FAIL_BIT) {
        ESP_LOGI(TAG, "Failed to connect to SSID:%s", WIFI_SSID);
    }
}

// Initialize mDNS
static void init_mdns(void)
{
    ESP_LOGI(TAG, "Initializing mDNS...");
    esp_err_t err = mdns_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "mDNS Init failed: %d", err);
        return;
    }
    
    // Set hostname for this device (use last 6 chars of device_id to keep it short)
    char mdns_hostname[64];
    size_t id_len = strlen(device_id);
    const char *short_id = (id_len > 6) ? (device_id + id_len - 6) : device_id;
    snprintf(mdns_hostname, sizeof(mdns_hostname), "sound-sensor-%s", short_id);
    mdns_hostname_set(mdns_hostname);
    
    ESP_LOGI(TAG, "mDNS initialized. Hostname: %s.local", mdns_hostname);
}

// Initialize I2S for INMP441 microphone
static void init_i2s(void)
{
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_PORT, I2S_ROLE_MASTER);
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, NULL, &rx_handle));

    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(I2S_SAMPLE_RATE),
        .slot_cfg = I2S_STD_MSB_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = I2S_BCK_PIN,
            .ws = I2S_WS_PIN,
            .dout = I2S_GPIO_UNUSED,
            .din = I2S_DATA_PIN,
            .invert_flags = {
                .mclk_inv = false,
                .bclk_inv = false,
                .ws_inv = false,
            },
        },
    };

    ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &std_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));

    ESP_LOGI(TAG, "I2S initialized for INMP441");
}

// Initialize SNTP for time synchronization
static void init_sntp(void)
{
    ESP_LOGI(TAG, "Initializing SNTP");
    esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
    esp_sntp_setservername(0, "pool.ntp.org");
    esp_sntp_init();
}

// HTTP event handler for configuration fetch
static esp_err_t config_http_event_handler(esp_http_client_event_t *evt)
{
    switch(evt->event_id) {
        case HTTP_EVENT_ON_DATA:
            if (config_buffer_index + evt->data_len < CONFIG_BUFFER_SIZE - 1) {
                memcpy(config_buffer + config_buffer_index, evt->data, evt->data_len);
                config_buffer_index += evt->data_len;
                config_buffer[config_buffer_index] = '\0';
            }
            break;
        default:
            break;
    }
    return ESP_OK;
}

// Register device with server
static bool register_device(void)
{
    ESP_LOGI(TAG, "Registering device with server...");
    
    // Build JSON payload
    char payload[512];
    snprintf(payload, sizeof(payload),
             "{\"device_id\":\"%s\",\"mac_address\":\"%s\",\"name\":\"Sound Sensor %s\",\"location\":\"Unknown\",\"api_key\":\"%s\",\"firmware_version\":\"%s\"}",
             device_id, device_id, device_id, API_KEY, FIRMWARE_VERSION);
    
    // Build URL
    char url[256];
    snprintf(url, sizeof(url), "%s/api/register", SERVER_URL);
    ESP_LOGI(TAG, "Registration URL: %s", url);
    ESP_LOGI(TAG, "Payload: %s", payload);
    
    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 10000,
    };
    
    esp_http_client_handle_t client = esp_http_client_init(&config);
    
    // Set headers
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, payload, strlen(payload));
    
    esp_err_t err = esp_http_client_perform(client);
    bool success = false;
    
    if (err == ESP_OK) {
        int status_code = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "Registration response status: %d", status_code);
        
        if (status_code == 201 || status_code == 409) {
            // 201 = created, 409 = already exists (both are OK)
            ESP_LOGI(TAG, "Device registered successfully");
            success = true;
        } else {
            ESP_LOGW(TAG, "Registration failed with status: %d", status_code);
        }
    } else {
        ESP_LOGW(TAG, "HTTP POST request failed: %s", esp_err_to_name(err));
    }
    
    esp_http_client_cleanup(client);
    return success;
}

// Fetch configuration from server
static void fetch_configuration(void)
{
    ESP_LOGI(TAG, "Fetching configuration from server...");
    
    // Reset buffer
    config_buffer_index = 0;
    memset(config_buffer, 0, CONFIG_BUFFER_SIZE);
    
    // Build URL with URL-encoded device ID
    char url[256];
    char encoded_device_id[64];
    
    // URL encoding for device ID (encode special characters like : and spaces)
    const char *src = device_id;
    char *dst = encoded_device_id;
    while (*src && (dst - encoded_device_id) < sizeof(encoded_device_id) - 4) {
        if (*src == ' ') {
            *dst++ = '%';
            *dst++ = '2';
            *dst++ = '0';
        } else if (*src == ':') {
            *dst++ = '%';
            *dst++ = '3';
            *dst++ = 'A';
        } else {
            *dst++ = *src;
        }
        src++;
    }
    *dst = '\0';
    
    snprintf(url, sizeof(url), "%s/api/config/devices/%s/frequency-bands", SERVER_URL, encoded_device_id);
    ESP_LOGI(TAG, "Config URL: %s", url);
    
    esp_http_client_config_t config = {
        .url = url,
        .event_handler = config_http_event_handler,
        .timeout_ms = 5000,
    };
    
    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_err_t err = esp_http_client_perform(client);
    
    if (err == ESP_OK) {
        int status_code = esp_http_client_get_status_code(client);
        if (status_code == 200) {
            ESP_LOGI(TAG, "Configuration received: %s", config_buffer);
            
            // Parse JSON response
            cJSON *root = cJSON_Parse(config_buffer);
            if (root != NULL) {
                // Update calibration offset
                cJSON *calibration = cJSON_GetObjectItem(root, "calibration_offset_db");
                if (cJSON_IsNumber(calibration)) {
                    calibration_offset_db = (float)calibration->valuedouble;
                    ESP_LOGI(TAG, "Calibration offset: %.2f dB", calibration_offset_db);
                }
                
                // Update frequency bands
                cJSON *bands_array = cJSON_GetObjectItem(root, "frequency_bands");
                if (cJSON_IsArray(bands_array)) {
                    int band_count = cJSON_GetArraySize(bands_array);
                    if (band_count > NUM_BANDS) {
                        band_count = NUM_BANDS;
                    }
                    
                    for (int i = 0; i < band_count; i++) {
                        cJSON *band = cJSON_GetArrayItem(bands_array, i);
                        cJSON *band_num = cJSON_GetObjectItem(band, "band_number");
                        cJSON *start_freq = cJSON_GetObjectItem(band, "start_frequency");
                        cJSON *end_freq = cJSON_GetObjectItem(band, "end_frequency");
                        
                        if (cJSON_IsNumber(band_num) && cJSON_IsNumber(start_freq) && cJSON_IsNumber(end_freq)) {
                            int idx = band_num->valueint - 1;
                            if (idx >= 0 && idx < NUM_BANDS) {
                                frequency_bands[idx].band_number = band_num->valueint;
                                frequency_bands[idx].start_freq = (float)start_freq->valuedouble;
                                frequency_bands[idx].end_freq = (float)end_freq->valuedouble;
                                ESP_LOGI(TAG, "Band %d: %.0f-%.0f Hz", 
                                    frequency_bands[idx].band_number,
                                    frequency_bands[idx].start_freq,
                                    frequency_bands[idx].end_freq);
                            }
                        }
                    }
                }
                
                cJSON_Delete(root);
            } else {
                ESP_LOGW(TAG, "Failed to parse configuration JSON");
            }
        } else {
            ESP_LOGW(TAG, "HTTP GET failed, status code: %d", status_code);
        }
    } else {
        ESP_LOGW(TAG, "HTTP GET request failed: %s", esp_err_to_name(err));
    }
    
    esp_http_client_cleanup(client);
}

// Apply Hamming window to samples
static void apply_hamming_window(float* samples, int size)
{
    for (int i = 0; i < size; i++) {
        float window = 0.54f - 0.46f * cosf(2.0f * M_PI * i / (size - 1));
        samples[i] *= window;
    }
}

// Calculate A-weighting factor in dB for a given frequency
static float calculate_a_weighting(float freq)
{
    if (freq < 1.0f) {
        return -100.0f;  // Very low frequencies are heavily attenuated
    }
    
    // A-weighting formula (IEC 61672-1)
    float f2 = freq * freq;
    float numerator = 12194.0f * 12194.0f * f2 * f2;
    float denominator = (f2 + 20.6f * 20.6f) * 
                       sqrtf((f2 + 107.7f * 107.7f) * (f2 + 737.9f * 737.9f)) * 
                       (f2 + 12194.0f * 12194.0f);
    
    // Convert to dB and normalize (A-weighting is 0 dB at 1000 Hz)
    float a_weight = 20.0f * log10f(numerator / denominator) + 2.0f;
    
    return a_weight;
}

// Calculate overall dB level from FFT magnitude with A-weighting
static float calculate_db_level(float* magnitude, int size)
{
    float sum = 0;
    float freq_resolution = (float)I2S_SAMPLE_RATE / FFT_SIZE;
    
    for (int i = 1; i < size / 2; i++) {  // Skip DC component
        // Calculate frequency for this bin
        float freq = i * freq_resolution;
        
        // Apply A-weighting
        float a_weight_db = calculate_a_weighting(freq);
        float a_weight_linear = powf(10.0f, a_weight_db / 20.0f);
        
        // Apply weighting to magnitude
        float weighted_magnitude = magnitude[i] * a_weight_linear;
        sum += weighted_magnitude * weighted_magnitude;
    }
    float rms = sqrtf(sum / (size / 2));
    
    // Prevent log(0)
    if (rms < 1e-10f) {
        rms = 1e-10f;
    }
    
    // Convert RMS to dB SPL using INMP441 calibration
    // INMP441: -26 dBFS corresponds to 94 dB SPL (1 Pa reference)
    // Full scale (RMS=1.0) would be 94 - (-26) = 120 dB SPL
    // Formula: dB_SPL = 94 + 20*log10(rms/0.0501) where 0.0501 = 10^(-26/20)
    // Simplified: dB_SPL = 94 + 20*log10(rms) + 26
    // BUT the I2S samples seem to be left-shifted, so adjust baseline
    float db = 94.0f + 20.0f * log10f(rms) - 35.0f;  // Adjusted offset empirically
    
    // Apply calibration offset
    db += calibration_offset_db;
    
    // Clamp to reasonable range (30-120 dB SPL)
    if (db < 30.0f) db = 30.0f;
    if (db > 120.0f) db = 120.0f;
    
    return db;
}

// Calculate frequency band levels with A-weighting
static void calculate_frequency_bands(float* fft_magnitude, int fft_size, int sample_rate)
{
    float freq_resolution = (float)sample_rate / fft_size;
    
    for (int band = 0; band < NUM_BANDS; band++) {
        int start_bin = (int)(frequency_bands[band].start_freq / freq_resolution);
        int end_bin = (int)(frequency_bands[band].end_freq / freq_resolution);
        
        if (end_bin >= fft_size / 2) {
            end_bin = fft_size / 2 - 1;
        }
        
        float sum = 0;
        int count = 0;
        for (int i = start_bin; i <= end_bin; i++) {
            // Calculate frequency for this bin
            float freq = i * freq_resolution;
            
            // Apply A-weighting
            float a_weight_db = calculate_a_weighting(freq);
            float a_weight_linear = powf(10.0f, a_weight_db / 20.0f);
            
            // Apply weighting to magnitude
            float weighted_magnitude = fft_magnitude[i] * a_weight_linear;
            
            sum += weighted_magnitude * weighted_magnitude;
            count++;
        }
        
        if (count > 0) {
            float rms = sqrtf(sum / count);
            float db = 20.0f * log10f(rms + 1e-10f);
            
            // Clamp to reasonable range
            if (db < 0) db = 0;
            if (db > 130) db = 130;
            
            frequency_bands[band].level = db;
        } else {
            frequency_bands[band].level = 0;
        }
    }
}

// Get microsecond-precision timestamp
// This function combines NTP-synchronized time with microsecond precision from esp_timer
static int64_t get_microsecond_timestamp(void)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    
    // Convert to microseconds since Unix epoch
    int64_t timestamp_us = (int64_t)tv.tv_sec * 1000000LL + (int64_t)tv.tv_usec;
    
    return timestamp_us;
}

// Detect sound events based on amplitude and rise rate
static void detect_sound_event(float current_db, int64_t current_time_us)
{
    // Calculate rise rate (dB per second)
    float db_change = current_db - event_detector.previous_db;
    float rise_rate = db_change; // We sample every 1 second, so this is already dB/sec
    
    if (!event_detector.is_active) {
        // Check if we should start tracking an event
        if (current_db > EVENT_THRESHOLD_DB && rise_rate > EVENT_RISE_RATE_DB_PER_SEC) {
            // Event detected!
            event_detector.is_active = true;
            event_detector.onset_timestamp_us = current_time_us;
            event_detector.onset_db = current_db;
            event_detector.peak_amplitude_db = current_db;
            event_detector.peak_timestamp_us = current_time_us;
            event_detector.event_start_time = current_time_us;
            event_detector.last_above_threshold_time = current_time_us;
            event_detector.duration_ms = 0;
            
            ESP_LOGI(TAG, "EVENT DETECTED: Onset at %lld us, Level: %.1f dB, Rise: %.1f dB/s",
                     event_detector.onset_timestamp_us, current_db, rise_rate);
        }
    } else {
        // Event is active, update tracking
        int64_t elapsed_ms = (current_time_us - event_detector.event_start_time) / 1000;
        
        // Update peak if current level is higher
        if (current_db > event_detector.peak_amplitude_db) {
            event_detector.peak_amplitude_db = current_db;
            event_detector.peak_timestamp_us = current_time_us;
        }
        
        // Update duration
        event_detector.duration_ms = (int32_t)elapsed_ms;
        
        // Track last time above threshold
        if (current_db > EVENT_THRESHOLD_DB) {
            event_detector.last_above_threshold_time = current_time_us;
        }
        
        // Check if event has ended
        int64_t time_since_threshold = (current_time_us - event_detector.last_above_threshold_time) / 1000;
        bool event_ended = (time_since_threshold > EVENT_COOLDOWN_MS) || 
                          (elapsed_ms > EVENT_MAX_DURATION_MS);
        
        if (event_ended && elapsed_ms >= EVENT_MIN_DURATION_MS) {
            ESP_LOGI(TAG, "EVENT ENDED: Duration: %ld ms, Peak: %.1f dB at %lld us",
                     event_detector.duration_ms, event_detector.peak_amplitude_db,
                     event_detector.peak_timestamp_us);
            
            // Event will be sent with next measurement transmission
            // Don't reset here - let the transmission task read the data first
        } else if (event_ended) {
            // Event too short, discard
            ESP_LOGD(TAG, "Event discarded (too short): %ld ms", elapsed_ms);
            event_detector.is_active = false;
        }
    }
    
    event_detector.previous_db = current_db;
}

// Audio sampling and processing task
static void audio_sampling_task(void *pvParameters)
{
    int32_t* i2s_buffer = malloc(SAMPLE_BUFFER_SIZE * sizeof(int32_t));
    float* samples = malloc(SAMPLE_BUFFER_SIZE * sizeof(float));
    float* fft_input = malloc(FFT_SIZE * 2 * sizeof(float));  // Complex: real + imaginary
    float* fft_magnitude = malloc(FFT_SIZE * sizeof(float));
    
    if (!i2s_buffer || !samples || !fft_input || !fft_magnitude) {
        ESP_LOGE(TAG, "Failed to allocate memory for audio buffers");
        vTaskDelete(NULL);
        return;
    }
    
    // Initialize FFT
    esp_err_t ret = dsps_fft2r_init_fc32(NULL, FFT_SIZE);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "FFT initialization failed");
        vTaskDelete(NULL);
        return;
    }
    
    ESP_LOGI(TAG, "Audio sampling task started");
    
    int measurement_count = 0;
    
    while (1) {
        // Periodically refresh configuration (every 100 measurements, ~5 minutes at 5 sec interval)
        if (measurement_count > 0 && measurement_count % 100 == 0) {
            fetch_configuration();
        }
        measurement_count++;
        
        size_t bytes_read = 0;
        
        // Read I2S data
        esp_err_t result = i2s_channel_read(rx_handle, i2s_buffer, 
                                           SAMPLE_BUFFER_SIZE * sizeof(int32_t),
                                           &bytes_read, portMAX_DELAY);
        
        if (result != ESP_OK) {
            ESP_LOGE(TAG, "I2S read error: %d", result);
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }
        
        // Convert I2S data to float and normalize
        for (int i = 0; i < SAMPLE_BUFFER_SIZE; i++) {
            // INMP441 is 24-bit left-aligned in 32-bit container
            samples[i] = (float)(i2s_buffer[i] >> 8) / 8388608.0f;  // Normalize to -1.0 to 1.0
        }
        
        // Apply Hamming window
        apply_hamming_window(samples, SAMPLE_BUFFER_SIZE);
        
        // Prepare FFT input (real and imaginary parts)
        for (int i = 0; i < FFT_SIZE; i++) {
            fft_input[i * 2] = (i < SAMPLE_BUFFER_SIZE) ? samples[i] : 0;  // Real
            fft_input[i * 2 + 1] = 0;  // Imaginary
        }
        
        // Perform FFT
        dsps_fft2r_fc32(fft_input, FFT_SIZE);
        dsps_bit_rev_fc32(fft_input, FFT_SIZE);
        
        // Calculate magnitude
        for (int i = 0; i < FFT_SIZE / 2; i++) {
            float real = fft_input[i * 2];
            float imag = fft_input[i * 2 + 1];
            fft_magnitude[i] = sqrtf(real * real + imag * imag);
        }
        
        // Calculate overall dB level
        float db_level = calculate_db_level(fft_magnitude, FFT_SIZE);
        
        // Calculate frequency band levels
        calculate_frequency_bands(fft_magnitude, FFT_SIZE, I2S_SAMPLE_RATE);
        
        // Log results
        ESP_LOGI(TAG, "dB Level: %.1f | Band1: %.1f | Band2: %.1f | Band3: %.1f", 
                 db_level, frequency_bands[0].level, frequency_bands[1].level, frequency_bands[2].level);
        
        // Send data to server (every 5 seconds)
        static int counter = 0;
        if (++counter >= 5) {
            counter = 0;
            send_measurement_data(db_level, frequency_bands, NUM_BANDS);
        }
        
        vTaskDelay(pdMS_TO_TICKS(1000));  // Sample every 1 second
    }
    
    free(i2s_buffer);
    free(samples);
    free(fft_input);
    free(fft_magnitude);
    vTaskDelete(NULL);
}

// HTTP event handler
esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    switch(evt->event_id) {
        case HTTP_EVENT_ERROR:
            ESP_LOGD(TAG, "HTTP_EVENT_ERROR");
            break;
        case HTTP_EVENT_ON_DATA:
            ESP_LOGD(TAG, "HTTP_EVENT_ON_DATA, len=%d", evt->data_len);
            if (!esp_http_client_is_chunked_response(evt->client)) {
                printf("%.*s", evt->data_len, (char*)evt->data);
            }
            break;
        default:
            break;
    }
    return ESP_OK;
}

// Send measurement data to backend server
static esp_err_t send_measurement_data(float db_level, freq_band_t* bands, int num_bands)
{
    // Get current time
    time_t now;
    struct tm timeinfo;
    time(&now);
    localtime_r(&now, &timeinfo);
    char timestamp[64];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    
    // Create JSON payload
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "device_id", device_id);
    cJSON_AddStringToObject(root, "timestamp", timestamp);
    cJSON_AddNumberToObject(root, "db_level", db_level);
    cJSON_AddNumberToObject(root, "db_level_raw", db_level - calibration_offset_db);
    cJSON_AddStringToObject(root, "firmware_version", FIRMWARE_VERSION);
    
    cJSON *bands_array = cJSON_CreateArray();
    for (int i = 0; i < num_bands; i++) {
        cJSON *band = cJSON_CreateObject();
        cJSON_AddNumberToObject(band, "band_number", bands[i].band_number);
        cJSON_AddNumberToObject(band, "start_freq", bands[i].start_freq);
        cJSON_AddNumberToObject(band, "end_freq", bands[i].end_freq);
        cJSON_AddNumberToObject(band, "level", bands[i].level);
        cJSON_AddNumberToObject(band, "level_raw", bands[i].level);
        cJSON_AddItemToArray(bands_array, band);
    }
    cJSON_AddItemToObject(root, "frequency_bands", bands_array);
    
    char *json_string = cJSON_Print(root);
    
    // Configure HTTP client
    char url[256];
    snprintf(url, sizeof(url), "%s/api/data/measurements", SERVER_URL);
    
    esp_http_client_config_t config = {
        .url = url,
        .event_handler = http_event_handler,
        .method = HTTP_METHOD_POST,
    };
    
    esp_http_client_handle_t client = esp_http_client_init(&config);
    
    // Set headers
    esp_http_client_set_header(client, "Content-Type", "application/json");
    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", API_KEY);
    esp_http_client_set_header(client, "Authorization", auth_header);
    
    // Set POST data
    esp_http_client_set_post_field(client, json_string, strlen(json_string));
    
    // Perform request
    esp_err_t err = esp_http_client_perform(client);
    
    if (err == ESP_OK) {
        int status_code = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "HTTP POST Status = %d", status_code);
    } else {
        ESP_LOGE(TAG, "HTTP POST request failed: %s", esp_err_to_name(err));
    }
    
    esp_http_client_cleanup(client);
    cJSON_Delete(root);
    free(json_string);
    
    return err;
}

/**
 * OTA Update Functions
 */

// HTTP event handler for OTA
static esp_err_t ota_http_event_handler(esp_http_client_event_t *evt)
{
    switch (evt->event_id) {
    case HTTP_EVENT_ERROR:
        ESP_LOGD(TAG, "HTTP_EVENT_ERROR");
        break;
    case HTTP_EVENT_ON_CONNECTED:
        ESP_LOGD(TAG, "HTTP_EVENT_ON_CONNECTED");
        break;
    case HTTP_EVENT_HEADER_SENT:
        ESP_LOGD(TAG, "HTTP_EVENT_HEADER_SENT");
        break;
    case HTTP_EVENT_ON_HEADER:
        ESP_LOGD(TAG, "HTTP_EVENT_ON_HEADER, key=%s, value=%s", evt->header_key, evt->header_value);
        break;
    case HTTP_EVENT_ON_DATA:
        ESP_LOGD(TAG, "HTTP_EVENT_ON_DATA, len=%d", evt->data_len);
        break;
    case HTTP_EVENT_ON_FINISH:
        ESP_LOGD(TAG, "HTTP_EVENT_ON_FINISH");
        break;
    case HTTP_EVENT_DISCONNECTED:
        ESP_LOGD(TAG, "HTTP_EVENT_DISCONNECTED");
        break;
    default:
        break;
    }
    return ESP_OK;
}

// Check for and perform OTA update
static esp_err_t check_and_perform_ota_update(void)
{
    ESP_LOGI(TAG, "Checking for firmware updates...");
    ESP_LOGI(TAG, "Current firmware version: %s", FIRMWARE_VERSION);
    
    // First, check if an update is available
    char url[256];
    snprintf(url, sizeof(url), "%s/api/firmware/check?device_id=%s&current_version=%s", 
             SERVER_URL, device_id, FIRMWARE_VERSION);
    
    esp_http_client_config_t check_config = {
        .url = url,
        .timeout_ms = 5000,
    };
    
    esp_http_client_handle_t client = esp_http_client_init(&check_config);
    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", API_KEY);
    esp_http_client_set_header(client, "Authorization", auth_header);
    
    esp_err_t err = esp_http_client_perform(client);
    
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to check for updates: %s", esp_err_to_name(err));
        esp_http_client_cleanup(client);
        return err;
    }
    
    int status_code = esp_http_client_get_status_code(client);
    int content_length = esp_http_client_get_content_length(client);
    
    ESP_LOGI(TAG, "Update check response: %d, content_length: %d", status_code, content_length);
    
    if (status_code == 204) {
        // No update available
        ESP_LOGI(TAG, "Firmware is up to date");
        esp_http_client_cleanup(client);
        return ESP_OK;
    } else if (status_code != 200) {
        ESP_LOGW(TAG, "Unexpected response code: %d", status_code);
        esp_http_client_cleanup(client);
        return ESP_FAIL;
    }
    
    // Read the response to get the new version info
    char response_buffer[512];
    int read_len = esp_http_client_read(client, response_buffer, sizeof(response_buffer) - 1);
    esp_http_client_cleanup(client);
    
    if (read_len <= 0) {
        ESP_LOGE(TAG, "Failed to read update info");
        return ESP_FAIL;
    }
    
    response_buffer[read_len] = 0;
    ESP_LOGI(TAG, "Update available: %s", response_buffer);
    
    // Parse JSON response to get version and download URL
    cJSON *json = cJSON_Parse(response_buffer);
    if (json == NULL) {
        ESP_LOGE(TAG, "Failed to parse update info JSON");
        return ESP_FAIL;
    }
    
    cJSON *version_item = cJSON_GetObjectItem(json, "version");
    cJSON *url_item = cJSON_GetObjectItem(json, "url");
    
    if (!cJSON_IsString(version_item) || !cJSON_IsString(url_item)) {
        ESP_LOGE(TAG, "Invalid update info format");
        cJSON_Delete(json);
        return ESP_FAIL;
    }
    
    char *new_version = version_item->valuestring;
    char *download_path = url_item->valuestring;
    
    // Construct absolute URL
    char full_download_url[512];
    snprintf(full_download_url, sizeof(full_download_url), "%s%s", SERVER_URL, download_path);
    
    ESP_LOGI(TAG, "Starting OTA update to version %s from %s", new_version, full_download_url);
    
    // Perform the OTA update
    esp_http_client_config_t ota_config = {
        .url = full_download_url,
        .event_handler = ota_http_event_handler,
        .timeout_ms = 30000,
        .buffer_size = OTA_BUFFER_SIZE,
    };
    
    esp_https_ota_config_t https_ota_config = {
        .http_config = &ota_config,
    };
    
    esp_err_t ota_err = esp_https_ota(&https_ota_config);
    cJSON_Delete(json);
    
    if (ota_err == ESP_OK) {
        ESP_LOGI(TAG, "OTA update successful! Rebooting...");
        vTaskDelay(pdMS_TO_TICKS(1000));
        esp_restart();
    } else {
        ESP_LOGE(TAG, "OTA update failed: %s", esp_err_to_name(ota_err));
        return ota_err;
    }
    
    return ESP_OK;
}

// OTA task - checks for updates periodically
static void ota_task(void *pvParameters)
{
    ESP_LOGI(TAG, "OTA task started");
    
    // Wait 5 minutes before first check to let device stabilize
    vTaskDelay(pdMS_TO_TICKS(300000));
    
    while (1) {
        // Check if WiFi is connected
        EventBits_t bits = xEventGroupGetBits(s_wifi_event_group);
        if (bits & WIFI_CONNECTED_BIT) {
            check_and_perform_ota_update();
        } else {
            ESP_LOGW(TAG, "Skipping OTA check - WiFi not connected");
        }
        
        // Wait for next check interval
        vTaskDelay(pdMS_TO_TICKS(OTA_CHECK_INTERVAL_MS));
    }
}

void app_main(void)
{
    // v1.1.1: OTA URL Fix
    ESP_LOGI(TAG, "Sound Level Sensor Starting...");
    ESP_LOGI(TAG, "Firmware Version: %s", FIRMWARE_VERSION);
    
    // Get and log partition information
    const esp_partition_t *running = esp_ota_get_running_partition();
    esp_ota_img_states_t ota_state;
    if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
        if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
            ESP_LOGI(TAG, "OTA update pending verification - marking as valid");
            esp_ota_mark_app_valid_cancel_rollback();
        }
    }
    ESP_LOGI(TAG, "Running partition: %s", running->label);
    
    // Initialize device ID from MAC address
    uint8_t mac[6];
    esp_efuse_mac_get_default(mac);
    snprintf(device_id, sizeof(device_id), "%02x:%02x:%02x:%02x:%02x:%02x",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    ESP_LOGI(TAG, "Device ID: %s", device_id);
    
    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    
    // Initialize WiFi
    init_wifi();
    
    // Initialize SNTP
    init_sntp();
    
    // Wait a bit for time sync
    vTaskDelay(pdMS_TO_TICKS(2000));
    
    // Register device with server
    int registration_retries = 3;
    bool registered = false;
    while (registration_retries > 0 && !registered) {
        registered = register_device();
        if (!registered) {
            ESP_LOGW(TAG, "Registration failed, retrying... (%d attempts left)", registration_retries - 1);
            vTaskDelay(pdMS_TO_TICKS(2000));
            registration_retries--;
        }
    }
    
    if (!registered) {
        ESP_LOGE(TAG, "Failed to register device after multiple attempts");
        // Continue anyway - device may already be registered
    }
    
    // Fetch configuration from server
    fetch_configuration();
    
    // Initialize I2S
    init_i2s();
    
    // Start audio sampling task
    xTaskCreate(audio_sampling_task, "audio_sampling", 8192, NULL, 5, NULL);
    
    // Start OTA update task (lower priority, runs in background)
    xTaskCreate(ota_task, "ota_task", 8192, NULL, 3, NULL);
    
    ESP_LOGI(TAG, "Sound Level Sensor Running with OTA support");
}
