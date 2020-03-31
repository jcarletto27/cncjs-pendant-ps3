#!/usr/bin/env node

// MIT License
//
// Copyright (c) 2017 Austin St. Aubin for cncjs
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

// TODO: Remove these comments when done
//
// Class model for plug-in code generators
// - Base semi-abstract class: Machine
// - Controllers inherit: Marlin inherits Machine, Grbl inherits Machine, etc.
// - Individual machines inherit controllers: MPCNC inherits Marlin
//
// - Need a way to define unique machine parameters as well, like Fan=>SuperPID?
//
// - CNC.js offers some knowledge of machine and port; we should understand that as it may
//   provide a discovery method or even services for abstraction?
//
// END TODO: End of section

const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const GamepadController = require('./gamepadController')

// generate token
const generateAccessToken = function(payload, secret, expiration) {
    const token = jwt.sign(payload, secret, {
        expiresIn: expiration
    });

    return token;
};

// get secret key from the config file and generate an access token
const getUserHome = function() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};

// main module - provided access to command line options
module.exports = function(options, callback) {
	
	// handles sending messages to the cncjs socket server, or displaying on screen when using --fakeSocket option
	const sendMessage = function(eventName, a1, a2, a3) {
		if (options.fakeSocket) {
			if (eventName == 'open')
				console.log('Socket: Open port ' + a1 + ' at ' + a2.baudrate + 'bps for controller ' + a2.controllerType);
			else if (eventName == 'command') {
				if (a2 == 'gcode')
					console.log("Socket: Gcode " + a3);
				else
					console.log("Socket: Command " + a2);
			}
			else 
				console.log('Socket: Unknown command ' + eventName + ": " + a2 + ", " + a3);
		}
		else
			socket.emit(eventName, a1, a2, a3);
	}

	// handle receiving messages from cncjs socket server, or faking out for --fakeSocket option
	const receiveMessage = function(msg, callback) {
		if (!options.fakeSocket)
			socket.on(msg, callback);
		else if (options.verbose)
			console.log('Listener set up for ' + msg + ': ignored; --fakeSocket option used');
	}

	// simple map function to scale a number between a known set of ranges
	const map = function(x, in_min, in_max, out_min, out_max) {
		return Number((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
	}
	
	// move the gantry based on a distance and a computed feedrate that matches a specific amount of time.  This is used
	// so that we can keep the movement queue in sync with the joystick update intervals
	const moveGantry = function(x, y, z, ms) {
		// compute the distance we are going to travel
		dist = Math.sqrt(x*x + y*y + z*z);
		// convert to mm/min based on the ms time slice we are working with
		speed = dist * 60000/ms;
		// execute the move
		gcode.moveGantryRelative(x, y, z, speed);
		
		if (options.verbose)
			console.log('moveGantry: x=' + x + ', y=' + y + ', z=' + z + '; distance=' + dist + ' at ' + speed + 'mm/min');
	}


	// TODO: Abstract this further to machine types, and get the controller type from the machine.  This way you
	// can have an MPCNC set of code different than another machine, or even MPCNC-LASER separate from MPCNC-SPINDLE.

	// TODO: When we add button mappings, it likely should also be built around the machine type, so buttons can vary
	// based on individual machine configurations

	// set up our abstract gcode emitter
	switch (options.controllerType.toLowerCase()) {
		case 'grbl':
			Gcode = require('./gcode-grbl');
			break;
		case 'marlin':
			Gcode = require('./gcode-marlin');
			break;
		default:
			console.error('Controller type ' + options.controllerType + ' unknown; unable to continue');
			process.exit();
	}
	gcode = new Gcode(options, sendMessage);
			
	// track that we do not yet have a pendant attached
    var pendant_started = false;

	// locae and maintain a connection to the controller, including running the services.  This is run on a timer so we can
	// continue to look for the controller once started, or again afterwards if the controller drops and wants to reconnect
	setInterval(checkController, 1000);
	firstCheck = true;

	// initialize the gamepad system
	gamepadController = new GamepadController();

	function checkController(socket, controller) {
		// if we already have a pendant, ignore this as we don't need to try to (re)connect
		if (pendant_started)
			return;

		// if no controller, track that we need to tell the user
		if (!gamepadController.isConnected() && pendant_started) {
			firstCheck = true;
			pendant_started = false;
		}
		// tell user if there is no gamepad controller
		if (!gamepadController.isConnected() && !pendant_started && firstCheck) {
			console.log("No controllers found; make sure your controller is connected");
			firstCheck = false;
		} 
		// track if we have a pendant now
		if (gamepadController.isConnected() && !pendant_started) {
			console.log("Controller connected");
			pendant_started = true;
		}
		return;	// hack out during tests




		// Get HID Devices
		var devices = HID.devices();
		if (options.verbose) {
			console.log("Devices discovered:");
			console.log(devices);
		}

		// find Dualshock 3 controller HID
		devices.forEach(function(device) {
			// Dualshock 3 is vendor 1356, product 616
			if (!pendant_started && (device.vendorId == 1356 && device.productId == 616)) {
				console.log("Pendant successfully connected");
				
				// start socket connection & controller connection
				pendant_started = true;
				connectPendant();
			}
		});

		// if the first attempt, and no controllers found, tell the user they may need to press the PS button
		if (firstCheck && !pendant_started) {
			console.log("No Dualshock controllers found; make sure your controller is connected by pressing the center round (PS or P3) button");
			firstCheck = false;
		}
	}

	// start socket connection and controller connection
	function connectPendant () {
		if (!options.secret) {
	        const cncrc = path.resolve(getUserHome(), '.cncrc');
	        try {
	            const config = JSON.parse(fs.readFileSync(cncrc, 'utf8'));
	            options.secret = config.secret;
	        } catch (err) {
	            console.error(err);
	            process.exit(1);
	        }
	    }

		// set up access to the cnc.js socket server, with a valid access token
	    const token = generateAccessToken({ id: '', name: 'cncjs-pendant' }, options.secret, options.accessTokenLifetime);
	    const url = 'ws://' + options.socketAddress + ':' + options.socketPort + '?token=' + token;

		// TODO: This should be moved outside of the pendant connection system with a recovery system as well

		// attempt to connect to the server
		if (options.fakeSocket)
			console.log('Socket connect to ws://' + options.socketAddress + ':' + options.socketPort + ' ignored; --fakeSocket option used');
		else {
			if (options.verbose)
				console.log('Attempting connect to ws://' + options.socketAddress + ':' + options.socketPort);
		    socket = io.connect('ws://' + options.socketAddress + ':' + options.socketPort, {
				'query': 'token=' + token
			});
		}

		// cncjs sent us a 'connect' message, saying that we successfully are communicating
	    receiveMessage('connect', () => {
			if (options.verbose)
		        console.log('Connected to ' + url);

			// Open port to the CNC controller (command 'open')
			if (options.verbose)
				console.log('Sending open request for ' + options.port + ' at baud rate ' + options.baudrate);

			sendMessage('open', options.port, {
				baudrate: Number(options.baudrate),
				controllerType: options.controllerType
			});
	    });

		// cncjs sent us an 'error' message.  Not much we can do but report it and kill our connection.
	    receiveMessage('error', (err) => {
	        console.error('Error message received from cncjs - killing connection');
	        if (socket) {
				if (!options.fakeSocket)
					socket.destroy();
				// TODO: Need to attempt reconnect, and ensure we don't dereference null
	            socket = null;
	        }
	    });

		// connection closed message received
	    receiveMessage('close', () => {
			if (options.verbose)
		        console.log('Connection closed.');
	    });

		// our serial port open request has completed
	    receiveMessage('serialport:open', function(options) {
	        console.log('Connected to port "' + options.port + '" (Baud rate: ' + options.baudrate + ')');
	    });

		// we got an error attempting to open the serial port
	    receiveMessage('serialport:error', function(options) {
			console.error('Error opening serial port "' + options.port + '"');
			// TODO: Decide how to handle this failure, but only if we keep the open serial port feature
	    });

		/*
	    receiveMessage('serialport:read', function(data) {
	        console.log((data || '').trim());
	    });
		*/

	    /*
	    receiveMessage('serialport:write', function(data) {
	        console.log((data || '').trim());
	    });
	    */

		// pass options to init the controller.
		controller = dualShock(
			 {
				  // you may be able use a ds4 by using this config instead.  This is untested but if confirmed to work, 
				  // let me know and I'll make it into a command line option (or feel free to do that yourself and submit
				  // a pull request)
				  // config: "dualshock4-generic-driver",
				  config : "dualShock3",
				  // smooths the output from the acelerometers (moving averages) defaults to true
				  accelerometerSmoothing : true,
				  // smooths the output from the analog sticks (moving averages) defaults to false
				  analogStickSmoothing : false // DO NOT ENABLE, does not return sticks to center when enabled. 128 x 128
			 });

		// if we get a controller error, assume we have lost the controller and start scanning for a new one
		controller.on('error', function(err) {
			console.log("Controller error: " + err);
			// indicate that we have lost the pendant
			pendant_started = false;
			firstCheck = true;
		});

		// set up the output values to the controller for led and rumble.  
		ps3_led = 0b10000;
		ps3_rumble_left = 0;
		ps3_rumble_right = 0;

		// set up the gantry movement axis variables		
		var move_x_axis = 0;
		var move_y_axis = 0;
		var move_z_axis = 0;


		// set up control variables to indicate when certain buttons are being pressed.  This is used as a safety to ensure
		// we don't start actions on the CNC without have some switch thrown
		
		// The following variables are true when the respective button is pressed:
		// psx: PS/P3 button pressed
		// l1: top left button
		// l2: bottom left button
		// r1: top right button
		// r2: bottom right button

		// psx
		var psx = false;
		controller.on('psxButton:press', function(data) {
			psx = true;
			if (options.verbose)
				console.log(data + '|' + psx);
		});
		controller.on('psxButton:release', function(data) {
			psx = false;
			if (options.verbose)
				console.log(data + '|' + psx);
		});

		// L1
		var l1 = false;
		controller.on('l1:press', function(data) {
			l1 = true;
			if (options.verbose)
				console.log(data + '|' + l1);
		});
		controller.on('l1:release', function(data) {
			l1 = false;
			if (options.verbose)
				console.log(data + '|' + l1);
		});

		// R1
		var r1 = false;
		controller.on('r1:press', function(data) {
			r1 = true;
			if (options.verbose)
				console.log(data + '|' + r1);
		});
		controller.on('r1:release', function(data) {
			r1 = false;
			if (options.verbose)
				console.log(data + '|' + r1);
		});

		// L2
		var l2 = false;
		controller.on('l2:press', function(data) {
			l2 = true;
			if (options.verbose)
				console.log(data + '|' + l2);
		});
		controller.on('l2:release', function(data) {
			l2 = false;
			if (options.verbose)
				console.log(data + '|' + l2);
		});

		// R2
		var r2 = false;
		controller.on('r2:press', function(data) {
			r2 = true;
			if (options.verbose)
				console.log(data + '|' + r2);
		});
		controller.on('r2:release', function(data) {
			r2 = false;
			if (options.verbose)
				console.log(data + '|' + r2);
		});

		// Define the following commands:
		// START w/psx: unlock
		// START w/o psx: cyclestart
		// SELECT w/psx: reset
		// SELECT w/o psx: freehold

		// Unlock
		controller.on('start:press', function(data) {
			if (psx) {
				sendMessage('command', options.port, 'unlock');
			}
		});

		// Reset
		controller.on('select:press', function(data) {
			if (psx) {
				sendMessage('command', options.port, 'reset');
			}
		});


		// Cyclestart
		controller.on('start:press', function(data) {
			if (!psx) {
				sendMessage('command', options.port, 'cyclestart');
			}
		});

		// Feedhold
		controller.on('select:press', function(data) {
			if (!psx) {
				sendMessage('command', options.port, 'feedhold');
			}
		});

		// Define the following commands without any button modifiers:
		// TRIANGLE: start
		// SQUARE: stop
		// CIRCLE: pause
		// X: resume

		// Start
		controller.on('triangle:press', function(data) {
			if (!r1 && !l1 && !psx) {
				sendMessage('command', options.port, 'start');
				if (options.verbose)
					console.log('cyclestart:' + data);
			}
		});

		// Stop
		controller.on('square:press', function(data) {
			if (!r1 && !l1 && !psx) {
				sendMessage('command', options.port, 'stop');
				if (options.verbose)
					console.log('feedhold:' + data);
			}
		});


		// Pause
		controller.on('circle:press', function(data) {
			if (!r1 && !l1 && !psx) {
				sendMessage('command', options.port, 'pause');
				if (options.verbose)
					console.log('pause:' + data);
			}
		});

		// Resume
		controller.on('x:press', function(data) {
			if (!r1 && !l1 && !psx) {
				sendMessage('command', options.port, 'resume');
				if (options.verbose)
					console.log('unlock:' + data);
			}
		});

		// Define the following commands with R1 being pressed:
		// TRIANGLE: move Z up fast (0.25) while being held
		// SQUARE: probe
		// CIRCLE: move Z down slow (0.05) while being held
		// X: move Z down fast (0.25) while being held

		// Raise Z
		controller.on('triangle:press', function(data) {
			if (r1) {
				move_z_axis += 0.25;
			}
		});
		controller.on('triangle:hold', function(data) {
			if (r1) {
				move_z_axis += 0.25;
			}
		});
		controller.on('triangle:release', function(data) {
			if (r1) {
				move_z_axis = 0;
			}
		});

		// Probe
		controller.on('square:press', function(data) {
			if (r1) {
				gcode.probe();

				if (options.verbose)
					console.log('probe:' + data);
			}
		});

		// Lower Z (Slow)
		controller.on('circle:press', function(data) {
			if (r1) {
				move_z_axis -= 0.05;
			}
		});
		controller.on('circle:hold', function(data) {
			if (r1) {
				move_z_axis -= 0.05;
			}
		});
		controller.on('circle:release', function(data) {
			if (r1) {
				move_z_axis = 0;
			}
		});

		// Lower Z
		controller.on('x:press', function(data) {
			if (r1) {
				move_z_axis -= 0.25;
			}
		});
		controller.on('x:hold', function(data) {
			if (r1) {
				move_z_axis -= 0.25;
			}
		});
		controller.on('x:release', function(data) {
			if (r1) {
				move_z_axis = 0;
			}
		});


		// Define the following commands with PSX being pressed:
		// TRIANGLE: Coolant mist on
		// SQUARE: Coolant off
		// CIRCLE: Coolant flood on
		// X: Home

		// M7 - mist on
		controller.on('triangle:press', function(data) {
			if (psx) {
				gcode.coolantMistOn();
			}
		});

		// M9 - coolant off
		controller.on('square:press', function(data) {
			if (psx) {
				gcode.coolantOff();
			}
		});

		// M8 - flood on
		controller.on('circle:press', function(data) {
			if (psx) {
				gcode.coolantFloodOn();
			}
		});

		// Home
		controller.on('x:press', function(data) {
			if (psx) {
				gcode.moveGantryHome();
			}
		});

		// define support functions for gantry movement using the dpad controls.  Accepts axis ("X" or "Y"), direction
		// (true up, false down) and the controller button name.  Set speeds to fast if l2, slow if l1 and normal if none.
		function dpad(axis, direction, name) {
			if (l2) {
				// fast
				dpadSetAxisMovment(axis, direction, 3);
			} else if (l1) {
				// slow
				dpadSetAxisMovment(axis, direction, 1);
			} else {
				// normal
				dpadSetAxisMovment(axis, direction, 2);
			}

			if (options.verbose)
				console.log(name + ': ' + direction + ' | ' + axis + ' | '  + l1 + ' | ' + r1);
		}

		// TODO: Consider bringing Z movement into this as well?

		// based on the axis ("X" or "Y"), direction (true=up, false=down) and speed (1=slow, 2=normal, 3=fast), adjust
		// the move_x_axis and move_y_axis variables accordingly
		function dpadSetAxisMovment(axis, direction, speed) {
			// set speed
			switch(speed) {
				case 1:
					speed = 0.05;
					break;
				case 3:
					speed = 5;
					break;
				default:
					speed = 0.5;
			}

			// set movement variables
			if (axis == "X" && ( move_x_axis < 14 && move_x_axis > -14 )) {
				// adjust X axis
				if (direction) {
					move_x_axis += speed;
				} else {
					move_x_axis += speed * -1;
				}
			} else if (axis == "Y" && ( move_y_axis < 14 && move_y_axis > -14 )) {
				// adjust Y axis
				if (direction) {
					move_y_axis += speed;
				} else {
					move_y_axis += speed * -1;
				}
			}

			if (options.verbose)
				console.log("DPad Set Movemnet: " + move_x_axis + ': ' + move_y_axis + "   | " + speed)
		}

		// handle continuous movement of gantry by using a timer interval
		setInterval(dpadMoveAxis, 100);
		function dpadMoveAxis() {
			// do we need to move the gantry?
			if (move_x_axis != 0 || move_y_axis != 0 || move_z_axis != 0)
			{
				// move gantry, using a speed that does it within our interval rate (so we stay in sync with timing of gantry)
				moveGantry(move_x_axis, move_y_axis, move_z_axis, 100);

				if (options.verbose)
					console.log("DPad MOVE: " + move_y_axis + ': ' + move_y_axis + ': ' + move_z_axis);

				// reset movement
				move_x_axis = 0;
				move_y_axis = 0;
				move_z_axis = 0;
			}
		}

		// handle dpad operations on Y up/down and X up/down
		
		// Y Up
		controller.on('dpadUp:press', function(data) {
			dpad('Y', true, data)
		});
		controller.on('dpadUp:hold', function(data) {
			dpad('Y', true, data)
		});
    	controller.on('dpadUp:release', function(data) {
			move_y_axis = 0;
		});

		// Y Down
		controller.on('dpadDown:press', function(data) {
			dpad('Y', false, data)
		});
		controller.on('dpadDown:hold', function(data) {
			dpad('Y', false, data)
		});
    	controller.on('dpadDown:release', function(data) {
			move_y_axis = 0;
		});

		// X Right
		controller.on('dpadRight:press', function(data) {
			dpad('X', true, data)
		});
		controller.on('dpadRight:hold', function(data) {
			dpad('X', true, data)
		});
    	controller.on('dpadRight:release', function(data) {
			move_x_axis = 0;
		});

		// X Left
		controller.on('dpadLeft:press', function(data) {
			dpad('X', false, data)
		});
		controller.on('dpadLeft:hold', function(data) {
			dpad('X', false, data)
		});
    	controller.on('dpadLeft:release', function(data) {
      		move_x_axis = 0;
    	});

		// handle commands r2
		// r2 press + r1 + psx: spindle on
		// r1 release w/o psx when spindle on: : spindle off

		// spindle on state
		var spindle = false;

		// start spindle
		controller.on('r2:press', function(data) {
			if (r1 && psx) {
				gcode.spindleOn(1000);
				spindle = true;
				if (options.verbose)
					console.log('Spindle: ' + spindle);
			}
		});

		// stop spindle
		controller.on('r2:release', function(data) {
			if (!psx && spindle) {
				gcode.spindleOff();
				spindle = false;
				if (options.verbose)
					console.log('Spindle: ' + spindle);
			}
		});

		// analog sticks are used for continuous movement, speed based on amount moved.  Currently both
		// sticks control the same movement (X/Y).  They must be enabled by using one of the stick buttons (press) to
		// turn on (and off).

		// analog sticks
		var stick_sensitivity = 1; // Do not set below 1

		var left_x = 0;
			left_y = 0;
		var right_x = 0;
			right_y = 0;

		// safety
		var stick_left = false;
			stick_right = false;

		// safety button check
		controller.on('leftAnalogBump:press', function(data) {
			// toggle enable (currently both are locked together, change either it affects both)
			if (stick_left  || stick_right) {
				stick_left = false;
				stick_right = false;
				ps3_rumble_left = 0; // 0-1 (Rumble left on/off)
			} else {
				stick_left = true;
				stick_right = true;
				ps3_rumble_left = 1; // 0-1 (Rumble left on/off)
			}

			if (options.verbose)
				console.log('L] rightAnalogBump: ' + stick_right + " leftAnalogBump: "+ stick_left);

			// Rumble Controller Briefly
			ps3_rumble_left = 1; // 0-1 (Rumble left on/off)
			setTimeout(function () {
				ps3_rumble_left = 0; // 0-1 (Rumble left on/off)
			}, 510);
		});

		// TODO: This is mostly redundant with above - merge these
		controller.on('rightAnalogBump:press', function(data) {
			// toggle enable (currently both are locked together, change either it affects both)
			if (stick_right || stick_left) {
				stick_right = false;
				stick_left = false;
				ps3_rumble_left = 0; // 0-1 (Rumble left on/off)
			} else {
				stick_right = true;
				stick_left = true;
				ps3_rumble_left = 1; // 0-1 (Rumble left on/off)
			}

			if (options.verbose)
				console.log('R] rightAnalogBump: ' + stick_right + " leftAnalogBump: "+ stick_left);

			// Rumble Controller Briefly
			ps3_rumble_left = 1; // 0-1 (Rumble left on/off)
			setTimeout(function () {
				ps3_rumble_left = 0; // 0-1 (Rumble left on/off)
			}, 510);
		});

		// Handle the analog sticks moving left/right/up/down
		// TODO: currently sticks are tracked separately yet do same thing - should either eliminate this or provide value from it
		controller.on('left:move', function(data) {
			if (options.verbose)
				console.log('left Moved: ' + data.x + ' | ' + Number((data.y * -1) +255));
			if (stick_left) {
				left_x = data.x - 128
				left_y = (data.y * -1) +128
			} else {
				left_x = 0;
				left_y = 0;
			}

			if (options.verbose)
				console.log('stick-left: ' +  Number(data.x - 128) + ' [' + right_x + '] | ' +  Number(data.y - 128) + ' [' + right_y + '] | ' + stick_left)
		});
		controller.on('right:move', function(data) {
			if (options.verbose)
				console.log('right Moved: ' + data.x + ' | ' + Number((data.y * -1) +255));
			if (stick_right) {

				right_x = data.x - 128
				right_y = (data.y * -1) +128
			} else {
				right_x = 0;
				right_y = 0;
			}

			if (options.verbose)
				console.log('stick-right: ' + Number(data.x - 128) + ' [' + right_x + '] | ' +  Number(data.y - 128) + ' [' + right_y + '] | ' + stick_right)
		});

		// move gantry based on sticks at a regular interval
		setInterval(stickMovement, 50);

		// move X & Y based on stick movements
		function stickMovement() {
			var sum_x = Number(left_x + right_x);
			var sum_y = Number(left_y + right_y);

			if (left_x >= stick_sensitivity | left_x <= -stick_sensitivity || left_y >= stick_sensitivity || left_y <= -stick_sensitivity || right_x >= stick_sensitivity || right_x <= -stick_sensitivity || right_y >= stick_sensitivity || right_y <= -stick_sensitivity) {
				// additional safety check
				// TODO: Research why this is here
				if (!stick_left) {
					left_x = 0; left_y = 0;
				}
				if (!stick_right) {
					right_x = 0; right_y = 0;
				}

				// move gantry a distance at a speed consistent with our interval rate
				moveGantry(map(sum_x, 0, 128, 0.0001, 2), map(sum_y, 0, 128, 0.0001, 2), 0, 50);

				if (options.verbose)
					console.log('setInterval: x' + sum_x + ' y' + sum_y);
			}
		}

		// controller status
		// as of version 0.6.2 you can get the battery %, if the controller is connected and if the controller is charging
		var battery_level = 0;
		controller.on('battery:change', function (value) {
			// Set LEDs
			switch(value) {
				case '100%':
				case "90%":
					ps3_led = 30;  // 0b11110 // 2 | 4 | 8 | 16 (Leds 1-4 on/off, bitmasked)
					break;
				case "80%":
				case "70%":
					ps3_led = 28;  // 0b11100 // 2 | 4 | 8 | 16 (Leds 1-4 on/off, bitmasked)
					break;
				case "50%":
				case "40%":
				case "30%":
					ps3_led = 24;  // 0b11000 // 2 | 4 | 8 | 16 (Leds 1-4 on/off, bitmasked)
					break;
				default:
					ps3_led = 16;  // 0b10000 // 2 | 4 | 8 | 16 (Leds 1-4 on/off, bitmasked)
					break;
			}
		});

		/*
		controller.on('connection:change', function (value) {
			if (options.verbose)
				console.log('connection:change:' + value);
		});

		controller.on('charging:change', function (value) {
			if (options.verbose)
				console.log('connection:change:' + value);
		});
		*/
	}
};
