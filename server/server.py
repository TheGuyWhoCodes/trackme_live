from flask_socketio import SocketIO
from flask import Flask, render_template, request
import base64
from visca import camera
import json
from time import sleep

# Init Flask Instances
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Init Camera object (Default COM4). This probably won't connect
# and most likely we will need to not initalize it until we see what the user
# chooses, but for right now this is it. Maybe if we add more cameras, we
# could add some way to track multiple camera d100 objects ie: hashmap? idk spitballing
try:
	cam = camera.D100(output='COM4')
	cam.init()
	cam.home()
except:
	cam = None
	app.logger.warning("Unable to create camera device, wait for the user to do it.")

@socketio.on('connect')
def connect_web():
    print('[INFO] Web client connected: {}'.format(request.sid))

@socketio.on('disconnect')
def disconnect_web():
    print('[INFO] Web client disconnected: {}'.format(request.sid))

# Handle change in direction of camera, this will need to be
# swapped to a case statement with enums if doable
@socketio.on('change_state')
def handle_state(message):
	print('[INFO] Web client {}: Command = change_state => {}'.format(request.sid, message))
	if cam == None:
		print("HITTING")
		socketio.emit('server2web',{ 'text':'Unable to move camera, not initalized'}, namespace='/web')
		return
	if(message['direction'] == "up"):
		cam.up(amount=10)
		cam.stop()
	elif(message['direction'] == "down"):
		cam.down(amount=10)
		cam.stop()	
	elif(message['direction'] == "left"):
		cam.left(amount=10)
		cam.stop()	
	elif(message['direction'] == "right"):
		cam.right(amount=10)
		cam.stop()
	elif(message['direction'] == "stop"):
		cam.stop()	
	socketio.emit('server2web',{ 'text':'Command = change_state => {}'.format(message)}, namespace='/web')

if __name__ == "__main__":
    print('[INFO] Starting server at http://localhost:4001')
    socketio.run(app=app, host='0.0.0.0', port=4001)
