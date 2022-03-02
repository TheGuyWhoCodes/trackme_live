import { Component, OnInit, ElementRef, HostListener, Injectable, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Socket } from 'ngx-socket-io';
import * as io from 'socket.io-client';
import { Options } from '@angular-slider/ngx-slider';
import { JoystickEvent, NgxJoystickComponent } from 'ngx-joystick';
import { JoystickManagerOptions, JoystickOutputData } from 'nipplejs';
import { interval } from 'rxjs';

// import { create as nipplejsCreate } from 'nipplejs';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
@Injectable({
	providedIn: 'root'
  })

export class AppComponent {
    value: number = 100;
    options: Options = {
        floor: 0,
        ceil: 100 
    };
	title = 'trackme-webui';
	key = ""
	comPort = null
	cameraPort = null
	debugMode = false
	availableCom = []
	availableVideo = []
	connected = false
    sub = null
	@ViewChild('debugArea') debugArea: ElementRef;
	constructor(private socket: Socket, private modalService: NgbModal) {}
	ngOnInit() {
		this.socket = io.connect("http://localhost:4001")
		this.socket.on("connect", () => {
			console.log("Successfully connected!")
			this.socket.emit("get_available_com_devices")
			this.socket.emit("get_available_video_ports")
			this.socket.emit("get_active_video_and_com_port")
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
		this.socket.on("get_available_video_ports", (message) => {
			this.addToDebugArea(message)
			this.availableVideo = JSON.parse(message['status'])
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
        /* document.addEventListener('DOMContentLoaded', function() {
            let options = {
                zone: document.getElementById('zone_joystick'),
                color: "blue",
                mode: "static" as "dynamic" | "semi" | "static",
                position: {left: "50%", bottom: "50%" }
            }
            let manager = nipplejsCreate(options);
        }) */
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

	handleButtonEvent(event: any) {
		this.socket.emit('change_state',{'direction':event})
	}

	connectToCamera() {
		this.socket.emit("create_camera", {"camera": '0', "port":"COM6"})
	}

	setActiveCOMPort() {
		this.socket.emit("set_active_com_port", {"port":"COM100"})
  	}

	open(content) {
		this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'})
	}

    @ViewChild('staticJoystick') staticJoystick: NgxJoystickComponent;

    staticOptions: JoystickManagerOptions = {
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'blue',
    };

    staticOutputData: JoystickOutputData;
    directionStatic: string;

    onStartStatic(event: JoystickEvent) {
        this.sub = interval(100)
        .subscribe((val) => { this.sendDirectionStatic() });
    }
    
   sendDirectionStatic() {
        let angle = this.staticOutputData.angle.degree
        if (angle >= 45 && angle < 135) {
            this.directionStatic = "up";
        } else if (angle >= 135 && angle < 225) {
            this.directionStatic = "left";
        } else if (angle >= 225 && angle < 315) {
            this.directionStatic = "down";
        } else{
            this.directionStatic = "right";
        }
        this.socket.emit('change_state',{'direction': 'this.directionStatic' });
        //console.log(this.directionStatic);
   }

    onEndStatic(event: JoystickEvent) {
        this.sub.unsubscribe();
        this.socket.emit('change_state',{'direction': 'stop' });
        //console.log("stop");
    }

    onMoveStatic(event: JoystickEvent) {
        this.staticOutputData = event.data;
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
		this.socket.emit("destroy_camera")
		this.cameraPort = null
		this.comPort = null
	}

	public refreshSerial() {
		this.socket.emit("get_available_com_devices")
	}
	
	public refreshVideoPorts() {
		this.socket.emit("get_available_video_ports")
	}

	public sendCameraHome() {
		this.socket.emit('change_state',{'direction':'home'})		
	}

	public resetCameraConnection() {
		this.socket.emit("refresh_active_com_port")
	}
	public addToDebugArea(message: string) {
		if (this.debugArea != undefined) {
			this.debugArea.nativeElement.value += JSON.stringify(message) + "\n"
		}
	}
}
