/**
 * INMP441 / ESP32-C3 — Microphone Debug Firmware
 * ================================================
 * Purpose : Standalone UART diagnostic tool for verifying INMP441 wiring,
 *           I2S bit-alignment, and signal health — no WiFi or server needed.
 *
 * Hardware assumptions (same as production):
 *   GPIO 4  → INMP441 SD   (data)
 *   GPIO 5  → INMP441 SCK  (clock / BCLK)
 *   GPIO 6  → INMP441 WS   (word-select / LRCK)
 *   INMP441 L/R pin → GND  (selects LEFT channel)
 *   3.3 V VDD, GND
 *
 * What this firmware reports (every buffer, ~64 ms):
 *   - Raw I2S word [0] and descriptive bit pattern
 *   - dBFS via 3 alignment modes:
 *       Mode A: 32-bit MSB-aligned  (sample = raw word as-is)
 *       Mode B: 24-bit right-justified (lower 24 bits, sign-extended)
 *       Mode C: 24-bit left-justified (raw >> 8)  ← correct for INMP441
 *   - Estimated dB SPL (using Mode C + INMP441 calibration constant)
 *   - Peak, RMS, min/max, zero-count, clipping count
 *   - ASCII level meter
 *   - PASS / WARN / FAIL health assessment
 *
 * Every ~5 seconds a summary with running min/max SPL range is also printed.
 *
 * Compile & flash:
 *   source ~/esp/esp-idf/export.sh
 *   cd firmware/sound-level-sensor-debug
 *   idf.py set-target esp32c3
 *   idf.py build
 *   idf.py -p /dev/cu.usbmodem21101 flash monitor
 */

#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdint.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_system.h"
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "esp_timer.h"

/* ── Tag ──────────────────────────────────────────────────────────────────── */
static const char *TAG = "MIC_DEBUG";

/* ── I2S / Hardware constants  (match production wiring) ───────────────────
 *  BCK  = GPIO5   (bit clock)
 *  WS   = GPIO6   (word select / LR clock)
 *  DATA = GPIO4   (serial data from mic)
 */
#define I2S_BCK_PIN       5
#define I2S_WS_PIN        6
#define I2S_DATA_PIN      4
#define I2S_SAMPLE_RATE   16000
#define BUF_SAMPLES       1024        /* one FFT-sized frame = ~64 ms       */
#define DMA_BUF_COUNT     4
#define DMA_BUF_LEN       1024

/* ── INMP441 calibration ───────────────────────────────────────────────────
 *  Datasheet: -26 dBFS ≡ 94 dB SPL (1 kHz, 1 Pa)
 *  → dB_SPL = dBFS + 94 + 26 = dBFS + 120
 *  Sensitivity correction is absorbed into the +120 offset.
 */
#define INMP441_SPL_OFFSET  120.0f

/* ── Summary window ───────────────────────────────────────────────────────  */
#define SUMMARY_EVERY_N_BUFFERS  78   /* 78 × 64 ms ≈ 5 s                  */

/* ── Clipping threshold (24-bit signal) ────────────────────────────────────*/
#define CLIP_THRESHOLD_24BIT  (0x7FFFFF - 32)

/* ── Global I2S handle ─────────────────────────────────────────────────────*/
static i2s_chan_handle_t rx_handle = NULL;

/* ── Running stats for the 5-second summary ───────────────────────────────*/
static float  s_spl_min = 999.0f;
static float  s_spl_max = -999.0f;
static float  s_spl_sum = 0.0f;
static int    s_spl_cnt  = 0;
static int    s_buf_cnt  = 0;

/* =========================================================================
 * Helper: build a 30-character ASCII bar for the level meter.
 * spl_db is clamped to [30, 100] dB before mapping to bar width.
 * ========================================================================= */
static void build_bar(float spl_db, char *out, int out_len)
{
    const int BAR_FULL = 28;
    float clamped = spl_db < 30.0f ? 30.0f : (spl_db > 100.0f ? 100.0f : spl_db);
    int   filled  = (int)((clamped - 30.0f) / (100.0f - 30.0f) * BAR_FULL);
    if (filled > BAR_FULL) filled = BAR_FULL;

    int i = 0;
    out[i++] = '[';
    for (int k = 0; k < BAR_FULL && i < out_len - 2; k++) {
        if (k < filled) {
            /* colour-code by zone: low=safe, mid=caution, high=loud */
            if (k < BAR_FULL * 5 / 10)       out[i++] = '=';   /* ≤65 dB  */
            else if (k < BAR_FULL * 7 / 10)  out[i++] = '#';   /* ≤79 dB  */
            else                              out[i++] = '!';   /* >79 dB  */
        } else {
            out[i++] = ' ';
        }
    }
    out[i++] = ']';
    out[i]   = '\0';
}

/* =========================================================================
 * Helper: calculate dBFS from a raw int32 I2S buffer.
 *
 *  mode A (0) — treat entire 32-bit word as sample (MSB-aligned)
 *               divisor = INT32_MAX ≈ 2,147,483,648
 *  mode B (1) — 24-bit right-justified in lower 24 bits (sign-extended)
 *               divisor = 0x7FFFFF = 8,388,607
 *  mode C (2) — 24-bit left-justified: shift right 8  (correct for INMP441)
 *               divisor = 0x7FFFFF = 8,388,607
 *
 * Returns dBFS (negative number; 0 dBFS = full scale).
 * Also writes peak absolute value to *peak_out (in raw integer counts).
 * ========================================================================= */
static float calc_dbfs(const int32_t *buf, int n, int mode, int32_t *peak_out)
{
    const float scale = (mode == 0) ? 2147483648.0f : 8388608.0f;
    double mean  = 0.0;
    double sumsq = 0.0;
    int32_t peak = 0;
    int32_t zero_count = 0;

    /* --- first pass: mean and peak --- */
    for (int i = 0; i < n; i++) {
        int32_t s;
        if (mode == 0) {
            s = buf[i];
        } else if (mode == 1) {
            /* right-justify: keep lower 24 bits, sign-extend */
            s = buf[i] & 0x00FFFFFF;
            if (s & 0x00800000) s |= (int32_t)0xFF000000;
        } else {
            /* left-justify: upper 24 bits are the sample */
            s = buf[i] >> 8;
        }
        int32_t a = (s == INT32_MIN) ? INT32_MAX : (s < 0 ? -s : s);
        if (a > peak) peak = a;
        if (a == 0)   zero_count++;
        mean += (double)s;
    }
    mean /= (double)n;

    /* --- second pass: variance (DC-removed) --- */
    for (int i = 0; i < n; i++) {
        int32_t s;
        if (mode == 0) {
            s = buf[i];
        } else if (mode == 1) {
            s = buf[i] & 0x00FFFFFF;
            if (s & 0x00800000) s |= (int32_t)0xFF000000;
        } else {
            s = buf[i] >> 8;
        }
        double centred = (double)s / scale - mean / scale;
        sumsq += centred * centred;
    }

    float rms = (float)sqrt(sumsq / (double)n);
    if (rms < 1e-10f) rms = 1e-10f;

    if (peak_out) *peak_out = peak;
    return 20.0f * log10f(rms);
}

/* =========================================================================
 * Helper: count zero samples (lower 24 bits == 0) — detects dead mic.
 * ========================================================================= */
static int count_zeros(const int32_t *buf, int n)
{
    int z = 0;
    for (int i = 0; i < n; i++) {
        int32_t s = buf[i] >> 8;            /* 24-bit left-justified       */
        if (s == 0) z++;
    }
    return z;
}

/* =========================================================================
 * Helper: count clipping samples (mode C, 24-bit).
 * ========================================================================= */
static int count_clips(const int32_t *buf, int n)
{
    int c = 0;
    for (int i = 0; i < n; i++) {
        int32_t s  = buf[i] >> 8;
        int32_t a  = (s == INT32_MIN) ? INT32_MAX : (s < 0 ? -s : s);
        if (a >= CLIP_THRESHOLD_24BIT) c++;
    }
    return c;
}

/* =========================================================================
 * Helper: zero-crossing rate (gives rough pitch information).
 * ========================================================================= */
static int count_zero_crossings(const int32_t *buf, int n)
{
    int zc = 0;
    for (int i = 1; i < n; i++) {
        int32_t prev = buf[i-1] >> 8;
        int32_t curr = buf[i]   >> 8;
        /* sign change? */
        if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) zc++;
    }
    return zc;
}

/* =========================================================================
 * Initialize I2S in standard Philips mode for INMP441.
 * ========================================================================= */
static void init_i2s(void)
{
    /* Create channel */
    i2s_chan_config_t ch_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    ch_cfg.dma_desc_num  = DMA_BUF_COUNT;
    ch_cfg.dma_frame_num = DMA_BUF_LEN;
    ESP_ERROR_CHECK(i2s_new_channel(&ch_cfg, NULL, &rx_handle));

    /* Standard (Philips) mode config */
    i2s_std_config_t std_cfg = {
        .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(I2S_SAMPLE_RATE),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
                        I2S_DATA_BIT_WIDTH_32BIT,
                        I2S_SLOT_MODE_MONO),
        .gpio_cfg = {
            .mclk       = I2S_GPIO_UNUSED,
            .bclk       = I2S_BCK_PIN,
            .ws         = I2S_WS_PIN,
            .dout       = I2S_GPIO_UNUSED,
            .din        = I2S_DATA_PIN,
            .invert_flags = {
                .mclk_inv = false,
                .bclk_inv = false,
                .ws_inv   = false,
            },
        },
    };
    /* INMP441 L/R=GND → outputs on LEFT slot; 32-bit container  */
    std_cfg.slot_cfg.slot_mask      = I2S_STD_SLOT_LEFT;
    std_cfg.slot_cfg.slot_bit_width = I2S_SLOT_BIT_WIDTH_32BIT;

    ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &std_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));

    ESP_LOGI(TAG, "I2S ready: BCK=GPIO%d  WS=GPIO%d  DATA=GPIO%d  rate=%d Hz  buf=%d samples",
             I2S_BCK_PIN, I2S_WS_PIN, I2S_DATA_PIN, I2S_SAMPLE_RATE, BUF_SAMPLES);
}

/* =========================================================================
 * Print startup banner.
 * ========================================================================= */
static void print_banner(void)
{
    printf("\n");
    printf("╔══════════════════════════════════════════════════════════════╗\n");
    printf("║        INMP441  MICROPHONE  DEBUG FIRMWARE  v1.0            ║\n");
    printf("║  ESP32-C3 | I2S | No WiFi | Pure Serial Diagnostics         ║\n");
    printf("╠══════════════════════════════════════════════════════════════╣\n");
    printf("║  GPIO  4 → INMP441 SD (data)                                ║\n");
    printf("║  GPIO  5 → INMP441 SCK (bit clock)                          ║\n");
    printf("║  GPIO  6 → INMP441 WS  (word select / LR)                   ║\n");
    printf("║  Sample rate : 16 000 Hz  |  Buffer: 1024 samples (~64 ms)  ║\n");
    printf("╠══════════════════════════════════════════════════════════════╣\n");
    printf("║  COLUMN KEY                                                  ║\n");
    printf("║  BufN   : buffer number since boot                           ║\n");
    printf("║  SPL    : A-uncorrected dB SPL (Mode C, +120 cal)            ║\n");
    printf("║  PkSPL  : single-sample peak SPL this buffer                 ║\n");
    printf("║  dBFS-A : dBFS  32-bit MSB-aligned                          ║\n");
    printf("║  dBFS-B : dBFS  24-bit right-justified (lower 24 bits)       ║\n");
    printf("║  dBFS-C : dBFS  24-bit left-justified  (raw>>8) ← INMP441   ║\n");
    printf("║  Zeros  : samples == 0 (>50%%=dead mic)                       ║\n");
    printf("║  Clips  : samples >=  clip threshold                         ║\n");
    printf("║  ZCR    : zero-crossing rate (proxy for dominant pitch)      ║\n");
    printf("║  Raw[0] : first raw int32 word in hex                        ║\n");
    printf("╚══════════════════════════════════════════════════════════════╝\n");
    printf("\n");
    fflush(stdout);
}

/* =========================================================================
 * Main audio diagnostic task.
 * ========================================================================= */
static void mic_debug_task(void *arg)
{
    int32_t *buf = malloc(BUF_SAMPLES * sizeof(int32_t));
    if (!buf) {
        ESP_LOGE(TAG, "FATAL: cannot allocate sample buffer");
        vTaskDelete(NULL);
        return;
    }

    int buf_num = 0;

    /* ── print CSV-style header for easy copy-paste into spreadsheet ────── */
    printf("BufN,SPL_dB,PkSPL_dB,dBFS_A,dBFS_B,dBFS_C,Zeros/%d,Clips,ZCR,Raw[0],Status\n",
           BUF_SAMPLES);
    fflush(stdout);

    while (1) {
        size_t bytes_read = 0;
        esp_err_t err = i2s_channel_read(rx_handle,
                                         buf,
                                         BUF_SAMPLES * sizeof(int32_t),
                                         &bytes_read,
                                         portMAX_DELAY);

        if (err != ESP_OK || bytes_read == 0) {
            ESP_LOGE(TAG, "[buf %d] I2S read error: %s", buf_num, esp_err_to_name(err));
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        buf_num++;

        /* ── per-buffer metrics ──────────────────────────────────────────  */
        int32_t peak_a = 0, peak_b = 0, peak_c = 0;
        float dbfs_a = calc_dbfs(buf, BUF_SAMPLES, 0, &peak_a);
        float dbfs_b = calc_dbfs(buf, BUF_SAMPLES, 1, &peak_b);
        float dbfs_c = calc_dbfs(buf, BUF_SAMPLES, 2, &peak_c);

        /* SPL estimate uses Mode C — left-justified 24-bit (correct INMP441 alignment) */
        float spl   = dbfs_c + INMP441_SPL_OFFSET;
        if (spl < 20.0f)  spl = 20.0f;   /* floor — below ambient noise    */
        if (spl > 120.0f) spl = 120.0f;  /* ceiling — louder than shouting */

        /* Peak SPL */
        float peak_norm = (float)peak_c / 8388608.0f;
        if (peak_norm < 1e-10f) peak_norm = 1e-10f;
        float peak_dbfs_c = 20.0f * log10f(peak_norm);
        float peak_spl    = peak_dbfs_c + INMP441_SPL_OFFSET;
        if (peak_spl < 20.0f)  peak_spl = 20.0f;
        if (peak_spl > 120.0f) peak_spl = 120.0f;

        int zeros = count_zeros(buf, BUF_SAMPLES);
        int clips = count_clips(buf, BUF_SAMPLES);
        int zcr   = count_zero_crossings(buf, BUF_SAMPLES);

        /* First raw word (hex) */
        uint32_t raw0 = (uint32_t)buf[0];

        /* ── health assessment ──────────────────────────────────────────── */
        const char *status;
        if (zeros > BUF_SAMPLES / 2) {
            status = "FAIL:DEAD_MIC";          /* >50% zeros → mic absent / broken wiring */
        } else if (zeros > BUF_SAMPLES / 10) {
            status = "WARN:HI_ZEROS";          /* 10–50% zeros → questionable signal      */
        } else if (clips > BUF_SAMPLES / 20) {
            status = "WARN:CLIPPING";          /* >5% clips → input overload              */
        } else if (spl < 28.0f) {
            status = "WARN:LOW_SIGNAL";        /* unexpectedly quiet                      */
        } else if (fabsf(dbfs_a - dbfs_c) > 3.0f) {
            status = "WARN:ALIGN_MISMATCH";    /* A vs C disagree → bit-packing error in I2S config */
        } else {
            status = "PASS";
        }

        /* ── update running stats ────────────────────────────────────────  */
        if (spl < s_spl_min) s_spl_min = spl;
        if (spl > s_spl_max) s_spl_max = spl;
        s_spl_sum += spl;
        s_spl_cnt++;
        s_buf_cnt++;

        /* ── ASCII level bar ─────────────────────────────────────────────  */
        char bar[36];
        build_bar(spl, bar, sizeof(bar));

        /* ── CSV line (one per buffer) ───────────────────────────────────  */
        printf("%5d,%5.1f,%5.1f,%6.1f,%6.1f,%6.1f,%4d,%4d,%5d,0x%08" PRIx32 ",%s\n",
               buf_num, spl, peak_spl,
               dbfs_a, dbfs_b, dbfs_c,
               zeros, clips, zcr,
               raw0, status);

        /* ── Human-readable line with bar ────────────────────────────────  */
        printf("  >> %5.1f dB SPL  pk=%5.1f  %s  %s\n",
               spl, peak_spl, bar, status);

        /* ── Extra detail every 15 buffers (~1 second) ───────────────────  */
        if (buf_num % 15 == 0) {
            /* Show a few raw words to help diagnose bit-shifting issues */
            printf("  [raw words] 0:0x%08" PRIx32 "  1:0x%08" PRIx32 "  2:0x%08" PRIx32 "  3:0x%08" PRIx32 "\n",
                   (uint32_t)buf[0], (uint32_t)buf[1],
                   (uint32_t)buf[2], (uint32_t)buf[3]);
            /* Show 24-bit interpreted values */
            printf("  [int24 val] 0:%8" PRId32 "  1:%8" PRId32 "  2:%8" PRId32 "  3:%8" PRId32 "\n",
                   (int32_t)(buf[0] >> 8), (int32_t)(buf[1] >> 8),
                   (int32_t)(buf[2] >> 8), (int32_t)(buf[3] >> 8));
            printf("  [alignment] dBFS-A=%6.1f (32-bit MSB, primary)   "
                              "dBFS-B=%6.1f (24b R-just, N/A in 32b mode)   "
                              "dBFS-C=%6.1f (24b L-just/>>8, should match A)\n",
                   dbfs_a, dbfs_b, dbfs_c);
            printf("  [zeros=%d/%d  clips=%d/%d  zcr=%d (≈%d Hz dominant)]\n",
                   zeros, BUF_SAMPLES,
                   clips, BUF_SAMPLES,
                   zcr, zcr * I2S_SAMPLE_RATE / (2 * BUF_SAMPLES));

            /* Diagnostic hints */
            if (zeros > BUF_SAMPLES / 2) {
                printf("  !! DIAGNOSIS: >50%% zero samples.\n");
                printf("         - Check VDD/GND connections on INMP441\n");
                printf("         - Verify GPIO wiring: SD->GPIO4, SCK->GPIO5, WS->GPIO6\n");
                printf("         - Confirm L/R pin is tied to GND (not floating)\n");
            } else if (zeros > BUF_SAMPLES / 20) {
                printf("  ~~ NOTE: Elevated zeros (%.1f%%). "
                       "Verify L/R pin=GND, check solder joints.\n",
                       100.0f * zeros / BUF_SAMPLES);
            }
            if (clips > 5) {
                printf("  !! DIAGNOSIS: Clipping detected (%d samples). "
                       "Mic too close to loud source or gain too high.\n", clips);
            }
            if (spl >= 30.0f && spl <= 65.0f && zeros < BUF_SAMPLES / 10) {
                printf("  OK SIGNAL: Level %.1f dB looks reasonable for "
                       "a quiet room with TV.\n", spl);
            }
            printf("\n");
        }

        /* ── 5-second summary ────────────────────────────────────────────  */
        if (s_buf_cnt >= SUMMARY_EVERY_N_BUFFERS) {
            float avg = s_spl_sum / (float)s_spl_cnt;
            printf("\n");
            printf("┌─────────── 5-SECOND SUMMARY (buf %d–%d) ──────────────┐\n",
                   buf_num - s_buf_cnt + 1, buf_num);
            printf("│  Avg SPL : %5.1f dB    Min : %5.1f dB    Max : %5.1f dB │\n",
                   avg, s_spl_min, s_spl_max);
            printf("│  Dynamic range this window: %.1f dB                    │\n",
                   s_spl_max - s_spl_min);

            /* Rough room assessment */
            if (s_spl_max - s_spl_min > 5.0f && avg > 30.0f) {
                printf("│  Room assessment: ACTIVE (variance > 5 dB) — TV/speech │\n");
            } else if (avg < 35.0f) {
                printf("│  Room assessment: VERY QUIET — check mic is working     │\n");
            } else {
                printf("│  Room assessment: QUIET BACKGROUND                      │\n");
            }

            if (s_spl_min < 28.0f) {
                printf("│  WARNING: Min SPL very low — mic may be misconfigured   │\n");
            }
            printf("└────────────────────────────────────────────────────────┘\n\n");

            /* reset window */
            s_spl_min = 999.0f;
            s_spl_max = -999.0f;
            s_spl_sum = 0.0f;
            s_spl_cnt  = 0;
            s_buf_cnt  = 0;
        }

        fflush(stdout);
        vTaskDelay(1);   /* give idle task a tick                          */
    }

    free(buf);
    vTaskDelete(NULL);
}

/* =========================================================================
 * app_main
 * ========================================================================= */
void app_main(void)
{
    /* Short delay for monitor to connect before banner appears */
    vTaskDelay(pdMS_TO_TICKS(500));
    print_banner();

    init_i2s();

    ESP_LOGI(TAG, "Starting mic debug task (stack 8 KB, priority 5)");
    xTaskCreate(mic_debug_task, "mic_debug", 8192, NULL, 5, NULL);
}
