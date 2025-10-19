#!/bin/bash

exec /usr/bin/pw-loopback -n scarlett_virtual_input_line -m '[ FL FR ]' --capture-props='target.object="alsa_input.usb-Focusrite_Scarlett_4i4_USB_D8E9B5J2428B79-00.pro-input-0" audio.position=[AUX2 AUX3] stream.dont-remix=true' --playback-props='media.class=Audio/Source node.name="virtual_playback_scarlett_line" node.description="Scarlett Virtual Playback Line"'

