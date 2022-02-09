# A VISCA camera connection shall come in two "parts"
# a camera shall need:
# 1. A VISCA Connection. This is done through serial connection.
# 		creating a VISCA connection will allow the user to actually control
#		the camera
# 2. The camera feed. This is done through USB. Creating a camera feed
#		shall allow us to actually see what the camera is seeing. 
#
# Combining these two things creates a "VISCACamera object". A VISCA Camera
# object can be easily extended to allow multiple cameras at once in the
# future.
from imutils.video import VideoStream
from visca import camera

class VISCACamera:
	def __init__(self):
		# Video stream
		# Temp Debug Mode: Init with webcam 0
		# self.Video	= None
		# Connection stream
		self.Connection = None
		self.VideoSrc = None
		self.Video = None
	def init_camera(self, video, connection):
		""" init_camera will initalize BOTH the camera feed and serial feed

			video: The port of the camera that we will be using
			connection: The connection name of the serial port we will use
					examples of this include COM3 or /dev/ttyl3
		"""
		# Init Camera object (Default COM4). This probably won't connect
		# and most likely we will need to not initalize it until we see what the user
		# chooses, but for right now this is it. Maybe if we add more cameras, we
		# could add some way to track multiple camera d100 objects ie: hashmap list of
		# the new VISCACamera object? idk spitballing
		try:
			self.Connection = camera.D100(output=connection)
			self.Connection.init()
			self.Connection.home()

			self.Video = VideoStream(src=int(video)).start()
			self.VideoSrc = video
		except Exception as err:
			self.Connection = None
			self.Video = None
			self.VideoSrc = None
			raise Exception(err)
		
	def stop_camera_instance(self):
		""" stop_camera_instance stops the serial connection and also camera connection
			to free up for use later.
		"""
		if not self.Connection.close(self.Connection._output):
			raise Exception("Unable to stop serial interface with VISCA")
		self.Video.stop()
		self.Connection = None
		self.Video = None
		self.VideoSrc = None
	
	def update_com_port(self, port):
		print(self.Connection._output_string)
		print("status:", self.Connection.close(self.Connection._output))
		try:
			self.Connection = camera.D100(output=port)
			self.Connection.init()
			self.Connection.home()
		except Exception as err:
			self.Connection = None
			raise Exception(err)

	def update_camera(self, port):
		if self.Video != None:
			self.Video.stop()
		self.Video = VideoStream(src=port).start()
		self.VideoSrc = port