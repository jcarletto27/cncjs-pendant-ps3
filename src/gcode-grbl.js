#!/usr/bin/env node

// G-code handler for cncjs-pendant-ps3 for Grbl controllers

// by Chris Midgley <chris@koose.com>

// MIT License
//
// Copyright (c) 2020 Chris Midgley
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

module.exports = class {
    constructor(options, sendMessage) {
        this.sendMessage = sendMessage;
        this.options = options;
    }

    // execute a probe operation
    probe() {
        this.sendMessage('command', this.options.port, 'gcode', 'G91');
        this.sendMessage('command', this.options.port, 'gcode', 'G38.2 Z-15.001 F120');
        this.sendMessage('command', this.options.port, 'gcode', 'G90');
        this.sendMessage('command', this.options.port, 'gcode', 'G10 L20 P1 Z15.001');
        this.sendMessage('command', this.options.port, 'gcode', 'G91');
        this.sendMessage('command', this.options.port, 'gcode', 'G0 Z3');
        this.sendMessage('command', this.options.port, 'gcode', 'G90');
    }

    // coolant operations: mist on
    coolantMistOn() {
        this.sendMessage('command', this.options.port, 'gcode', 'M7');
    }

    // coolant operations: flood on
    coolantFloodOn() {
        this.sendMessage('command', this.options.port, 'gcode', 'M8');
    }

    // coolant operations: all coolant off
    coolantOff() {
        this.sendMessage('command', this.options.port, 'gcode', 'M9');
    }

    // move gantry: home
    moveGantryHome() {
        this.sendMessage('command', this.options.port, 'homing');
    }

    // move gantry: relative movement
    moveGantryRelative(x, y, z, mmPerMin) {
        this.sendMessage('command', this.options.port, 'gcode', 'G21');  // set to millimeters
        this.sendMessage('command', this.options.port, 'gcode', 'G91 G0 X' + x.toFixed(4) + " Y" + y.toFixed(4) + " Z" + z.toFixed(4));
        this.sendMessage('command', this.options.port, 'gcode', 'G90');  // Switch back to absolute coordinates
    }

    // turn spindle on to the specified speed
    spindleOn(speed) {
        this.sendMessage('command', this.options.port, 'gcode', 'M3 S' + speed);
    }

    // turn spindle off
    spindleOff() {
        this.sendMessage('command', this.options.port, 'gcode', 'M5');
    }
};