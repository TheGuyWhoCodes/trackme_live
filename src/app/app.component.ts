import { Component, ElementRef, HostListener, Injectable, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Socket } from 'ngx-socket-io';
import * as io from 'socket.io-client';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
@Injectable({
	providedIn: 'root'
  })

export class AppComponent {
	title = 'trackme-webui';
	key = ""
	comPort = null
	cameraPort = null
	cameraName = null
	debugMode = false
	availableCom = []
	availableVideoAndCameras = []
	connected = false
	@ViewChild('debugArea') debugArea: ElementRef;
	constructor(private socket: Socket, private modalService: NgbModal) {}
	ngOnInit() {
		this.socket = io.connect("http://localhost:4001")
		this.socket.on("connect", () => {
			console.log("Successfully connected!")
			this.connected = true
		})
		this.socket.on("disconnect", () => {
			console.log("Disconnected from service!")		
			this.connected = false	
		})
		this.socket.on("get_available_com_devices", (message) => {
			this.availableCom = message['status']
			this.addToDebugArea(message)
		})
		this.socket.on("get_available_video_ports_and_camera_names", (message) => {
			this.addToDebugArea(message)
			this.availableVideoAndCameras = message['status']
		})

		this.socket.on("change_state", (message) => {
			this.addToDebugArea(message)
		})
		
		this.socket.on("create_camera", (message) => {
			this.updateCameraStatus(message)
			this.addToDebugArea(message)
		})

		this.socket.on("set_active_com_port", (message) => {
			this.addToDebugArea(message)
		})
		this.socket.on("get_active_video_and_com_port", (message) => {
			this.updateCameraStatus(message)
			this.addToDebugArea(message)
		})
		// Grab any active devices
		this.socket.emit("get_available_com_devices")
		this.socket.emit("get_available_video_ports_and_camera_names")
		this.socket.emit("get_active_video_and_com_port")
  	}

	@HostListener('document:keypress', ['$event'])
	handleKeyboardEvent(event: KeyboardEvent) {
		this.key = event.key;
		if(event.key == "w") {
			this.socket.emit('change_state',{'direction':'up'})
		} else if(event.key == "a") {
			this.socket.emit('change_state',{'direction':'left'})
		} else if(event.key == "s") {
			this.socket.emit('change_state',{'direction':'down'})
		} else if(event.key == "d") {
			this.socket.emit('change_state',{'direction':'right'})
		} else if (event.key == " ") {
			this.socket.emit('change_state',{'direction':'stop'})		
		} else {
			console.log(event.key)
		}
	}

	@HostListener('document:keyup', ['$event'])
	handleStopCommand(event: KeyboardEvent) {
		this.socket.emit('change_state',{'direction':'stop'})			  
	}

	connectToCamera() {
		this.socket.emit("create_camera", {"camera": '0', "port":"COM3"})
	}

	setActiveCOMPort() {
		this.socket.emit("set_active_com_port", {"port":"COM100"})
  	}

	open(content) {
		this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'})
	}

	public toggleDebugMode(value:boolean){
    	this.debugMode = value;
	}
	
	public updateCameraStatus(message) {
		// TODO: Message needs to be standardized into some POJO
		if (message['camera'] != null) {
			console.log("Updating Camera Status to: ", message['port'], this.availableVideoAndCameras[parseInt(message['camera'])].camera_name)
			this.cameraName = this.availableVideoAndCameras[parseInt(message['camera'])].camera_name
		}
		else {
			console.log("Updating Camera Status to: ", message['port'], message['camera'])
		}
		this.comPort = message['port']
		this.cameraPort = message['camera']
	}

	public destroyCamera() {
		this.socket.emit("destroy_camera")
		this.cameraPort = null
		this.comPort = null
		this.cameraName = null
	}

	public refreshSerial() {
		this.socket.emit("get_available_com_devices")
	}
	
	public refreshVideoPorts() {
		this.socket.emit("get_available_video_ports_and_camera_names")
	}

	public resetCameraConnection() {
		this.socket.emit("refresh_active_com_port")
	}
	public addToDebugArea(message: string) {
		if (message["camera"] != null) {
			message["camera"] = this.cameraName
		}
		if (this.debugArea != undefined) {
			this.debugArea.nativeElement.value += JSON.stringify(message) + "\n"
		}
	}
}
