# Dualshock 3 CNC pendant for CNC.js

Pendant controller for [Dualshock 3 joystick](https://www.playstation.com/en-us/explore/accessories/Dualshock-3-ps3/) for [CNC.js](cnc.js.org), allowing you to use a USB or wireless (Bluetooth) connected Dualshock 3 (Playstation 3) controller for operations like jogging, homing and manging jobs.

## Fork information

This is a fork of the original [cncjs-pendant-ps3 driver](https://github.com/cncjs/cncjs-pendant-ps3), which adds the following features:

* Abstracted gcode to allow for support of different controllers and machines
    * Currently supports Grbl and Marlin
    * Don't have the controller you need?  Consider adding one - it's easy!  Look at src/gcode-marlin.js for an example.
* Improvements to README documentation
* Works with any joystick (not just PS3)
    * This has a small loss of functionality compared to the original version as rumble and battery status are not available
    * Also fixes the problem of node-hid not working without extra compiles
* Handles clone PS3 controllers (see --clone)
* New debugging features (see --fakeSocket and --verbose)
* Auto-reconnect to pendant if connection fails
* Made --port (-p), --baudrate (-b) and --controllerType (-t) required parameters 
* Added computed feed speed based on distance to travel to have gantry that quickly respond to changes (required at least for Marlin)

--------------------------------------

# Button map

![Button Map](images/cncjs-button-map.png)

[PS3 CNC Control Button Map](https://docs.google.com/drawings/d/1DMzfBk5DSvjJ082FrerrfmpL19-pYAOcvcmTbZJJsvs/edit?usp=sharing)

---------------------------------------

# Controller setup

I recommend always starting by USB configuration working before proceeding to Bluetooth wireless.

## USB configuration

Plug the controller into one of the USB ports

### Test controller connectivity
PS3 Controller: press the PS button, the lights on the front of the controller should flash for a couple of seconds then stop, leaving a single light on. If you now look again at the contents of /dev/input you should see a new device, probably called something like ‘js0’:

```
# List Devices
ls /dev/input
```

If this works, you should see something like this (most importantly, the "js0"):

```
$ ls /dev/input
event0  event1  event2  js0  mice  mouse0
```

If the pendant is not connected, you might see:

```
$ ls /dev/input
event0  mice  mouse0
```

### Get battery level (optional)

This will display the current battery level, and proves that basic communication with the device is working.

`cat "/sys/class/power_supply/sony_controller_battery_64:d4:bd:b3:9e:66/capacity"`


### Test using the joystick application (optional)
```
# Install
sudo apt-get -y install joystick

# Usage / Test
jstest /dev/input/js0
```
You will see a live output of the various switches and joysticks, and can test the operation of the joystick.  Break out with ^C when done.

## Bluetooth configuration

If the above works, you can proceed to finishing the install of cncjs-pendant-ps3 below or attempt to work through getting Bluetooth wireless working.  This can be done after installing and operating on USB if desired as no configuration will change on the pendant configuration otherwise.

Word of caution - getting Bluetooth working can sometimes be a challenging process, especially if using a cheap PS3 clone.

### Install
```
# Install & Enable Bluetooth Tools
sudo apt-get install -y bluetooth libbluetooth3 libusb-dev
sudo systemctl enable bluetooth.service

# Add pi user to bluetooth group
sudo usermod -G bluetooth -a pi
```

### Pairing Tools
```
# Get and build the command line pairing tool (sixpair)
wget http://www.pabr.org/sixlinux/sixpair.c
gcc -o sixpair sixpair.c -lusb

### Connect PS3 over USB
# Get PS3 DS 
sudo ./sixpair
```

### Pairing Dualshock 3 controller
See [Sony Dualshock](https://wiki.gentoo.org/wiki/Sony_Dualshock) for more details on configuration
```
### Disconnect Dualshock 3 over USB

# Start bluetoothctl:
bluetoothctl

# Enable the agent and set it as default:
agent on
default-agent

# Power on the Bluetooth controller, and set it as discoverable and pairable:
power on
discoverable on
pairable on

### Connect Dualshock 3 over USB, and press the PlayStation button.

# Discover the Dualshock 3 MAC address:
devices

### Disonnect Dualshock 3 over USB

#Allow the service authorization request:
#[agent]Authorize service service_uuid (yes/no): yes

#Trust the Dualshock 3:
#trust device_mac_address # Replace "MAC" with MAC of "Device 64:D4:BD:B3:9E:66 PLAYSTATION(R)3 Controller"
trust 64:D4:BD:B3:9E:66 

# The Dualshock 3 is now paired:
quit

# Turn the Dualshock 3 off when it's no longer in use by pressing and holding the PlayStation button for 10 seconds.
# Press the PlayStation button to use the Dualshock 3 again.
```


----------------------------------------

# Installation

## Update Node to v8
First you need to make sure you have Node version 8 (some dependent modules do not support later versions of Node):

```
node -v
```

If you do not have node v8, this script will do the upgrade as well as ensure your global modules are all udpated:

```
wget -O - https://raw.githubusercontent.com/audstanley/NodeJs-Raspberry-Pi/master/node-install >node-install.sh
sudo chod +x node-install.sh
sudo node-install -v 8.17.0
```

## Clone and install cncjs-pendant-ps3

Do the following to clone and install the cncjs-pendant-ps3 software:

<!--

```
sudo apt-get install -y libudev-dev libusb-1.0-0 libusb-1.0-0-dev build-essential git
sudo apt-get install -y gcc-4.8 g++-4.8 && export CXX=g++-4.8

# Install cncjs-pendant-ps3
sudo npm install -g cncjs-pendant-ps3 --unsafe-perm  # Install Globally
```
-->
```
# Clone the github repo for cmidgley/cncjs-pendant-ps3
cd ~
git clone https://github.com/cmidgley/cncjs-pendant-ps3.git
cd cncjs-pendant-ps3
npm install
```

Note that there will be quite a few warnings, such as deprecated modules and compiler warnings.  You can ignore this for now, though someday work should be done fix this...!  Anyone want to attack this problem?!

<!-->
### If not installed globally, or no pendant found
The Dualshock controller [does not use the joystick implementation](https://github.com/rdepena/node-Dualshock-controller), and requires node-hid with hidraw to be installed.  When installing this package globally, this often works.  But if installed locally, or you find that joystick testing works but cncjs-pendant-ps3 doesn't find any pendants when it starts up, you should try installing node-hid as follows:

```
# Install (node-hid --driver=hidraw) on cncjs-pendant-ps3
# Start in directory that contains cncjs-pendant-ps3, such as:
cd /usr/lib/node_modules/cncjs-pendant-ps3/
sudo npm install node-hid --driver=hidraw --build-from-source --unsafe-perm
```
-->
### Create udev rules

_TODO: Need to verify if this is actually required any more given the new game controller._

In order to be able to [access the pendant as a non-root user](https://github.com/rdepena/node-Dualshock-controller#-create-udev-rules), you need to configure the udev rules.

```
# Run as Root
sudo su

# You will need to create a udev rule to be able to access the hid stream as a non root user.
sudo touch /etc/udev/rules.d/61-Dualshock.rules
sudo cat <<EOT >> /etc/udev/rules.d/61-Dualshock.rules
SUBSYSTEM=="input", GROUP="input", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="054c", ATTRS{idProduct}=="0268", MODE:="666", GROUP="plugdev"
KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0664", GROUP="plugdev"

SUBSYSTEM=="input", GROUP="input", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="054c", ATTRS{idProduct}=="05c4", MODE:="666", GROUP="plugdev"
KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0664", GROUP="plugdev"
EOT

# Reload the rules, then disconnect/connect the controller.
sudo udevadm control --reload-rules

exit
```

I recommend rebooting before continuing.  

----------------------------------

# Running cncjs-pendant-ps3

The program accepts several optional arguments:
<!--* `-l, --list` List available ports and then exit -->
* `-p, --port <port>` The port of the controller, such as /dev/ttyUSB0 or /dev/ACM0 (required)
* `-b, --baudrate <baudrate>` The baudrate used when connecting to the controller (required)
* `-t, --controllerType <type>` The type of controller (marlin, grbl, smoothie, tinyg) (required)
* `-s, --secret <secret>` The secret API key for accessing the cncjs server.  If not specified, checks if environment variable CNCJS_SECRET is set, and if not, goes directly to the ~/.cncrc file to get the secret.  Generally can be ignored when cncjs and cncjs-pendant-ps3 are on the same server, but must be specified if they are operating on difference servers.
* `--socketAddress <address>` The IP address / DNS name of the cncjs server (default: localhost) 
* `--socketPort <port>` The port number of the cncjs server (default: 8000)
* `--clone` if using a cloned PS3 controller you might get a write timout when starting up.  Disables writes to controller, so rumble and led status is disabled.
* `--accessTokenLifetime <lifetime>` How long the access token should be generated, can generally be ignored.  In seconds or a time span string (default: 30d)
* `-v, --verbose` Display verbose (debugging) messages
* `-f, --fake` Use a fake socket server and display cncjs messages to console instead
* `--help` bring up a help listing of all options

The most important options are --port (-p) to specify the communications port to the controller, --baudrate (-b) to specify the connection speed, and --controllerType (-t) to specify the type of controller you are running (Marlin, Grbl, etc).  <!--If you don't know your port number, use the --list (-l) option to see a list of ports to try.-->

Here is how those options are used.  If CNC.js is already connected, the port is used to locate the existing connection and no reconnection or change is made to baudrate or controller.  However, if CNC.js is not connected, then these parameters are used to establish a connection to the controller.

To start the pendant server, run a command similar to this:

```
cd ~/cncjs-pendant-ps3
node cncjs-pendant-ps3 -p /dev/ACM0 -b 250000 -clone -t marlin
```

## First use recommendation

I recommend running cncjs-pendant-ps3 using the --fakeServer (or -f) first, as you can see the commands being sent (such as gcode or operations such as stop) without moving the actual gantry.  This is very useful to prove that everything is working and helps as a teaching aid while getting used to using the controls.

----------------------------------------

# Configuring for auto-start

There are many ways in Linux to configure auto-start on boot.  This example shows using [Production Process Manager [PM2]](http://pm2.io) (note you must replace [PATH_TO_NODE_BIN] with the path to node, which you can find with 'which node'):

```
# Install Production Process Manager [PM2]
npm install pm2 -g

# Setup PM2 Startup Script
pm2 startup debian
  #[PM2] You have to run this command as root. Execute the following command:
  sudo su -c "env PATH=$PATH:[PATH_TO_NODE_BIN] pm2 startup debian -u pi --hp /home/pi"

# Start Dual Shock / PS3 Bluetooth Remote Pendant for CNCjs (conected to serail device @ /dev/ttyUSB0) with PM2
pm2 start $(which cncjs-pendant-ps3) -- -p "/dev/ttyUSB0"

# Set current running apps to startup
pm2 save

# Get list of PM2 processes
pm2 list
```
