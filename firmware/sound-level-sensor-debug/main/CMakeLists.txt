idf_component_register(
    SRCS "main_debug.c"
    INCLUDE_DIRS "."
    REQUIRES
        esp_driver_i2s
        esp_driver_gpio
        log
        freertos
        esp_hw_support
        esp_system
        esp_timer
)
