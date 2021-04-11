from flask_socketio import SocketIO
from flask import Flask, render_template, request
import cv2
import base64
from visca import camera

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')
socketio = SocketIO(app)
cam = camera.D100(output='/dev/ttyUSB0')
cam.init()
cam.home()

@app.route('/')
def index():
    """Home page."""
    return render_template('index.html')

@socketio.on('connect', namespace='/web')
def connect_web():
    print('[INFO] Web client connected: {}'.format(request.sid))

@socketio.on('test', namespace='/web')
def test():
    print('[INFO] Web client {} said TEST'.format(request.sid))

@socketio.on('disconnect', namespace='/web')
def disconnect_web():
    print('[INFO] Web client disconnected: {}'.format(request.sid))

def _convert_image_to_jpeg(image):
    # Encode frame as jpeg
    frame = cv2.imencode('.jpg', image)[1].tobytes()
    # Encode frame in base64 representation and remove
    # utf-8 encoding
    frame = base64.b64encode(frame).decode('utf-8')
    return "data:image/jpeg;base64,{}".format(frame)

@socketio.on('begin_video', namespace='/web')
def handle_cv_message():
    print('[INFO] Web client {}: Command = begin_video'.format(request.sid))
    socketio.emit('server2web',{
        'image':_convert_image_to_jpeg(cv2.imread('./index.jpeg')),
        'text':'Command = begin_video'
        }, namespace='/web')

@socketio.on('change_state', namespace='/web')
def handle_state(message):
    print('[INFO] Web client {}: Command = change_state => {}'.format(request.sid, message))
    socketio.emit('server2web',{
        'text':'Command = change_state => {}'.format(message)
        }, namespace='/web')

#def new_frame():


if __name__ == "__main__":
    print('[INFO] Starting server at http://localhost:4001')
    socketio.run(app=app, host='0.0.0.0', port=4001)
