from flask_socketio import SocketIO
from flask import Flask, render_template, request
import base64
from visca import camera
import json
from time import sleep

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')
socketio = SocketIO(app, cors_allowed_origins="*")
cam = camera.D100(output='COM4')
cam.init()
cam.home()

@app.route('/')
def index():
    """Home page."""
    return render_template('index.html')

@socketio.on('connect')
def connect_web():
    print('[INFO] Web client connected: {}'.format(request.sid))

@socketio.on('test')
def test():
    print('[INFO] Web client {} said TEST'.format(request.sid))

@socketio.on('disconnect')
def disconnect_web():
    print('[INFO] Web client disconnected: {}'.format(request.sid))


@socketio.on('change_state')
def handle_state(message):
	print('[INFO] Web client {}: Command = change_state => {}'.format(request.sid, message))
	# parsed = json.loads(message)
	if(message['direction'] == "up"):
		cam.up(amount=10)
		# sleep(1)
		# cam.stop()
	elif(message['direction'] == "down"):
		cam.down(amount=10)
		# sleep(1)
		# cam.stop()	
	elif(message['direction'] == "left"):
		cam.left(amount=10)
		# sleep(1)
		# cam.stop()	
	elif(message['direction'] == "right"):
		cam.right(amount=10)
		# sleep(1)
		# cam.stop()
	elif(message['direction'] == "stop"):
		cam.stop()	
	socketio.emit('server2web',{ 'text':'Command = change_state => {}'.format(message)}, namespace='/web')

#def new_frame():


if __name__ == "__main__":
    print('[INFO] Starting server at http://localhost:4001')
    socketio.run(app=app, host='0.0.0.0', port=4001)
