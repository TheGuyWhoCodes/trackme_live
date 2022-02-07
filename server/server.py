import cv2
from flask_socketio import SocketIO
from flask import Flask, render_template, request, Response
import base64
from visca import camera
import json
import serial.tools.list_ports
import sys

from cameraconnections import VISCACamera
import asyncio
import platform
import subprocess
if platform.system() == 'Windows':
	from pygrabber.dshow_graph import FilterGraph

# Init Flask Instances
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

camera = VISCACamera()

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
	if camera.Connection == None:
		socketio.emit('server2web',{ 'text':'Unable to move camera, not initalized'}, namespace='/web')
		return	

	if(message['direction'] == "up"):
		camera.Connection.up(amount=15)
	elif(message['direction'] == "down"):
		camera.Connection.down(amount=15)
	elif(message['direction'] == "left"):
		camera.Connection.left(amount=15)
	elif(message['direction'] == "right"):
		camera.Connection.right(amount=15)
	elif(message['direction'] == "stop"):
		camera.Connection.stop()
	
	socketio.emit('change_state', { 'text':'Command = change_state => {}'.format(message)})


@socketio.on('create_camera')
def create_visca_camera(message):
	""" create_visca_camera will create a VISCA camera connection using a serial port
	and camera connection.
	"""
	try:
		camera.init_camera(message['camera'], message['port'])
		socketio.emit("create_camera", {'status': 'Successfully created cameras!', 'camera': message['camera'], 'port': message['port']})
	except Exception as err:
		socketio.emit('create_camera', {'status':'{}'.format(err)})

@socketio.on('destroy_camera')
def destroy_visca_camera():
	""" destroy_visca_camera will destroy the camera interface, prepping it for another connection later
	"""
	print("hello worldddddddddd")
	try:
		camera.stop_camera_instance()
	except Exception as err:
		print(err)
		socketio.emit('destroy_camera', {'status':'{}'.format(err)})


@socketio.on('get_active_com_devices')
def get_active_com_devices():
	""" get_active_com_devices returns a list of COM devices that could be 
		the VISCA camera that will be needed.
	"""
	socketio.emit('get_active_com_devices',{ 'status':'{}'.format(serial_ports())})

@socketio.on('get_active_com_port')
def get_active_com_port():
	""" get_active_com_port returns the active VISCA COM port used in the software
	"""
	if camera.Connection is None:
		socketio.emit('get_active_com_port', {'status':'Serial connection with camera not established'})
		return
	socketio.emit('get_active_com_port', {'status':'{}'.format(camera.Connection._output_string)})

@socketio.on('set_active_com_port')
def set_active_com_port(message):
	try:
		camera.update_com_port(message["port"])
		socketio.emit('set_active_com_port', {'status': 'Successfully updated the camera to {}'.format(message['port'])})
	except Exception as err:
		socketio.emit('set_active_com_port', {'status': 'Unable to update port: {}'.format(err), 'success' : False})


@socketio.on('get_active_video_port')
def get_active_video_port():
	""" get_active_com_port returns the active VISCA COM port used in the software
	"""
	if camera.Video == None:
		socketio.emit('get_active_video_port', {'status':'Video connection with camera not established'})
		return
	socketio.emit('get_active_video_port', {'status':'{}'.format(camera.VideoSrc)})

@socketio.on('set_active_video_port')
def set_active_video_port(message):
	try:
		camera.update_camera(message)
	except:
		return None

@socketio.on('get_active_video_and_com_port')
def get_active_video_and_com_port():
	socketio.emit("create_camera", {'camera': camera.VideoSrc, 'port': camera.Connection._output_string})

@socketio.on('get_available_video_ports')
def get_available_video_ports():
	socketio.emit('get_available_video_ports', {'status':'{}'.format(generate_camera_ports())})

@socketio.on('get_usb_camera_names')
def get_usb_camera_names(message):
	cameras = []
	camera_indexes = message["availableVideo"]
	if len(camera_indexes) > 0:
		platform_name = platform.system()
		if platform_name == 'Windows':
			graph = FilterGraph()
			cameras = graph.get_input_devices()
		if platform_name == 'Linux':
			for camera_index in camera_indexes:
				camera_name = subprocess.run(['cat', '/sys/class/video4linux/video{}/name'.format(camera_index)], stdout=subprocess.PIPE).stdout.decode('utf-8')
				camera_name = camera_name.replace('\n', '')
				cameras.append(camera_names)
	socketio.emit('get_usb_camera_names', {'status':'{}'.format(cameras)})

@app.route('/video_feed')
def video_feed():
	""" video_feed will return the frames generated by opencv.
	"""
	return Response(generate_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')



def serial_ports():
	""" serial_ports Lists serial port names that are currently active on the computer
	"""
	ports = serial.tools.list_ports.comports()
	arr = []
	for p in ports:
		arr.append(p.device)
	return arr

def generate_camera_ports():
	""" generate_camera_ports() will generate the integer port numbers needed to activate a
	camera, this does not account for ports already in use, this should be caught in an error
	when creating / updating the camera stream
	returns: list of integers 0...x , returns [] if no cameras
	"""
	index = 0
	arr = []
	while True:
		cap = cv2.VideoCapture(index)
		if not cap.read()[0]:
			break
		else:
			arr.append(index)
		cap.release()
		index += 1

	return arr

def generate_stream():
	if camera.Video is None:
		return None
	while True:
		frame = camera.Video.read()
		ret, buffer = cv2.imencode('.jpg', frame)
		frame = buffer.tobytes()
		yield (b'--frame\r\n'
				b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')



if __name__ == "__main__":
	print('[INFO] Starting server at http://localhost:4001')
	socketio.run(app=app, host='0.0.0.0', port=4001)
