import { Component, ElementRef, HostListener, Injectable, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {CameraService} from './camera.service';
import { Socket } from 'ngx-socket-io';
import { cpuUsage } from 'process';
import * as io from 'socket.io-client';
import { JoystickEvent } from 'ngx-joystick';
import { JoystickManagerOptions, JoystickOutputData } from 'nipplejs';

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
	error_message = ''
	alert_type='danger'
	camera_error = false
	availableCom = undefined
	availableVideoAndCameras = undefined
	connected = false

	cameraSelectForm = this.formBuilder.group({
		camera:'',
		com:''
	});


	staticOptions: JoystickManagerOptions = {
		mode: 'static',
		position: { left: '50%', top: '50%' },
		color: 'blue',
	  };
	

	@ViewChild('debugArea') debugArea: ElementRef;
	constructor(private modalService: NgbModal, private camera: CameraService, private formBuilder: FormBuilder) {}

	ngOnInit() {
    this.camera.messages.subscribe(data => {
      if(data.name == 'connected')
      {
        this.connected = data.value;
      }

      if(data.name == 'availableCom')
      {
        this.availableCom = data.value['status'];
        this.addToDebugArea(data.value);
      }

      if(data.name == 'availableVideo')
      {
        this.availableVideoAndCameras = data.value['status'];
        this.addToDebugArea(data.value);
      }

      if(data.name == 'updateCameraStatus')
      {
        if(data.value['error'] != undefined) {
				this.error_message = data.value['error']
				this.camera_error = true
			} else {
				this.camera_error = false
				this.modalService.dismissAll()
			}
        this.updateCameraStatus(data.value);
        this.addToDebugArea(data.value);
      }

      if(data.name == 'debug')
      {
        this.addToDebugArea(data.value);
      }
    })

  	}

	@HostListener('document:keypress', ['$event'])
	handleKeyboardEvent(event: KeyboardEvent) {
		this.key = event.key;
		if(event.key == "w") {
      this.camera.direction('up');
		} else if(event.key == "a") {
			this.camera.direction('left')
		} else if(event.key == "s") {
			this.camera.direction('down')
		} else if(event.key == "d") {
			this.camera.direction('right')
		} else if (event.key == " ") {
			this.camera.direction('stop')
		} else {
			console.log(event.key)
		}
	}

	@HostListener('document:keyup', ['$event'])
	handleStopCommand(event: KeyboardEvent) {
		this.camera.direction('stop')
	}

	handleButtonEvent(event: any) {
		this.camera.direction(event)
	}

	handleZoomEvent(event: any) {
		this.camera.zoom(event)
	}

	close_alert() {
		this.camera_error = false
	}

	onMoveStatic(event: JoystickEvent) {
		if(event.data.distance > 10) {
			console.log(event.data.direction.angle, event.data.angle.degree )
			if((event.data.direction.angle == "down" || event.data.direction.angle == "left") && event.data.angle.degree > 200 && event.data.angle.degree < 240) {
				this.camera.direction('downleft')
			} else if((event.data.direction.angle == "up" || event.data.direction.angle == "left") && event.data.angle.degree > 110 && event.data.angle.degree < 150) {
				this.camera.direction('upleft')
			} else if((event.data.direction.angle == "up" || event.data.direction.angle == "right") && event.data.angle.degree > 20 && event.data.angle.degree < 70) {
				this.camera.direction('upright')
			} else if((event.data.direction.angle == "down" || event.data.direction.angle == "right") && event.data.angle.degree > 300 && event.data.angle.degree < 340) {
				this.camera.direction('downright')
			}
			else if(event.data.direction.angle == "down") {
				this.camera.direction('down')
			} else if(event.data.direction.angle == "up") {
				this.camera.direction('up')
			} else if(event.data.direction.angle == "left") {
				this.camera.direction('left')
			} else if(event.data.direction.angle == "right") {
				this.camera.direction('right')
			}
		} else {
			this.camera.direction('stop')		
		}
	}

	onEndStatic(event: JoystickEvent) {
		this.camera.direction('stop')		
	}


	connectToCamera() : void  {
		console.log("Connecting to camera using: ", this.cameraSelectForm.value)
		let currCamera =  this.cameraSelectForm.value.camera
		// TODO: This needs to be cleaned once someone implements POJOs for the responses
		for(let cameras of this.availableVideoAndCameras) {
			if(cameras.camera_name == currCamera) {
				currCamera = cameras.camera_index
			}
		}
		this.camera.sendData("create_camera", {"camera": currCamera, "port":this.cameraSelectForm.value.com})

	}

	setActiveCOMPort() {
		this.camera.sendData("set_active_com_port", {"port":"COM100"})
  	}

	open(content) {
		this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'})
	}

	public toggleDebugMode(value:boolean){
    	this.debugMode = value;
	}

	public updateCameraStatus(message) {
		this.comPort = message['port']
		this.cameraPort = message['camera']
		this.cameraName = message['camera_name']
	}

	public destroyCamera() {

		this.camera.sendSingleData("destroy_camera")
		this.refreshSerial()
		this.refreshVideoPorts()
		this.cameraPort = null
		this.comPort = null
		this.cameraName = null
	}

	public refreshSerial() {
		this.camera.sendSingleData("get_available_com_devices")
	}

	public refreshVideoPorts() {
		this.camera.sendSingleData("get_available_video_ports_and_camera_names")
	}

	public sendCameraHome() {
		this.camera.sendData('change_state',{'direction':'home'})
	}

	public resetCameraConnection() {
		this.camera.send("refresh_active_com_port")
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
