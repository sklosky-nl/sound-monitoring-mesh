idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES nvs_flash esp_wifi esp_http_client esp_netif driver espressif__cjson esp_driver_i2s esp_driver_gpio mdns
                    PRIV_REQUIRES app_update esp_https_ota)
