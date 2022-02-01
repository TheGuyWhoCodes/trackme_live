import { Component, HostListener, Injectable } from '@angular/core';
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
  constructor(private socket: Socket) {}
  ngOnInit() {
	this.socket = io.connect("http://localhost:4001")
	this.socket.on("connect", () => {
		console.log("Successfully connected!")
	})
	// this.socket.on("get_active_com_devices", (message) => {
	// 	console.log("Hello we got one!", message)
	// })
	// this.socket.on("get_available_video_ports", (message) => {
	// 	console.log("Hello we got one!", message)
	// })
	this.socket.on("set_active_com_port", (message) => {
		console.log("Hello we got one!", message)
	})
  }
  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
	// this.socket.emit("get_active_com_devices")
	// this.socket.emit("get_available_video_ports")

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
	this.socket.emit("create_camera", {"camera": '0', "port":"COM5"})
  }

  setActiveCOMPort() {
	this.socket.emit("set_active_com_port", {"port":"COM100"})
  }
}
