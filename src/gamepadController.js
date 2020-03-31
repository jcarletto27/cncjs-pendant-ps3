#!/usr/bin/env node

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

const gamepad = require('gamepad')

module.exports = class {
    constructor(options) {
        // save away program options
        this.options = options;

        // Listen for move events on all gamepads
        gamepad.on("move", function (id, axis, value) {
            console.log("move", {
            id: id,
            axis: axis,
            value: value,
            });
        });
        
        // Listen for button up events on all gamepads
        gamepad.on("up", function (id, num) {
            console.log("up", {
            id: id,
            num: num,
            });
        });
        
        // Listen for button down events on all gamepads
        gamepad.on("down", function (id, num) {
            console.log("down", {
            id: id,
            num: num,
            });
        });        
        
        // Listen for gamepad attach events
        gamepad.on("attach", function (id, state) {
            console.log("down", {
            id: id,
            state: state,
            });
        });        
        
        // Listen for gamepad remove events
        gamepad.on("remove", function (id) {
            console.log("remove", {
            id: id
            });
        });        
        
        // Create a game loop and poll for events
        setInterval(gamepad.processEvents, 16);
        // Scan for new gamepads as a slower rate
        setInterval(gamepad.detectDevices, 500);
        // Initialize the library
        gamepad.init();
    }
}

