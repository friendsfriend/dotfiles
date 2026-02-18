#!/usr/bin/env bash

exec /usr/bin/pw-loopback -n scarlett_virtual_output_main -m '[ FL FR ]' --playback-props='target.object="alsa_output.usb-Focusrite_Scarlett_4i4_USB_D8E9B5J2428B79-00.pro-output-0" audio.position=[AUX0 AUX1]' --capture-props='media.class=Audio/Sink node.name="virtual_capture_scarlett_main" node.description="Scarlett Virtual Capture Main" stream.dont-remix=true'

