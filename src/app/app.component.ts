import { Component, ElementRef, HostListener, Injectable, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Socket } from 'ngx-socket-io';
import * as io from 'socket.io-client';
import { Options, ChangeContext } from '@angular-slider/ngx-slider';
import { JoystickEvent, NgxJoystickComponent } from 'ngx-joystick';
import { JoystickManagerOptions, JoystickOutputData } from 'nipplejs';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
@Injectable({
	providedIn: 'root'
  })

export class AppComponent {
    value: number = 0;
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
        this.socket.on("zoom", (message) => {
			this.addToDebugArea(message)
        })
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
    sub: Subscription; 

    onStartStatic(event: JoystickEvent) {
        /* the interval time can be changed depending on whether the joystick is too sensitive or not responsive enough */
        this.sub = interval(100).subscribe((val) => { this.sendDirectionStatic() });
    }
    
   sendDirectionStatic() {
        let angle = this.staticOutputData.angle.degree
        let s = 22.5;
        let a = 45;
        if (angle >= s && angle < s + a) {
            this.directionStatic = "upright";
        } else if (angle >= s + a && angle < s + 2*a) {
            this.directionStatic = "up";
        } else if (angle >= s + 2*a && angle < s + 3*a) {
            this.directionStatic = "upleft";
        } else if (angle >= s + 3*a && angle < s + 4*a) {
            this.directionStatic = "left";
        } else if (angle >= s + 4*a && angle < s + 5*a) {
            this.directionStatic = "downleft";
        } else if (angle >= s + 5*a && angle < s + 6*a) {
            this.directionStatic = "down";
        } else if (angle >= s + 6*a && angle < s + 7*a) {
            this.directionStatic = "downright";
        } else{
            this.directionStatic = "right";
        }

        this.socket.emit('change_state',{'direction': 'this.directionStatic' }); /* uncomment for testing with the camera */
        //console.log(this.directionStatic); /* this is for debugging and can be deleted */
   }

    onEndStatic(event: JoystickEvent) {
        if (this.sub != null) { this.sub.unsubscribe(); } 

        this.socket.emit('change_state',{'direction': 'stop' }); /* uncomment for testing with the camera */
        //console.log("stop"); /* this is for debugging and can be deleted */
    }

    onMoveStatic(event: JoystickEvent) {
        this.staticOutputData = event.data;
    }

    zoomValueChange(changeContext: ChangeContext)  {
        console.log(changeContext)
        this.socket.emit('zoom', {'amount' : changeContext});
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
