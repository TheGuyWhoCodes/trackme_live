import { Component, ElementRef, HostListener, Injectable, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {CameraService} from './camera.service';

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
	debugMode = false
	availableCom = []
	availableVideo = []
	connected = false
	@ViewChild('debugArea') debugArea: ElementRef;
	constructor(private modalService: NgbModal, private camera: CameraService) {}
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
        this.availableVideo = JSON.parse(data.value['status']);
        this.addToDebugArea(data.value);
      }
      if(data.name == 'updateCameraStatus')
      {
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

	connectToCamera() {
		this.camera.sendData("create_camera", {"camera": '0', "port":"COM6"})
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
		// TODO: Message needs to be standardized into some POJO
		console.log("Updating Camera Status to: ", message['port'], message['camera'])
		this.comPort = message['port']
		this.cameraPort = message['camera']
	}

	public destroyCamera() {
		this.camera.send("destroy_camera")
		this.cameraPort = null
		this.comPort = null
	}

	public refreshSerial() {
		this.camera.send("get_available_com_devices")
	}

	public refreshVideoPorts() {
		this.camera.send("get_available_video_ports")
	}

	public sendCameraHome() {
		this.camera.sendData('change_state',{'direction':'home'})
	}

	public resetCameraConnection() {
		this.camera.send("refresh_active_com_port")
	}
	public addToDebugArea(message: string) {
		if (this.debugArea != undefined) {
			this.debugArea.nativeElement.value += JSON.stringify(message) + "\n"
		}
	}
}
