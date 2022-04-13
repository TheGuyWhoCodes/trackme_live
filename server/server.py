import cv2
from flask_socketio import SocketIO
from flask import Flask, render_template, request, Response
import base64
from visca import camera
import json
import serial.tools.list_ports
import sys

from queue import Queue
from cameraconnections import VISCACamera
import asyncio
import platform
import subprocess
if platform.system() == 'Windows':
	import winrt.windows.devices.enumeration as windows_devices

from threading import Thread
	
# Init Flask Instances
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

camera = VISCACamera()
active_cameras = []

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
	elif(message['direction'] == "upleft"):
		camera.Connection.left_up(pan=10, tilt=10)
	elif(message['direction'] == "upright"):
		camera.Connection.right_up(pan=10, tilt=10)
	elif(message['direction'] == "downleft"):
		camera.Connection.left_down(pan=10, tilt=10)
	elif(message['direction'] == "downright"):
		camera.Connection.right_down(pan=10, tilt=10)
	elif(message['direction'] == "stop"):
		camera.Connection.stop()
	elif(message['direction'] == "home"):
		camera.Connection.home()
	socketio.emit('change_state', { 'text':'Command = change_state => {}'.format(message)})


@socketio.on('create_camera')
def create_visca_camera(message):
	""" create_visca_camera will create a VISCA camera connection using a serial port
	and camera connection.
	"""
	try:	
		camera.init_camera(message['camera'], message['port'], active_cameras[int(message['camera'])]['camera_name'])
		socketio.emit("create_camera", {'status': 'Successfully created cameras!', 'camera': message['camera'], 'port': message['port']})
	except Exception as err:
		socketio.emit('create_camera', {'error':'{}'.format(err)})
	send_active_video_and_com_port()

@socketio.on('destroy_camera')
def destroy_visca_camera():
	""" destroy_visca_camera will destroy the camera interface, prepping it for another connection later
	"""
	try:
		camera.stop_camera_instance()
	except Exception as err:
		socketio.emit('destroy_camera', {'status':'{}'.format(err)})
	send_active_video_and_com_port()


@socketio.on('get_available_com_devices')
def get_available_com_devices():
	""" get_active_com_devices returns a list of COM devices that could be 
		the VISCA camera that will be needed.
	"""
	ret = {}
	ret['status'] = serial_ports()
	socketio.emit('get_available_com_devices', ret)

@socketio.on("refresh_active_com_port")
def refresh_active_com_port():
	if camera.Connection is not None:
		camera.Connection.cancel()
		camera.Connection.reset()

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
	send_active_video_and_com_port()

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
	send_active_video_and_com_port()

@socketio.on('get_active_video_and_com_port')
def get_active_video_and_com_port():
	send_active_video_and_com_port()

@socketio.on('zoom')
def set_zoom_amount(message):
    print('[INFO] Web client {}: Command = change_state => {}'.format(request.sid, message))
    if camera.Connection == None:
            socketio.emit('server2web',{ 'text':'Unable to zoom camera, not initalized'}, namespace='/web')
            return
    camera.Connection.zoom(message['amount'])
    socketio.emit('zoom', { 'text':'Command = zoom => {}'.format(message)})

@socketio.on('get_available_video_ports_and_camera_names')
def get_available_video_ports_and_camera_names():
	cameras = []
	camera_indexes = generate_camera_ports()
	if len(camera_indexes) > 0:
		platform_name = platform.system()
		if platform_name == 'Windows':
			cameras_info_windows = asyncio.run(get_camera_information_for_windows())
			for camera_index in camera_indexes:
				try:
					camera_name = cameras_info_windows.get_at(camera_index).name.replace('\n', '')
				except Exception:
					camera_name = "N/A"
				cameras.append({"camera_index": camera_index, "camera_name": camera_name})
		if platform_name == 'Linux':
			for camera_index in camera_indexes:
				try:
					camera_name = subprocess.run(['cat', '/sys/class/video4linux/video{}/name'.format(camera_index)], stdout=subprocess.PIPE).stdout.decode('utf-8')
					camera_name = camera_name.replace('\n', '')
				except Exception:
					camera_name = "N/A"
				cameras.append({"camera_index": camera_index, "camera_name": camera_name})
	global active_cameras
	active_cameras = cameras
	socketio.emit('get_available_video_ports_and_camera_names', {'status': cameras})

def serial_ports():
	""" serial_ports Lists serial port names that are currently active on the computer
	"""
	ports = serial.tools.list_ports.comports()
	arr = []
	for p in ports:
		arr.append(p.device)
	return arr

def send_active_video_and_com_port():
	socketio.emit("get_active_video_and_com_port", {'camera': camera.VideoSrc, 'port': camera.Connection._output_string if camera.Connection is not None else None, "camera_name": camera.CameraName})

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


async def get_camera_information_for_windows():
	VIDEO_DEVICES = 4
	return await windows_devices.DeviceInformation.find_all_async(VIDEO_DEVICES)

if __name__ == "__main__":
	print('[INFO] Starting server at http://localhost:4001')
	socketio.run(app=app, host='0.0.0.0', port=4001)
