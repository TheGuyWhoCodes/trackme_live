import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs/Rx';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket;

  constructor() { }

  connect(): Rx.Subject<MessageEvent> {
    this.socket = io.connect("http://localhost:4001");

    let observable = new Observable(observer => {
      //this is where responses from the server go
      this.socket.on("connect", () => {
        console.log("Successfully connected!")
        this.socket.emit("get_available_com_devices")
        this.socket.emit("get_available_video_ports")
        this.socket.emit("get_active_video_and_com_port")
        observer.next({name:'connected', value:true})
      })
      this.socket.on("disconnect", () => {
        console.log("Disconnected from service!")
        observer.next({name:'connected', value:false})
      })
      this.socket.on("get_available_com_devices", (message) => {
        observer.next({name:'availableCom', value: message})
      })
      this.socket.on("get_available_video_ports_and_camera_names", (message) => {
        observer.next({name:'availableVideo', value: message})
      })

      this.socket.on("change_state", (message) => {
        observer.next({name:'debug', value: message})
      })

      this.socket.on("create_camera", (message) => {
        observer.next({name:'updateCameraStatus', value: message})
      })

      this.socket.on("set_active_com_port", (message) => {
        observer.next({name:'debug', value: message})
      })
      this.socket.on("get_active_video_and_com_port", (message) => {
        observer.next({name:'updateCameraStatus', value: message})
      })
    });

    let observer = {
      //next function acts as the send to the server
      next: (data: any) => {
        this.socket.emit(data.part1, data.part2);
      },
    };

    return Rx.Subject.create(observer, observable);
  }
}
