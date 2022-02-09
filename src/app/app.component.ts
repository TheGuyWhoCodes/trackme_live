import { Component, HostListener, Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import * as io from 'socket.io-client';
import { create as nipplejsCreate } from 'nipplejs';


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
    let options = {
        zone: document.getElementById('zone_joystick'),
        color: "blue",
        mode: "static" as "dynamic" | "semi" | "static",
        position: {left: "50%", bottom: "50%" }
    }
    let manager = nipplejsCreate(options);
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
	}else {
		console.log(event.key)
	}
  }

  @HostListener('document:keyup', ['$event'])
  handleStopCommand(event: KeyboardEvent) {
		this.socket.emit('change_state',{'direction':'stop'})			  
  }
}
