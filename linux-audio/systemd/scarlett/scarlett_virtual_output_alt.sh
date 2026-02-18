#!/usr/bin/env bash

exec /usr/bin/pw-loopback -n scarlett_virtual_output_alt -m '[ FL FR ]' --playback-props='target.object="alsa_output.usb-Focusrite_Scarlett_4i4_USB_D8E9B5J2428B79-00.pro-output-0" audio.position=[AUX2 AUX3]' --capture-props='media.class=Audio/Sink node.name="virtual_capture_scarlett_alt" node.description="Scarlett Virtual Capture Alt" stream.dont-remix=true'

