to make a custom device entry in the vendor.js lib


install  node-hid using this command for current user only
npm install --build-from-source -g node-hid // current user

or install using this for root level
sudo npm install -g --build-from-source --unsafe-perm node-hid //Global





connect the device, usb controller, bluetooth controller, or other HID device and then type

hid-showdevices

to show a list of devices, it should return something like

devices: [ { vendorId: 6473,
    productId: 1026,
    path: '/dev/hidraw1',
    serialNumber: '58:8d:e1:6d:bc:cd',
    manufacturer: '',
    product: 'Bluetooth Gamepad',
    release: 0,
    interface: -1 } ]

take note of the vendorId and productId, we'll need that soon. 

Note: if nothing is returned when you run hid-showdevices, your device is either not connected or is not HID compatible.

With node-gamecontroller module, things are either buttons, or Axis;

Below is the vendor record template you should add into the vendors.js beneath the line that shows "module.exports = {" change deviceName to whatever, then vendorId and productId to what we found earlier.


"deviceName": {
        "vendorId": 1673,
        "productId": 1026,
        "state": {
		
            "button:A": 0,
            "button:B": 0,
            "button:X": 0,
            "button:Y": 0,

            "button:L1": 0,
            "button:R1": 0,

            "axis:LY": 0,
            "axis:LX": 0,
			
			// D-pad
            "button:N": 0,
            "button:E": 0,
            "button:S": 0,
            "button:W": 0,
            
            "button:Start": 0,
            "button:Select": 0
        },
        "prev": { // Simple copy of state 
            "button:A": 0,
            "button:B": 0,
            "button:X": 0,
            "button:Y": 0,

            "button:L1": 0,
            "button:R1": 0,

            "axis:LY": 0,
            "axis:LX": 0,

            // D-pad
            "button:N": 0,
            "button:E": 0,
            "button:S": 0,
            "button:W": 0,

            "button:Start": 0,
            "button:Select": 0
        },
        "update": function (data) {
			var state = this.state;

            state['button:A'] = data[6] >> 0 & 1;
            state['button:B'] = data[6] >> 1 & 1;
            state['button:X'] = data[6] >> 3 & 1;
            state['button:Y'] = data[6] >> 4 & 1;

            state['button:L1'] = data[6] >> 6 & 1;
            state['button:R1'] = data[6] >> 7 & 1;
			
            state['axis:JOYL:Y'] = data[2];
            state['axis:JOYL:X'] = data[1];

            data[5] = data[5] % 80;
            state['button:N'] =  + (data[5] === 0);
            state['button:E'] =  + (data[5] === 2);
            state['button:S'] =  + (data[5] === 4);
            state['button:W'] =  + (data[5] === 6);

            state['button:Start'] = data[7] >> 3 & 1;
            state['button:Select'] = data[7] >> 2 & 1;

            return state;
        },
        "setRumble": function () {},
        "setLED": function (led, val) {}
    },


once that's loaded in, we need to run the test stream to see what values HID picks up.
If you installed the pendant globally using sudo, you can now just run the command hidraw to see a buffer array of data that looks like this
<Buffer 07 80 80 80 80 88 00 00 00 00>
each 2 digit segment represents a hex byte displayed in Decimal. When the vendor file shows something like data[5] it means the hex byte in the 5th set. JS arrays start at 0, so in this case data[5] is 88

now you're going to need to systematically identify which byte corresponds to which buttons or axis, in most cases buttons share a byte. For instance select and start buttons use data[7] which in my case sets the byte to 04 and 08 respectivally. 

the >> operator is called right shift, and it converts those decimal values to binary and shifts all digits one to the right.
it would look something like this

Decimal 4 >> 1 = Decimal 2
0100 >> 1 = 0010

the value after the >> operator tells us how many shifts we need to make, the & operator tells the system that the result has to equal 1

so to get the Select button to show as pressed we need to shift 2 times. it would look like this

decimal 4 >> 2 = decimal 1
0100 >> 2 = 0001

here's a harder one, to make sure you understand, we need to get R1 to show as pressed, the decimal value it returns is 80.

how many shifts must we make to get the 80 to 1?

1010000 >> ? = 1 

the correct answer is 7 shifts, as the most significant bit is 7

















