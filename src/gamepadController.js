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

const gamepad = require('gamepad');
const events = require('events');

module.exports = class {
    constructor(options) {
        // save away program options
        this.options = options;

        // set up some state tracking
        this.connected = false;

        // set up our event handler
        this.events = new events.EventEmitter();

        // Listen for gamepad events
        gamepad.on("move", this.gamepadEventRemove.bind(this));
        gamepad.on("up", this.gamepadEventUp.bind(this));
        gamepad.on("down", this.gamepadEventDown.bind(this));        
        gamepad.on("attach", this.gamepadEventAttach.bind(this));        
        gamepad.on("remove", this.gamepadEventRemove.bind(this));        
        
        // Create a game loop and poll for events
        setInterval(gamepad.processEvents, 16);
        // Scan for new gamepads as a slower rate
        setInterval(gamepad.detectDevices, 500);
        // Initialize the library
        gamepad.init();
    }

    // PUBLIC METHODS

    // subscribe to a gamepad event
    on(eventName, handler) {
        switch (eventName) {
            case 'attach':
            case 'remove':
                break;
            default:
                console.error('GamepadController.on unknown event ' + eventName);
                return;
        }
        this.events.on(eventName, handler);

        // if this is an attach event, and we already have a controller, let them know
        if (eventName == 'attach' && this.connected)
            this.events.emit('attach');
    }

    // unsubscribed from a gamepad event
    off(eventName, handler) {
        this.events.off(eventName, handler);
    }

    // determine if we have a valid gamepad connected
    isConnected() {
        return this.connected;
    }

    // PRIVATE METHODS

    gamepadEventAttach(id, state) {
        console.log("attach", state.description + " (id " + id + ")");
        this.connected = true;
        this.events.emit('attach');
    }

    gamepadEventRemove(id) {
        console.log("remove", id);
        this.connected = false;
        this.events.emit('remove');
    }

    gamepadEventMove(id, axis, value) {
        console.log("move", {
        id: id,
        axis: axis,
        value: value,
        });
    }
    gamepadEventDown(id, num) {
        console.log("down", {
        id: id,
        num: num,
        });
    }

    gamepadEventUp(id, num) {
        console.log("up", {
        id: id,
        num: num,
        });
    }
}

